import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { logActivity, formatFileSize, formatRelativeTime } from '@/lib/utils';
import { LoadingState, EmptyState, StatusBadge, Breadcrumbs, SeverityBadge, ConfidenceBadge } from '@/components/ui/Primitives';
import { Modal } from '@/components/ui/Modal';
import type { Contract, ContractTerm, ContractFinding, ContractPage } from '@/types';
import { TERM_LABELS } from '@/types';
import { Upload, FileText, Loader2, Check, Edit, Eye, AlertTriangle, X, ChevronDown } from 'lucide-react';

export function ClientContracts() {
  const { clientId } = useParams();
  const { organization } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [terms, setTerms] = useState<ContractTerm[]>([]);
  const [findings, setFindings] = useState<ContractFinding[]>([]);
  const [pages, setPages] = useState<ContractPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingTerm, setEditingTerm] = useState<ContractTerm | null>(null);
  const [editValue, setEditValue] = useState('');
  const [viewingPage, setViewingPage] = useState<ContractPage | null>(null);
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!clientId || !organization) return;
    const [contractsRes] = await Promise.all([
      supabase.from('contracts').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
    ]);
    const contractList = (contractsRes.data as Contract[]) || [];
    setContracts(contractList);
    if (contractList.length > 0) {
      const latest = contractList[0];
      const [termsRes, findingsRes, pagesRes] = await Promise.all([
        supabase.from('contract_terms').select('*').eq('contract_id', latest.id),
        supabase.from('contract_findings').select('*').eq('contract_id', latest.id).order('severity', { ascending: false }),
        supabase.from('contract_pages').select('*').eq('contract_id', latest.id).order('page_number', { ascending: true }),
      ]);
      setTerms((termsRes.data as ContractTerm[]) || []);
      setFindings((findingsRes.data as ContractFinding[]) || []);
      setPages((pagesRes.data as ContractPage[]) || []);
    }
    setLoading(false);
  }, [clientId, organization]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  const handleUpload = async (file: File) => {
    if (!clientId || !organization || !file) return;
    setFileUrl(URL.createObjectURL(file));
    setUploading(true);
    try {
      const fileId = crypto.randomUUID();
      const filePath = `${organization.id}/${clientId}/${fileId}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('contracts').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: contractData, error: insertError } = await supabase
        .from('contracts')
        .insert({
          client_id: clientId,
          organization_id: organization.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          status: 'uploaded',
          processing_stage: 'uploaded',
        })
        .select()
        .single();
      if (insertError) throw insertError;
      await logActivity(organization.id, 'contract_uploaded', 'Contract uploaded', `${file.name} uploaded.`, { client_id: clientId, contract_id: contractData.id });
      showToast('Contract uploaded. Processing...', 'success');
      await processContract(contractData.id, file);
    } catch {
      showToast('Upload failed. Please try again.', 'error');
      setUploading(false);
    }
  };

  const processContract = async (contractId: string, file: File) => {
    try {
      await supabase.from('contracts').update({ status: 'processing', processing_stage: 'validating' }).eq('id', contractId);
      await logActivity(organization!.id, 'contract_processing', 'Contract processing', 'Validating file...', { contract_id: contractId }, {});
      await fetchData();

      const pageRecords: Omit<ContractPage, 'id' | 'created_at'>[] = [];
      let pageCount = 1;

      if (file.type === 'application/pdf' || file.name.match(/\.[pP][dD][fF]$/)) {
        const arrayBuffer = await file.arrayBuffer();
        const pdfjs = await import('pdfjs-dist');
        const pdfWorker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
        pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker.default;
  
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        pageCount = pdf.numPages;
  
        await supabase.from('contracts').update({ page_count: pageCount, processing_stage: 'reading' }).eq('id', contractId);
  
        for (let i = 1; i <= pageCount; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const text = textContent.items.map((item: unknown) => {
            const str = (item as { str?: string }).str;
            return str || '';
          }).join(' ');
          const charCount = text.length;
          const method = charCount > 50 ? 'native' : 'empty';
          pageRecords.push({
            contract_id: contractId,
            page_number: i,
            extraction_status: charCount > 50 ? 'complete' : 'empty',
            extraction_method: method,
            text_content: text,
            char_count: charCount,
            error_message: '',
          });
        }
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.match(/\.docx$/i)) {
        await supabase.from('contracts').update({ page_count: 1, processing_stage: 'reading' }).eq('id', contractId);
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        const text = result.value;
        const charCount = text.length;
        pageRecords.push({
          contract_id: contractId,
          page_number: 1,
          extraction_status: charCount > 50 ? 'complete' : 'empty',
          extraction_method: 'mammoth',
          text_content: text,
          char_count: charCount,
          error_message: '',
        });
      } else if (file.type.startsWith('image/') || file.name.match(/\.(png|jpe?g)$/i)) {
        await supabase.from('contracts').update({ page_count: 1, processing_stage: 'reading' }).eq('id', contractId);
        const Tesseract = (await import('tesseract.js')).default;
        const result = await Tesseract.recognize(file, 'eng');
        const text = result.data.text;
        const charCount = text.length;
        pageRecords.push({
          contract_id: contractId,
          page_number: 1,
          extraction_status: charCount > 50 ? 'complete' : 'empty',
          extraction_method: 'tesseract',
          text_content: text,
          char_count: charCount,
          error_message: '',
        });
      } else {
        throw new Error('Unsupported file type');
      }

      await supabase.from('contract_pages').insert(pageRecords);
      await supabase.from('contracts').update({ processing_stage: 'analyzing', status: 'analyzing' }).eq('id', contractId);
      await fetchData();

      const allText = pageRecords.map((p) => p.text_content).join('\n\n');
      const chunkSize = 4000;
      const chunks: { chunk_index: number; page_start: number; page_end: number; section: string; text: string }[] = [];
      let chunkIndex = 0;
      let currentText = '';
      let pageStart = 1;
      for (let i = 0; i < pageRecords.length; i++) {
        currentText += pageRecords[i].text_content + '\n\n';
        if (currentText.length >= chunkSize || i === pageRecords.length - 1) {
          chunks.push({
            chunk_index: chunkIndex++,
            page_start: pageStart,
            page_end: i + 1,
            section: '',
            text: currentText.trim(),
          });
          currentText = '';
          pageStart = i + 2;
        }
      }
      await supabase.from('contract_chunks').insert(chunks.map((c) => ({ ...c, contract_id: contractId })));

      // Call edge function for AI analysis
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-contract`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contractId, organizationId: organization!.id, text: allText.slice(0, 12000), pageCount }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Analysis failed (${response.status})`);
      }

      const result = await response.json();

      // Save terms
      if (result.terms && Array.isArray(result.terms)) {
        const termRecords = result.terms.map((t: { key: string; value: string; status: string; confidence: string; source_page?: number; source_section?: string; source_text?: string }) => ({
          contract_id: contractId,
          term_key: t.key,
          term_value: t.value || '',
          status: t.status || 'found',
          confidence: t.confidence || 'medium',
          source_page: t.source_page || null,
          source_section: t.source_section || '',
          source_text: t.source_text || '',
          confirmed: false,
        }));
        await supabase.from('contract_terms').insert(termRecords);
      }

      // Save findings
      if (result.findings && Array.isArray(result.findings)) {
        const findingRecords = result.findings.map((f: { title: string; category: string; severity: string; description: string; source_page?: number; source_section?: string; source_text?: string; confidence?: string }) => ({
          contract_id: contractId,
          title: f.title,
          category: f.category || 'other',
          severity: f.severity || 'medium',
          description: f.description || '',
          source_page: f.source_page || null,
          source_section: f.source_section || '',
          source_text: f.source_text || '',
          confidence: f.confidence || 'medium',
          dismissed: false,
        }));
        await supabase.from('contract_findings').insert(findingRecords);
      }

      await supabase.from('contracts').update({ status: 'complete', processing_stage: 'complete' }).eq('id', contractId);
      await logActivity(organization!.id, 'contract_analyzed', 'Contract analyzed', `${pageCount} pages processed. Terms and findings extracted.`, { client_id: clientId!, contract_id: contractId });
      showToast('Contract analysis complete.', 'success');
      setUploading(false);
      await fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Processing failed';
      await supabase.from('contracts').update({ status: 'failed', error_message: message, processing_stage: 'failed' }).eq('id', contractId);
      showToast('Contract analysis failed. ' + message, 'error');
      setUploading(false);
      await fetchData();
    }
  };

  const confirmTerm = async (term: ContractTerm) => {
    await supabase.from('contract_terms').update({ confirmed: true }).eq('id', term.id);
    showToast('Term confirmed.', 'success');
    await fetchData();
  };

  const saveEditTerm = async () => {
    if (!editingTerm) return;
    await supabase.from('contract_terms').update({ edited_value: editValue, confirmed: true, status: 'found' }).eq('id', editingTerm.id);
    showToast('Term updated.', 'success');
    setEditingTerm(null);
    await fetchData();
  };

  const dismissFinding = async (id: string) => {
    await supabase.from('contract_findings').update({ dismissed: true }).eq('id', id);
    showToast('Finding dismissed.', 'success');
    await fetchData();
  };

  const toggleFinding = (id: string) => {
    setExpandedFindings((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (loading) return <LoadingState message="Loading contracts..." />;

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Contracts' }]} />
      <h1 className="font-display text-2xl font-semibold text-cadence-text mb-6">Contracts</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Side: Document Preview */}
        <div>
          {fileUrl ? (
            <object data={fileUrl} className="w-full h-[800px] rounded-xl border border-cadence-border" />
          ) : (
            <div className="w-full h-[800px] rounded-xl border border-cadence-border bg-cadence-surface flex items-center justify-center text-cadence-muted">
              No document selected
            </div>
          )}
        </div>

        {/* Right Side: Verification Forms and Upload */}
        <div>
          {/* Upload area */}
          <div
        className="border-2 border-dashed border-cadence-border rounded-xl p-8 text-center mb-6 hover:border-cadence-accent transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={(e) => { 
          e.preventDefault(); 
          const file = e.dataTransfer.files[0]; 
          if (file && (['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg', 'image/jpg'].includes(file.type) || file.name.match(/\.(pdf|docx|png|jpe?g)$/i))) {
            handleUpload(file);
          }
        }}
      >
        <input 
          ref={fileInputRef} 
          type="file" 
          accept=".pdf,.docx,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg" 
          className="hidden" 
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} 
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-cadence-accent animate-spin" />
            <p className="text-sm text-cadence-secondary">Processing contract...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cadence-accentSoft flex items-center justify-center">
              <Upload className="w-6 h-6 text-cadence-accent" />
            </div>
            <p className="text-sm text-cadence-text font-medium">Drop the contract file here, or click to browse.</p>
            <p className="text-xs text-cadence-muted">PDF, DOCX, PNG, JPG. Multi-page supported.</p>
          </div>
        )}
      </div>

      {/* Contract list */}
      {contracts.length === 0 ? (
        <EmptyState icon={<FileText className="w-6 h-6" />} title="No contracts yet" description="Upload a signed contract and Cadence will extract the terms that matter." />
      ) : (
        <div className="space-y-6">
          {contracts.map((contract) => (
            <div key={contract.id} className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-cadence-muted" />
                  <div>
                    <p className="text-sm font-medium text-cadence-text">{contract.file_name}</p>
                    <p className="text-xs text-cadence-muted">{formatFileSize(contract.file_size)} · {contract.page_count} pages · {formatRelativeTime(contract.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={contract.status} />
                  {contract.processing_stage && contract.status !== 'complete' && contract.status !== 'failed' && (
                    <span className="text-xs font-mono text-cadence-muted">{contract.processing_stage}</span>
                  )}
                </div>
              </div>

              {contract.status === 'failed' && (
                <div className="rounded-lg bg-cadence-dangerSoft p-3 mb-4">
                  <p className="text-sm text-cadence-danger">{contract.error_message || 'Analysis failed.'}</p>
                </div>
              )}

              {/* Processing center */}
              {contract.status === 'processing' || contract.status === 'analyzing' ? (
                <div className="rounded-lg bg-cadence-surface2 p-4 space-y-2">
                  <p className="text-xs font-mono text-cadence-muted mb-2">PROCESSING</p>
                  {[
                    { label: 'Uploaded', done: true },
                    { label: `${contract.page_count} pages detected`, done: contract.page_count > 0 },
                    { label: 'Text extracted', done: pages.some((p) => p.extraction_status === 'complete') },
                    { label: 'Analyzing', done: false, active: contract.processing_stage === 'analyzing' },
                    { label: 'Saving findings', done: false },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {step.done ? <Check className="w-4 h-4 text-cadence-success" /> : step.active ? <Loader2 className="w-4 h-4 text-cadence-accent animate-spin" /> : <div className="w-4 h-4 rounded-full border border-cadence-border" />}
                      <span className={step.done ? 'text-cadence-text' : 'text-cadence-muted'}>{step.label}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Terms */}
              {contract.status === 'complete' && terms.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-cadence-muted mb-3">Extracted terms</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {terms.map((term) => (
                      <div key={term.id} className="rounded-lg border border-cadence-border p-3">
                        <div className="flex items-start justify-between mb-1">
                          <span className="text-xs text-cadence-muted">{TERM_LABELS[term.term_key] || term.term_key}</span>
                          <div className="flex items-center gap-1.5">
                            <StatusBadge status={term.status} />
                            {term.confidence === 'low' && <ConfidenceBadge confidence="low" />}
                          </div>
                        </div>
                        <p className="text-sm font-medium text-cadence-text font-mono">{term.edited_value || term.term_value || '—'}</p>
                        {term.source_page && (
                          <button onClick={() => setViewingPage(pages.find((p) => p.page_number === term.source_page) || null)} className="text-xs text-cadence-accent hover:underline mt-1.5 flex items-center gap-1">
                            <Eye className="w-3 h-3" /> Page {term.source_page}{term.source_section ? ` · ${term.source_section}` : ''}
                          </button>
                        )}
                        <div className="flex gap-2 mt-2">
                          {term.confirmed ? (
                            <span className="text-xs text-cadence-success flex items-center gap-1"><Check className="w-3 h-3" /> Confirmed</span>
                          ) : (
                            <>
                              <button onClick={() => confirmTerm(term)} className="text-xs text-cadence-accent hover:underline">Confirm</button>
                              <button onClick={() => { setEditingTerm(term); setEditValue(term.edited_value || term.term_value); }} className="text-xs text-cadence-secondary hover:underline flex items-center gap-1"><Edit className="w-3 h-3" /> Edit</button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Findings */}
              {contract.status === 'complete' && findings.filter((f) => !f.dismissed).length > 0 && (
                <div className="mt-6">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-cadence-muted mb-3">Worth a second look</h3>
                  <div className="space-y-2">
                    {findings.filter((f) => !f.dismissed).map((finding) => (
                      <div key={finding.id} className={`rounded-lg p-3 ${finding.severity === 'high' ? 'card-danger' : 'border border-cadence-border'}`}>
                        <button onClick={() => toggleFinding(finding.id)} className="w-full flex items-start justify-between gap-3 text-left">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-cadence-warning mt-0.5 shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-cadence-text">{finding.title}</p>
                              {!expandedFindings.has(finding.id) && <p className="text-xs text-cadence-muted mt-0.5 line-clamp-1">{finding.description}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <SeverityBadge severity={finding.severity} />
                            <ChevronDown className={`w-4 h-4 text-cadence-muted transition-transform ${expandedFindings.has(finding.id) ? 'rotate-180' : ''}`} />
                          </div>
                        </button>
                        {expandedFindings.has(finding.id) && (
                          <div className="mt-3 pl-6 animate-fade-in">
                            <p className="text-sm text-cadence-secondary leading-relaxed mb-2">{finding.description}</p>
                            {finding.source_text && (
                              <div className="rounded-lg bg-cadence-surface2 p-3 mb-2">
                                <p className="text-xs font-mono text-cadence-muted mb-1">SOURCE TEXT</p>
                                <p className="text-xs text-cadence-secondary italic">"{finding.source_text}"</p>
                              </div>
                            )}
                            <div className="flex items-center gap-3">
                              {finding.source_page && (
                                <button onClick={() => setViewingPage(pages.find((p) => p.page_number === finding.source_page) || null)} className="text-xs text-cadence-accent hover:underline flex items-center gap-1">
                                  <Eye className="w-3 h-3" /> Page {finding.source_page}{finding.source_section ? ` · ${finding.source_section}` : ''}
                                </button>
                              )}
                              <button onClick={() => dismissFinding(finding.id)} className="text-xs text-cadence-muted hover:text-cadence-danger flex items-center gap-1">
                                <X className="w-3 h-3" /> Dismiss
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {contract.status === 'complete' && (
                <div className="mt-4 pt-4 border-t border-cadence-border">
                  <p className="text-xs text-cadence-muted">Cadence gives information, not legal advice.</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
        </div>
      </div>

      {/* Edit term modal */}
      <Modal open={!!editingTerm} onClose={() => setEditingTerm(null)} title="Edit term">
        <div className="space-y-4">
          <div>
            <label className="label">{editingTerm && (TERM_LABELS[editingTerm.term_key] || editingTerm.term_key)}</label>
            <input className="input" value={editValue} onChange={(e) => setEditValue(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditingTerm(null)} className="btn-secondary">Cancel</button>
            <button onClick={saveEditTerm} className="btn-primary">Save</button>
          </div>
        </div>
      </Modal>

      {/* Page viewer modal */}
      <Modal open={!!viewingPage} onClose={() => setViewingPage(null)} title={viewingPage ? `Page ${viewingPage.page_number}` : ''} className="max-w-2xl">
        {viewingPage && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <StatusBadge status={viewingPage.extraction_status} />
              <span className="text-xs font-mono text-cadence-muted">{viewingPage.extraction_method} · {viewingPage.char_count} chars</span>
            </div>
            <div className="rounded-lg bg-cadence-surface2 p-4 max-h-96 overflow-y-auto scrollbar-thin">
              <pre className="text-xs text-cadence-secondary whitespace-pre-wrap font-mono leading-relaxed">{viewingPage.text_content || '(No text extracted from this page)'}</pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
