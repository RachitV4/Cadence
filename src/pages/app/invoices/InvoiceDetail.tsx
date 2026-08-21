import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { logActivity, formatCurrency, formatDate, getInvoiceDueStatus, getInvoiceAge } from '@/lib/utils';
import { LoadingState, ErrorState, Breadcrumbs, StatusBadge } from '@/components/ui/Primitives';
import { Modal } from '@/components/ui/Modal';
import type { Invoice, Client, Contract, ContractTerm, InvoiceAnalysis, EmailDraft, PaymentEvent } from '@/types';
import { TONES, type ToneKey } from '@/types';
import {
  FileText, Receipt, Brain, Lightbulb, Mail, Copy, Edit, Send,
  Loader2, Check, Shield, Sparkles, Save,
} from 'lucide-react';

export function InvoiceDetail() {
  const { invoiceId } = useParams();
  const { organization, user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [terms, setTerms] = useState<ContractTerm[]>([]);
  const [analysis, setAnalysis] = useState<InvoiceAnalysis | null>(null);
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentEvent[]>([]);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [selectedTone, setSelectedTone] = useState<ToneKey>('casual_friendly');
  const [emailThread, setEmailThread] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    if (!invoiceId || !organization) return;
    const { data: inv } = await supabase.from('invoices').select('*').eq('id', invoiceId).maybeSingle();
    if (!inv) { setLoading(false); return; }
    setInvoice(inv as Invoice);

    const [clientRes, analysisRes, draftRes, historyRes, allInvRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', inv.client_id).maybeSingle(),
      supabase.from('invoice_analysis').select('*').eq('invoice_id', inv.id).maybeSingle(),
      supabase.from('email_drafts').select('*').eq('invoice_id', inv.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('payment_events').select('*').eq('client_id', inv.client_id).order('created_at', { ascending: false }),
      supabase.from('invoices').select('*').eq('client_id', inv.client_id).order('created_at', { ascending: true }),
    ]);
    setClient(clientRes.data as Client | null);
    setAnalysis(analysisRes.data as InvoiceAnalysis | null);
    setDraft(draftRes.data as EmailDraft | null);
    setPaymentHistory((historyRes.data as PaymentEvent[]) || []);
    setAllInvoices((allInvRes.data as Invoice[]) || []);

    // Aggregate all contracts for the client to build the Knowledge Graph & MSA/SOW Hierarchy
    const { data: contractData } = await supabase.from('contracts').select('*').eq('client_id', inv.client_id).order('created_at', { ascending: true });
    if (contractData && contractData.length > 0) {
      // Treat the oldest contract as the parent MSA, but pass ALL terms to the AI
      setContract(contractData[0] as Contract);
      const contractIds = contractData.map(c => c.id);
      const { data: termsData } = await supabase.from('contract_terms').select('*').in('contract_id', contractIds).order('created_at', { ascending: true });
      setTerms((termsData as ContractTerm[]) || []);
    }

    // Load client tone
    const { data: toneData } = await supabase.from('client_tones').select('*').eq('client_id', inv.client_id).maybeSingle();
    if (toneData) setSelectedTone(toneData.selected_tone as ToneKey);

    setLoading(false);
  }, [invoiceId, organization]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const generateAdvice = async () => {
    if (!invoice || !client || !organization) return;
    setAnalyzing(true);
    setError('');
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-advice`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
          organizationId: organization.id,
          clientId: client.id,
          contractTerms: terms.filter((t) => t.status === 'found').map((t) => ({ key: t.term_key, value: t.edited_value || t.term_value })),
          clientContext: { is_repeat: client.is_repeat, notes: client.notes },
          invoiceData: { invoice_number: invoice.invoice_number, amount: invoice.amount, due_date: invoice.due_date, issue_date: invoice.issue_date },
          paymentHistory: paymentHistory.map((p) => ({ event_type: p.event_type, days_late: p.days_late, paid_date: p.paid_date })),
          invoiceCount: allInvoices.length,
          slackWebhookUrl: localStorage.getItem('cadence_slack_webhook'),
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Advice generation failed (${response.status})`);
      }

      const result = await response.json();

      // Save analysis
      await supabase.from('invoice_analysis').upsert({
        invoice_id: invoice.id,
        risk_level: result.risk_level || 'unknown',
        recommendation: result.recommendation || '',
        recommended_action: result.recommended_action || '',
        recommended_tone: result.recommended_tone || 'casual_friendly',
        explanation: result.explanation || '',
        evidence: result.evidence || [],
        tone_reason: result.tone_reason || '',
        status: 'complete',
      }, { onConflict: 'invoice_id' });

      await logActivity(organization.id, 'advice_generated', 'Advice generated', `Cadence analyzed ${invoice.invoice_number}.`, { client_id: client.id, invoice_id: invoice.id });
      showToast('Advice generated.', 'success');
      setAnalyzing(false);
      await fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate advice';
      setError(message);
      showToast('Could not generate advice. ' + message, 'error');
      setAnalyzing(false);
    }
  };

  const generateDraft = async (optionalThread: any[] = []) => {
    if (!invoice || !client || !organization || !analysis) return;
    setDrafting(true);
    setError('');
    try {
      const toneToUse = selectedTone;
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-email`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
          organizationId: organization.id,
          clientId: client.id,
          tone: toneToUse,
          clientName: client.name,
          clientEmail: client.contact_email,
          invoiceNumber: invoice.invoice_number,
          amount: invoice.amount,
          dueDate: invoice.due_date,
          advice: analysis.recommendation,
          explanation: analysis.explanation,
          contractTerms: terms.filter((t) => t.status === 'found').map((t) => ({ key: t.term_key, value: t.edited_value || t.term_value })),
          clientNotes: client.notes,
          isRepeat: client.is_repeat,
          emailThread: optionalThread.length > 0 ? optionalThread : emailThread,
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Email generation failed (${response.status})`);
      }

      const result = await response.json();

      const { data: newDraft } = await supabase
        .from('email_drafts')
        .insert({
          invoice_id: invoice.id,
          organization_id: organization.id,
          client_id: client.id,
          subject: result.subject || '',
          body: result.body || '',
          tone: toneToUse,
          tone_reason: analysis.tone_reason || '',
          status: 'draft',
        })
        .select()
        .single();

      await logActivity(organization.id, 'draft_created', 'Email draft created', `Draft created for ${invoice.invoice_number}.`, { client_id: client.id, invoice_id: invoice.id });
      showToast('Email draft created.', 'success');
      setDrafting(false);
      setDraft(newDraft as EmailDraft);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate email';
      setError(message);
      showToast('Could not generate email. ' + message, 'error');
      setDrafting(false);
    }
  };

  const handleCopy = () => {
    if (!draft) return;
    const text = `Subject: ${draft.subject}\n\n${draft.body}`;
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard.', 'success');
  };

  const handleSaveDraft = async () => {
    if (!draft || !organization) return;
    await supabase.from('email_drafts').update({ subject: editSubject, body: editBody }).eq('id', draft.id);
    await logActivity(organization.id, 'draft_edited', 'Draft edited', `Email draft updated.`, { client_id: client!.id, invoice_id: invoice!.id });
    showToast('Draft saved.', 'success');
    setEditModalOpen(false);
    await fetchData();
  };

  const handleSend = async () => {
    if (!draft || !organization) return;
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.provider_token) {
        throw new Error('No Google OAuth provider_token found. Please log in with Google.');
      }
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-gmail`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: client?.contact_email || 'client@example.com',
          subject: draft.subject,
          body: draft.body,
          providerToken: session?.provider_token
        }),
      });
      if (!res.ok) throw new Error('Failed to send');
      
      await supabase.from('email_drafts').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', draft.id);
      await logActivity(organization.id, 'email_sent', 'Email sent via Gmail', `${draft.subject} sent to ${client?.contact_email}.`, { client_id: client!.id, invoice_id: invoice!.id });
      
      if (user) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          organization_id: organization.id,
          title: 'Email sent via Gmail',
          body: `${draft.subject}`,
          type: 'success',
          link: `/dashboard/invoice/${invoice!.id}`,
        });
      }
      showToast('Email sent securely via Gmail!', 'success');
      await fetchData();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to send email. Check Gmail scopes.', 'error');
    } finally {
      setSending(false);
    }
  };

  const openEditModal = () => {
    if (!draft) return;
    setEditSubject(draft.subject);
    setEditBody(draft.body);
    setEditModalOpen(true);
  };

  if (loading) return <LoadingState message="Loading invoice..." />;
  if (!invoice || !client) return <ErrorState message="Invoice not found." />;

  const dueStatus = getInvoiceDueStatus(invoice.due_date, invoice.payment_status);
  const invoiceAge = getInvoiceAge(invoice.due_date);
  const previousInvoices = allInvoices.filter((i) => i.id !== invoice.id);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Breadcrumbs items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: client.name, href: `/dashboard/client/${client.id}` },
        { label: 'Invoices', href: `/dashboard/client/${client.id}/invoices` },
        { label: invoice.invoice_number || 'Invoice' },
      ]} />

      {/* Invoice header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-cadence-text">
            Invoice {invoice.invoice_number || '—'}
          </h1>
          <p className="text-sm text-cadence-muted mt-1">{client.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={dueStatus} />
          {invoice.confirmed && <span className="badge-success"><Check className="w-3 h-3" /> Confirmed</span>}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-cadence-dangerSoft p-3 mb-6">
          <p className="text-sm text-cadence-danger">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* From the contract */}
        {contract && terms.length > 0 && (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-cadence-accent" />
              <h2 className="text-sm font-medium text-cadence-text">From the contract</h2>
              <span className="text-xs text-cadence-muted">{contract.file_name}</span>
            </div>
            <dl className="grid sm:grid-cols-2 gap-3">
              {terms.filter((t) => t.status === 'found').slice(0, 6).map((term) => (
                <div key={term.id} className="flex justify-between text-sm border-b border-cadence-border pb-2">
                  <dt className="text-cadence-muted capitalize">{term.term_key.replace(/_/g, ' ')}</dt>
                  <dd className="font-mono text-cadence-text">{term.edited_value || term.term_value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* Invoice details */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="w-4 h-4 text-cadence-accent" />
            <h2 className="text-sm font-medium text-cadence-text">Invoice Cadence read</h2>
          </div>
          <dl className="grid sm:grid-cols-2 gap-3">
            <div className="flex justify-between text-sm border-b border-cadence-border pb-2">
              <dt className="text-cadence-muted">Invoice #</dt>
              <dd className="font-mono text-cadence-text">{invoice.invoice_number || '—'}</dd>
            </div>
            <div className="flex justify-between text-sm border-b border-cadence-border pb-2">
              <dt className="text-cadence-muted">Amount</dt>
              <dd className="font-mono text-cadence-text">{formatCurrency(invoice.amount)}</dd>
            </div>
            <div className="flex justify-between text-sm border-b border-cadence-border pb-2">
              <dt className="text-cadence-muted">Due date</dt>
              <dd className="font-mono text-cadence-text">{formatDate(invoice.due_date)}</dd>
            </div>
            {invoiceAge > 0 && invoice.payment_status !== 'paid' && (
              <div className="flex justify-between text-sm border-b border-cadence-border pb-2">
                <dt className="text-cadence-muted">Days overdue</dt>
                <dd className="font-mono text-cadence-danger">{invoiceAge}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Cadence's advice */}
        {analysis ? (
          <div className="card p-5 ring-1 ring-cadence-accentLine">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cadence-accent flex items-center justify-center">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-cadence-text">Cadence's advice</h2>
                  <span className={`badge ${analysis.risk_level === 'low' ? 'badge-success' : analysis.risk_level === 'medium' ? 'badge-warning' : 'badge-danger'}`}>
                    {analysis.risk_level === 'low' ? 'Low risk' : analysis.risk_level === 'medium' ? 'Medium risk' : 'High risk'}
                  </span>
                </div>
              </div>
              <button 
                onClick={generateAdvice} 
                disabled={analyzing}
                className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5"
              >
                {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 21v-5h5" /></svg>}
                Regenerate
              </button>
            </div>
            <p className="text-sm text-cadence-text leading-relaxed mb-4">{analysis.explanation}</p>

            {/* What it's based on */}
            {analysis.evidence && analysis.evidence.length > 0 && (
              <div className="rounded-lg bg-cadence-surface2 p-4 mb-4">
                <p className="text-xs font-mono uppercase tracking-wider text-cadence-muted mb-2">What it's based on</p>
                <ul className="space-y-1.5">
                  {analysis.evidence.map((ev, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-cadence-success mt-0.5 shrink-0" />
                      <div>
                        <span className="text-cadence-text">{ev.source}</span>
                        {ev.detail && <span className="text-cadence-muted"> — {ev.detail}</span>}
                        {ev.reference && <span className="text-xs font-mono text-cadence-accent ml-1">{ev.reference}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommended action */}
            <div className="flex items-center justify-between rounded-lg bg-cadence-accentSoft p-4">
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-cadence-muted mb-1">Recommended action</p>
                <p className="text-sm font-medium text-cadence-text">{analysis.recommended_action}</p>
                <p className="text-xs text-cadence-secondary mt-1">Recommended tone: {TONES.find((t) => t.key === analysis.recommended_tone)?.name || analysis.recommended_tone}</p>
              </div>
              <Lightbulb className="w-6 h-6 text-cadence-accent shrink-0" />
            </div>
          </div>
        ) : (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-cadence-muted" />
              <h2 className="text-sm font-medium text-cadence-text">Cadence's advice</h2>
            </div>
            <p className="text-sm text-cadence-muted mb-4">Cadence will analyze this invoice using the contract terms, client history, and payment context.</p>
            <button onClick={generateAdvice} disabled={analyzing} className="btn-primary">
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {analyzing ? 'Analyzing...' : 'Generate advice'}
            </button>
          </div>
        )}

        {/* Tone selection */}
        {analysis && (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="w-4 h-4 text-cadence-accent" />
              <h2 className="text-sm font-medium text-cadence-text">Tone</h2>
              {analysis.recommended_tone && (
                <span className="text-xs text-cadence-muted">Cadence recommends: {TONES.find((t) => t.key === analysis.recommended_tone)?.name}</span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {TONES.map((tone) => (
                <button
                  key={tone.key}
                  onClick={() => setSelectedTone(tone.key)}
                  className={`rounded-lg border p-3 text-left transition-all ${
                    selectedTone === tone.key
                      ? 'border-cadence-accent bg-cadence-accentSoft'
                      : 'border-cadence-border hover:bg-cadence-surface2'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-cadence-text">{tone.name}</span>
                    {analysis.recommended_tone === tone.key && <span className="badge-accent text-2xs">Recommended</span>}
                  </div>
                  <p className="text-xs text-cadence-muted leading-relaxed">{tone.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Email draft */}
        {draft ? (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3 justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-cadence-muted" />
                <h2 className="text-sm font-medium text-cadence-text">Drafted email</h2>
                {emailThread.length > 0 && (
                  <span className="ml-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM4 10a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2zm16 0a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2z"/><path d="M12 8v12M8 14l4-4 4 4"/></svg>
                    Multi-Agent Negotiator Active
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <span className="text-xs text-cadence-muted">Tone: {TONES.find((t) => t.key === draft.tone)?.name || draft.tone}</span>
                {draft.status === 'sent' && <span className="badge-success"><Check className="w-3 h-3" /> Sent</span>}
              </div>
              {draft.status !== 'sent' && (
                <button 
                  onClick={generateDraft} 
                  disabled={drafting}
                  className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5"
                >
                  {drafting ? <Loader2 className="w-3 h-3 animate-spin" /> : <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 21v-5h5" /></svg>}
                  Regenerate
                </button>
              )}
            </div>
            <div className="rounded-lg border border-cadence-border bg-cadence-bg p-4 space-y-3">
              <div>
                <p className="text-xs font-mono text-cadence-muted">To: {client.contact_email || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-mono text-cadence-muted">Subject:</p>
                <p className="text-sm text-cadence-text">{draft.subject}</p>
              </div>
              <div>
                <p className="text-xs font-mono text-cadence-muted mb-1">Body:</p>
                <p className="text-sm text-cadence-secondary whitespace-pre-wrap leading-relaxed">{draft.body}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <button onClick={handleCopy} className="btn-secondary"><Copy className="w-4 h-4" /> Copy</button>
              {draft.status !== 'sent' && (
                <>
                  <button onClick={openEditModal} className="btn-secondary"><Edit className="w-4 h-4" /> Edit</button>
                  <button 
                    onClick={async () => {
                      try {
                        const { data: { session } } = await supabase.auth.getSession();
                        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/schedule-meet`, {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${session?.access_token}`,
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            clientEmail: client.contact_email || 'client@example.com',
                            clientName: client.name,
                            providerToken: session?.provider_token
                          }),
                        });
                        if (!res.ok) throw new Error('Failed to schedule');
                        const data = await res.json();
                        
                        const meetAppend = `\n\nI've placed a 15-minute hold on my calendar for tomorrow to sync on this. You can join the Google Meet here: ${data.meetLink}`;
                        const newBody = draft.body + meetAppend;
                        
                        await supabase.from('email_drafts').update({ body: newBody }).eq('id', draft.id);
                        showToast('Google Meet scheduled and added to draft!', 'success');
                        await fetchData();
                      } catch (e) {
                        showToast('Failed to schedule Meet. Check Calendar scopes.', 'error');
                      }
                    }} 
                    className="btn-secondary border-cadence-accent text-cadence-accent hover:bg-cadence-accentSoft"
                  >
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path fill="currentColor" d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/></svg>
                    Insert Google Meet
                  </button>
                  <button onClick={handleSend} disabled={sending} className="btn-primary">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {sending ? 'Sending...' : 'Send via Gmail'}
                  </button>
                </>
              )}
              {draft.status === 'sent' && (
                <button 
                  onClick={async () => {
                    try {
                      showToast('Scanning inbox for replies...', 'info');
                      const { data: { session } } = await supabase.auth.getSession();
                      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-gmail`, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${session?.access_token}`,
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          clientEmail: client.contact_email || 'client@example.com',
                          providerToken: session?.provider_token,
                          subjectQuery: draft.subject.replace(/re:|fwd:/gi, '').trim()
                        }),
                      });
                      if (!res.ok) throw new Error('Failed to check replies');
                      const data = await res.json();
                      if (data.emails && data.emails.length > 1) {
                        showToast(`Found ${data.emails.length - 1} replies! Auto-drafting response...`, 'success');
                        setEmailThread(data.emails);
                        await generateDraft(data.emails);
                      } else {
                        showToast('No new replies found yet.', 'info');
                      }
                    } catch (e) {
                      showToast('Failed to check inbox.', 'error');
                    }
                  }} 
                  className="btn-secondary border-[#4285F4] text-[#4285F4] hover:bg-[#4285F4]/10"
                >
                  <Mail className="w-4 h-4 mr-2" /> Check for Replies
                </button>
              )}
            </div>
            {draft.status === 'sent' && (
              <div className="mt-3 rounded-lg bg-cadence-successSoft p-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-cadence-success" />
                <p className="text-xs text-cadence-success">Sent in demo mode. No real email was delivered.</p>
              </div>
            )}
          </div>
        ) : analysis ? (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Mail className="w-4 h-4 text-cadence-muted" />
              <h2 className="text-sm font-medium text-cadence-text">Drafted email</h2>
            </div>
            <p className="text-sm text-cadence-muted mb-4">Cadence will draft an email using the advice, contract context, and selected tone.</p>
            <button onClick={generateDraft} disabled={drafting} className="btn-primary">
              {drafting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {drafting ? 'Drafting...' : 'Draft email'}
            </button>
          </div>
        ) : null}

        {/* Previous invoice history */}
        {previousInvoices.length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-medium text-cadence-text mb-3">Payment history</h2>
            <div className="divide-y divide-cadence-border">
              {previousInvoices.map((inv) => {
                const status = getInvoiceDueStatus(inv.due_date, inv.payment_status);
                return (
                  <div key={inv.id} className="py-2 flex items-center justify-between text-sm">
                    <div>
                      <span className="text-cadence-text font-medium">{inv.invoice_number || '—'}</span>
                      <span className="text-cadence-muted ml-2">{formatCurrency(inv.amount)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-cadence-muted">{formatDate(inv.due_date)}</span>
                      <span className={`badge ${status === 'paid' ? 'badge-success' : status === 'overdue' ? 'badge-danger' : 'badge-muted'}`}>
                        {status === 'paid' ? 'Paid' : status === 'overdue' ? 'Overdue' : 'Upcoming'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Edit modal */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit email draft" className="max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="label">Subject</label>
            <input className="input" value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
          </div>
          <div>
            <label className="label">Body</label>
            <textarea className="input min-h-[200px]" value={editBody} onChange={(e) => setEditBody(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditModalOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSaveDraft} className="btn-primary"><Save className="w-4 h-4" /> Save draft</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
