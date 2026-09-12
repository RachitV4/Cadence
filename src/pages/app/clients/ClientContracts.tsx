import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { logActivity, formatFileSize, formatRelativeTime } from '@/lib/utils';
import { LoadingState, EmptyState, StatusBadge, Breadcrumbs, SeverityBadge, ConfidenceBadge } from '@/components/ui/Primitives';
import { Modal } from '@/components/ui/Modal';
import { InteractiveDocumentVisualization } from '@/components/InteractiveDocumentVisualization';
import type { Contract, ContractTerm, ContractFinding, ContractPage } from '@/types';
import { TERM_LABELS } from '@/types';
import { Upload, FileText, Loader2, Check, Edit, Eye, AlertTriangle, X, ChevronDown, Search } from 'lucide-react';

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
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [activePage, setActivePage] = useState(1);
  const [sourceText, setSourceText] = useState('');
  const latestContract = contracts[0];

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

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      if (e.clientX === 0 && e.clientY === 0) setIsDragging(false);
    };
    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer?.files[0];
      if (file) {
        handleUpload(file);
      }
    };
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [clientId, organization]);

  useEffect(() => {
    if (!latestContract?.file_path) return;

    let cancelled = false;
    supabase.storage.from('contracts').createSignedUrl(latestContract.file_path, 60 * 60)
      .then(({ data }) => {
        if (!cancelled && data?.signedUrl) setFileUrl(data.signedUrl);
      });

    return () => { cancelled = true; };
  }, [latestContract?.file_path]);

  useEffect(() => {
    setActivePage(1);
    setSourceText('');
  }, [latestContract?.id]);

  const showSource = (page: number | null, text: string) => {
    if (page) setActivePage(page);
    setSourceText(text);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };
