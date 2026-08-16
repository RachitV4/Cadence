import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { logActivity, formatCurrency, formatDate, getInvoiceDueStatus } from '@/lib/utils';
import { LoadingState, EmptyState, Breadcrumbs, ErrorState } from '@/components/ui/Primitives';
import { Modal } from '@/components/ui/Modal';
import type { Invoice, Contract } from '@/types';
import { Upload, Receipt, Loader2, ArrowRight, Edit, Check, AlertTriangle, Clock } from 'lucide-react';
import * as mammoth from 'mammoth';
import Tesseract from 'tesseract.js';

export function ClientInvoices() {
  const { clientId } = useParams();
  const { organization } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [confirmInvoice, setConfirmInvoice] = useState<Invoice | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState({ invoice_number: '', amount: '', due_date: '', issue_date: '', description: '' });
  const [error, setError] = useState('');
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!clientId || !organization) return;
    const [invRes, contractRes] = await Promise.all([
      supabase.from('invoices').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
      supabase.from('contracts').select('*').eq('client_id', clientId).eq('status', 'complete'),
    ]);
    setInvoices((invRes.data as Invoice[]) || []);
    setContracts((contractRes.data as Contract[]) || []);
    setLoading(false);
  }, [clientId, organization]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpload = async (file: File) => {
    if (!clientId || !organization || !file) return;
    setFileUrl(URL.createObjectURL(file));
    setUploading(true);
    setError('');
    try {
      const fileId = crypto.randomUUID();
      const filePath = `${organization.id}/${clientId}/${fileId}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('invoices').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: invData, error: insertError } = await supabase
        .from('invoices')
        .insert({
          client_id: clientId,
          organization_id: organization.id,
          contract_id: contracts[0]?.id || null,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          status: 'uploaded',
          extraction_status: 'processing',
        })
        .select()
        .single();
      if (insertError) throw insertError;
      await logActivity(organization.id, 'invoice_uploaded', 'Invoice uploaded', `${file.name} uploaded.`, { client_id: clientId, invoice_id: invData.id });
      showToast('Invoice uploaded. Extracting details...', 'success');

      // Extract text from file based on type
      let fullText = '';
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdfjs = await import('pdfjs-dist');
        const pdfWorker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
        pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker.default;
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          fullText += textContent.items.map((item: unknown) => (item as { str?: string }).str || '').join(' ') + '\n';
        }
      } else if (file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        fullText = result.value;
      } else if (file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/jpg') {
        const result = await Tesseract.recognize(file, 'eng');
        fullText = result.data.text;
      }

      // Call edge function for extraction
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-invoice`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoiceId: invData.id, organizationId: organization.id, text: fullText.slice(0, 8000) }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Extraction failed (${response.status})`);
      }

      const result = await response.json();
      const updateData: Record<string, unknown> = {
        invoice_number: result.invoice_number || '',
        amount: result.amount || 0,
        currency: result.currency || 'USD',
        issue_date: result.issue_date || null,
        due_date: result.due_date || null,
        description: result.description || '',
        extraction_status: 'complete',
        status: 'extracted',
      };
      await supabase.from('invoices').update(updateData).eq('id', invData.id);
      await logActivity(organization.id, 'invoice_extracted', 'Invoice fields extracted', `Cadence extracted invoice details.`, { client_id: clientId!, invoice_id: invData.id });
      setUploading(false);
      showToast('Invoice details extracted.', 'success');
      await fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      showToast('Invoice upload failed. ' + message, 'error');
      setUploading(false);
      await fetchData();
    }
  };

  const handleManualCreate = async (values: typeof editValues) => {
    if (!clientId || !organization) return;
    const { data, error: insertError } = await supabase
      .from('invoices')
      .insert({
        client_id: clientId,
        organization_id: organization.id,
        contract_id: contracts[0]?.id || null,
        invoice_number: values.invoice_number,
        amount: parseFloat(values.amount) || 0,
        due_date: values.due_date || null,
        issue_date: values.issue_date || null,
        description: values.description,
        status: 'extracted',
        extraction_status: 'complete',
        confirmed: false,
      })
      .select()
      .single();
    if (insertError) {
      showToast('Could not create invoice.', 'error');
      return;
    }
    await logActivity(organization.id, 'invoice_uploaded', 'Invoice created', `${values.invoice_number || 'Invoice'} created manually.`, { client_id: clientId, invoice_id: data.id });
    showToast('Invoice created.', 'success');
    setManualOpen(false);
    await fetchData();
  };

  const confirmInvoiceData = async () => {
    if (!confirmInvoice || !organization) return;
    const updates = editMode ? {
      invoice_number: editValues.invoice_number,
      amount: parseFloat(editValues.amount) || 0,
      due_date: editValues.due_date || null,
      issue_date: editValues.issue_date || null,
      description: editValues.description,
      confirmed: true,
    } : { confirmed: true };
    await supabase.from('invoices').update(updates).eq('id', confirmInvoice.id);
    await logActivity(organization.id, 'invoice_confirmed', 'Invoice confirmed', `${confirmInvoice.invoice_number || 'Invoice'} confirmed.`, { client_id: clientId!, invoice_id: confirmInvoice.id });
    showToast('Invoice confirmed.', 'success');
    setConfirmInvoice(null);
    setEditMode(false);
    await fetchData();
  };

  const openConfirm = (inv: Invoice) => {
    setConfirmInvoice(inv);
    setEditMode(false);
    setEditValues({
      invoice_number: inv.invoice_number,
      amount: inv.amount.toString(),
      due_date: inv.due_date || '',
      issue_date: inv.issue_date || '',
      description: inv.description,
    });
  };

  if (loading) return <LoadingState message="Loading invoices..." />;

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Invoices' }]} />
      <h1 className="font-display text-2xl font-semibold text-cadence-text mb-6">Invoices</h1>

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
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div
          className="flex-1 border-2 border-dashed border-cadence-border rounded-xl p-6 text-center hover:border-cadence-accent transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f && (f.type === 'application/pdf' || f.name.endsWith('.docx') || f.type.startsWith('image/'))) handleUpload(f); }}
        >
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.png,.jpg,.jpeg" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
          {uploading ? (
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 text-cadence-accent animate-spin" />
              <span className="text-sm text-cadence-secondary">Extracting invoice details...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <Upload className="w-5 h-5 text-cadence-accent" />
              <span className="text-sm text-cadence-text font-medium">Upload invoice (PDF, DOCX, Image)</span>
            </div>
          )}
        </div>
        <button onClick={() => setManualOpen(true)} className="btn-secondary">Enter manually</button>
      </div>

      {error && <ErrorState message={error} onRetry={() => setError('')} />}

      {invoices.length === 0 ? (
        <EmptyState icon={<Receipt className="w-6 h-6" />} title="No invoices yet" description="Upload an invoice (PDF, DOCX, Image) or enter one manually. Cadence will check it against the contract." />
      ) : (
        <div className="card divide-y divide-cadence-border">
          {invoices.map((inv) => {
            const status = getInvoiceDueStatus(inv.due_date, inv.payment_status);
            return (
              <div key={inv.id} className="px-4 py-3 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  status === 'overdue' ? 'bg-cadence-dangerSoft' : status === 'due_today' ? 'bg-cadence-warningSoft' : status === 'paid' ? 'bg-cadence-successSoft' : 'bg-cadence-surface2'
                }`}>
                  {status === 'overdue' ? <AlertTriangle className="w-5 h-5 text-cadence-danger" /> : status === 'due_today' ? <Clock className="w-5 h-5 text-cadence-warning" /> : <Receipt className="w-5 h-5 text-cadence-muted" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-cadence-text">{inv.invoice_number || 'Untitled invoice'}</p>
                  <p className="text-xs text-cadence-muted">{formatCurrency(inv.amount)} · Due {formatDate(inv.due_date)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!inv.confirmed && inv.extraction_status === 'complete' && (
                    <button onClick={() => openConfirm(inv)} className="btn-secondary text-xs px-2.5 py-1.5">Confirm</button>
                  )}
                  {inv.confirmed ? (
                    <Link to={`/dashboard/invoice/${inv.id}`} className="btn-primary text-xs px-2.5 py-1.5">
                      View <ArrowRight className="w-3 h-3" />
                    </Link>
                  ) : (
                    <span className={`badge ${status === 'overdue' ? 'badge-danger' : status === 'due_today' ? 'badge-warning' : 'badge-muted'}`}>
                      {inv.extraction_status === 'processing' ? 'Processing' : 'Needs confirmation'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
        </div>
      </div>

      {/* Manual entry modal */}
      <Modal open={manualOpen} onClose={() => setManualOpen(false)} title="Enter invoice manually">
        <ManualInvoiceForm onSubmit={handleManualCreate} onCancel={() => setManualOpen(false)} />
      </Modal>

      {/* Confirm invoice modal */}
      <Modal open={!!confirmInvoice} onClose={() => { setConfirmInvoice(null); setEditMode(false); }} title="Confirm invoice details">
        {confirmInvoice && (
          <div className="space-y-4">
            <p className="text-sm text-cadence-muted">Review the extracted details before proceeding.</p>
            <div className="space-y-3">
              <div>
                <label className="label">Invoice number</label>
                {editMode ? <input className="input" value={editValues.invoice_number} onChange={(e) => setEditValues({ ...editValues, invoice_number: e.target.value })} /> : <p className="text-sm font-mono text-cadence-text">{confirmInvoice.invoice_number || '—'}</p>}
              </div>
              <div>
                <label className="label">Amount</label>
                {editMode ? <input className="input" type="number" value={editValues.amount} onChange={(e) => setEditValues({ ...editValues, amount: e.target.value })} /> : <p className="text-sm font-mono text-cadence-text">{formatCurrency(confirmInvoice.amount)}</p>}
              </div>
              <div>
                <label className="label">Due date</label>
                {editMode ? <input className="input" type="date" value={editValues.due_date} onChange={(e) => setEditValues({ ...editValues, due_date: e.target.value })} /> : <p className="text-sm font-mono text-cadence-text">{formatDate(confirmInvoice.due_date)}</p>}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              {editMode ? (
                <>
                  <button onClick={() => setEditMode(false)} className="btn-secondary">Cancel edit</button>
                  <button onClick={confirmInvoiceData} className="btn-primary">Save & confirm</button>
                </>
              ) : (
                <>
                  <button onClick={() => setEditMode(true)} className="btn-secondary"><Edit className="w-4 h-4" /> Edit</button>
                  <button onClick={confirmInvoiceData} className="btn-primary"><Check className="w-4 h-4" /> Confirm invoice</button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ManualInvoiceForm({ onSubmit, onCancel }: { onSubmit: (v: { invoice_number: string; amount: string; due_date: string; issue_date: string; description: string }) => void; onCancel: () => void }) {
  const [values, setValues] = useState({ invoice_number: '', amount: '', due_date: '', issue_date: '', description: '' });
  return (
    <div className="space-y-4">
      <div>
        <label className="label">Invoice number</label>
        <input className="input" value={values.invoice_number} onChange={(e) => setValues({ ...values, invoice_number: e.target.value })} placeholder="INV-001" />
      </div>
      <div>
        <label className="label">Amount</label>
        <input className="input" type="number" step="0.01" value={values.amount} onChange={(e) => setValues({ ...values, amount: e.target.value })} placeholder="15000" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Issue date</label>
          <input className="input" type="date" value={values.issue_date} onChange={(e) => setValues({ ...values, issue_date: e.target.value })} />
        </div>
        <div>
          <label className="label">Due date</label>
          <input className="input" type="date" value={values.due_date} onChange={(e) => setValues({ ...values, due_date: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="label">Description</label>
        <input className="input" value={values.description} onChange={(e) => setValues({ ...values, description: e.target.value })} placeholder="Q3 retainer" />
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
        <button onClick={() => onSubmit(values)} className="btn-primary">Create invoice</button>
      </div>
    </div>
  );
}