>>>>>>> cadence-remote/rishaan_new_work


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

      setProcessingStep(1);
      
      const { error: pageInsertError } = await supabase.from('contract_pages').insert(pageRecords);
      if (pageInsertError) throw pageInsertError;
      await supabase.from('contracts').update({ processing_stage: 'analyzing', status: 'analyzing' }).eq('id', contractId);
      await fetchData();

      const allText = pageRecords.map((p) => p.text_content).join('\n\n');
      const analysisText = allText.slice(0, 10_000);
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
      const { error: chunkInsertError } = await supabase.from('contract_chunks').insert(chunks.map((c) => ({ ...c, contract_id: contractId })));
      if (chunkInsertError) throw chunkInsertError;

      setProcessingStep(2);

      // Call edge function for AI analysis
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-contract`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contractId, organizationId: organization!.id, text: analysisText, pageCount }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Analysis failed (${response.status})`);
      }

      const result = await response.json();
      
      setProcessingStep(3);
      await new Promise(r => setTimeout(r, 1500));

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
        if (!termRecords.some((term: { status: string; term_value: string }) => term.status === 'found' && term.term_value)) {
          throw new Error('Analysis returned no extracted contract terms');
        }
        const { error: termInsertError } = await supabase.from('contract_terms').insert(termRecords);
        if (termInsertError) throw termInsertError;
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
        const { error: findingInsertError } = await supabase.from('contract_findings').insert(findingRecords);
        if (findingInsertError) throw findingInsertError;
      }

      await supabase.from('contracts').update({ status: 'complete', processing_stage: 'complete' }).eq('id', contractId);
      await logActivity(organization!.id, 'contract_analyzed', 'Contract analyzed', `${pageCount} pages processed. Terms and findings extracted.`, { client_id: clientId!, contract_id: contractId });
      showToast(
        allText.length > analysisText.length
          ? 'Initial contract section analyzed. Additional sections remain available for a later pass.'
          : 'Contract analysis complete.',
        'success',
      );
      setUploading(false);
      setProcessingStep(0);
      await fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Processing failed';
      await supabase.from('contracts').update({ status: 'failed', error_message: message, processing_stage: 'failed' }).eq('id', contractId);
      showToast('Contract analysis failed. ' + message, 'error');
      setUploading(false);
      setProcessingStep(0);
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

  const handleSearch = async (contractId: string) => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResult('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-contract`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contractId, query: searchQuery }),
      });
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setSearchResult(data.answer || 'No answer found.');
    } catch (err) {
      showToast('Contract search failed', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  if (loading) return <LoadingState message="Loading contracts..." />;

  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      {/* Magic Dropzone Overlay */}
      {(isDragging || processingStep > 0) && (
        <div className="absolute inset-0 z-50 rounded-xl flex items-center justify-center bg-cadence-bg/80 backdrop-blur-sm border-2 border-dashed border-cadence-accent transition-all duration-300">
          <div className="text-center">
            {isDragging ? (
              <>
                <div className="w-16 h-16 rounded-full bg-cadence-accent/20 flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-cadence-accent animate-bounce" />
                </div>
                <h3 className="font-display text-xl font-semibold text-cadence-text">Drop contract here</h3>
                <p className="text-cadence-muted mt-2">We'll instantly analyze it.</p>
              </>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-full bg-cadence-accent/20 flex items-center justify-center mx-auto mb-6">
                  <Loader2 className="w-8 h-8 text-cadence-accent animate-spin" />
                </div>
                <div className="space-y-3 text-left">
                  <div className="flex items-center gap-3">
                    <Check className={`w-5 h-5 ${processingStep > 1 ? 'text-cadence-accent' : 'text-cadence-muted opacity-50'}`} />
                    <span className={`text-sm ${processingStep > 1 ? 'text-cadence-text font-medium' : 'text-cadence-muted'} transition-all`}>Extracting text...</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className={`w-5 h-5 ${processingStep > 2 ? 'text-cadence-accent' : 'text-cadence-muted opacity-50'}`} />
                    <span className={`text-sm ${processingStep > 2 ? 'text-cadence-text font-medium' : 'text-cadence-muted'} transition-all`}>Identifying loopholes...</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className={`w-5 h-5 ${processingStep > 3 ? 'text-cadence-accent' : 'text-cadence-muted opacity-50'}`} />
                    <span className={`text-sm ${processingStep > 3 ? 'text-cadence-text font-medium' : 'text-cadence-muted'} transition-all`}>Cross-referencing invoices...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Contracts' }]} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h1 className="font-display text-2xl font-semibold text-cadence-text">Contracts</h1>
        <button 
          onClick={async () => {
            try {
              showToast('Generating contract in Google Docs...', 'info');
              const { data: { session } } = await supabase.auth.getSession();
              const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-doc`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${session?.access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  clientName: client?.name || 'Client',
                  providerToken: session?.provider_token
                }),
              });
              if (!res.ok) throw new Error('Failed to generate');
              const data = await res.json();
              window.open(data.docUrl, '_blank');
              showToast('Contract generated successfully!', 'success');
            } catch (e) {
              showToast('Failed to generate. Please re-login with Google to grant Docs permission.', 'error');
            }
          }}
          className="btn-secondary flex items-center gap-2"
        >
          <svg className="w-4 h-4 text-[#4285F4]" viewBox="0 0 24 24"><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16c0 1.11.89 2 2 2h12c1.11 0 2-.89 2-2V8l-6-6m4 18H6V4h7v5h5v11m-3-8.07V19H9v-5.07c0-1.07 1.06-1.61 1.82-1.07l1.18.83l1.18-.83c.76-.54 1.82 0 1.82 1.07Z"/></svg>
          Generate new via Docs
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Side: Document Preview */}
        <div>
          <InteractiveDocumentVisualization
            fileUrl={fileUrl}
            fileName={latestContract?.file_name || ''}
            pageCount={latestContract?.page_count || 1}
            activePage={activePage}
            sourceText={sourceText}
            onPageChange={(page) => {
              setActivePage(page);
              setSourceText('');
            }}
          />
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
                <div className="rounded-lg bg-cadence-surface2 p-4 space-y-2 mb-4">
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

              {/* Semantic Search */}
              {contract.status === 'complete' && (
                <div className="mt-4 mb-6 bg-cadence-surface2 p-5 rounded-xl border border-cadence-border shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Search className="w-4 h-4 text-cadence-accent" />
                    <h3 className="text-sm font-semibold text-cadence-text">Semantic Contract Search</h3>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="e.g. What is our liability cap?" 
                      className="flex-1 bg-cadence-surface border border-cadence-border text-cadence-text text-sm rounded-lg focus:ring-cadence-accent focus:border-cadence-accent block p-2.5 outline-none"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch(contract.id)}
                    />
                    <button 
                      onClick={() => handleSearch(contract.id)}
                      disabled={isSearching || !searchQuery.trim()}
                      className="bg-cadence-accent hover:bg-opacity-90 text-white font-medium rounded-lg text-sm px-4 py-2.5 text-center flex items-center justify-center disabled:opacity-50"
                    >
                      {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                    </button>
                  </div>
                  {searchResult && (
                    <div className="mt-4 p-4 bg-cadence-surface border border-cadence-border rounded-lg text-sm text-cadence-text animate-fade-in shadow-sm">
                      <strong className="text-cadence-accent mb-2 block uppercase text-xs tracking-wider">AI Answer</strong>
                      <p className="leading-relaxed">{searchResult}</p>
                    </div>
                  )}
                </div>
              )}

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
                          <button onClick={() => showSource(term.source_page, term.source_text)} className="text-xs text-cadence-accent hover:underline mt-1.5 flex items-center gap-1">
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
                                <button onClick={() => showSource(finding.source_page, finding.source_text)} className="text-xs text-cadence-accent hover:underline flex items-center gap-1">
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

    </div>
  );
}
