import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { logActivity, formatCurrency, formatDate, getInvoiceDueStatus, getInvoiceAge } from '@/lib/utils';
import { getSmartAlerts } from '@/lib/smartAlerts';
import { getToneAnchor, normalizeToneLevel, TONE_ANCHORS, toneLevelFromKey } from '@/lib/toneSimulator';
import { LoadingState, ErrorState, Breadcrumbs, StatusBadge } from '@/components/ui/Primitives';
import { Modal } from '@/components/ui/Modal';
import type { Invoice, Client, Contract, ContractTerm, InvoiceAnalysis, EmailDraft, PaymentEvent, PaymentPromise } from '@/types';
import type { ToneKey } from '@/types';
import {
  FileText, Receipt, Brain, Lightbulb, Mail, Copy, Edit, Send,
  Loader2, Check, Shield, Sparkles, Save, AlertTriangle,
} from 'lucide-react';
import confetti from 'canvas-confetti';

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
  const [paymentPromise, setPaymentPromise] = useState<PaymentPromise | null>(null);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [emailThread, setEmailThread] = useState<any[]>([]);
  const [toneLevel, setToneLevel] = useState(25);
  const [recommendedToneLevel, setRecommendedToneLevel] = useState(25);
  const [promiseModalOpen, setPromiseModalOpen] = useState(false);
  const [promiseDate, setPromiseDate] = useState('');
  const [promiseNotes, setPromiseNotes] = useState('');
  const [savingPromise, setSavingPromise] = useState(false);
  const [showSentOverlay, setShowSentOverlay] = useState(false);

  const fetchData = useCallback(async () => {
    if (!invoiceId || !organization) return;
    const { data: inv } = await supabase.from('invoices').select('*').eq('id', invoiceId).maybeSingle();
    if (!inv) { setLoading(false); return; }
    setInvoice(inv as Invoice);

    const [clientRes, analysisRes, draftRes, historyRes, allInvRes, promiseRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', inv.client_id).maybeSingle(),
      supabase.from('invoice_analysis').select('*').eq('invoice_id', inv.id).maybeSingle(),
      supabase.from('email_drafts').select('*').eq('invoice_id', inv.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('payment_events').select('*').eq('client_id', inv.client_id).order('created_at', { ascending: false }),
      supabase.from('invoices').select('*').eq('client_id', inv.client_id).order('created_at', { ascending: true }),
      supabase.from('payment_promises').select('*').eq('invoice_id', inv.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    setClient(clientRes.data as Client | null);
    setAnalysis(analysisRes.data as InvoiceAnalysis | null);
    setDraft(draftRes.data as EmailDraft | null);
    setPaymentHistory((historyRes.data as PaymentEvent[]) || []);
    setAllInvoices((allInvRes.data as Invoice[]) || []);
    setPaymentPromise(promiseRes.data as PaymentPromise | null);

    // Aggregate all contracts for the client to build the Knowledge Graph & MSA/SOW Hierarchy
    const { data: contractData } = await supabase.from('contracts').select('*').eq('client_id', inv.client_id).order('created_at', { ascending: true });
    if (contractData && contractData.length > 0) {
      // Treat the oldest contract as the parent MSA, but pass ALL terms to the AI
      setContract(contractData[0] as Contract);
      const contractIds = contractData.map(c => c.id);
      const { data: termsData } = await supabase.from('contract_terms').select('*').in('contract_id', contractIds).order('created_at', { ascending: true });
      setTerms((termsData as ContractTerm[]) || []);
    }

    setLoading(false);
  }, [invoiceId, organization]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const recommendedToneKey = analysis?.recommended_tone;

  useEffect(() => {
    if (!recommendedToneKey) return;
    const level = toneLevelFromKey(recommendedToneKey as ToneKey);
    setRecommendedToneLevel(level);
    setToneLevel(level);
  }, [analysis?.id, recommendedToneKey]);

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
          toneLevel,
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
          emailThread: optionalThread && optionalThread.length > 0 ? optionalThread : emailThread,
          existingDraft: draft ? { subject: draft.subject, body: draft.body } : null,
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Email generation failed (${response.status})`);
      }

      const result = await response.json();

      const draftValues = {
        subject: result.subject || '',
        body: result.body || '',
        tone: result.tone || getToneAnchor(toneLevel).key,
        tone_level: result.tone_level ?? normalizeToneLevel(toneLevel),
        tone_reason: analysis.tone_reason || '',
        preservation_warnings: result.preservation_warnings || [],
        status: 'draft',
      };
      const draftQuery = draft
        ? supabase.from('email_drafts').update(draftValues).eq('id', draft.id)
        : supabase.from('email_drafts').insert({
            ...draftValues,
            invoice_id: invoice.id,
            organization_id: organization.id,
            client_id: client.id,
          });
      const { data: savedDraft, error: draftError } = await draftQuery.select().single();
      if (draftError) throw new Error(`Saving email draft failed: ${draftError.message}`);

      const { data: clientTone, error: clientToneReadError } = await supabase
        .from('client_tones')
        .select('selected_tone, selected_tone_level, average_tone_level, tone_sample_count')
        .eq('client_id', client.id)
        .maybeSingle();
      if (clientToneReadError) throw new Error(`Loading client tone history failed: ${clientToneReadError.message}`);
      const sampleCount = clientTone?.tone_sample_count || 0;
      const averageTone = Number(clientTone?.average_tone_level ?? 50);
      const nextToneLevel = normalizeToneLevel(toneLevel);
      const nextSampleCount = draft && sampleCount > 0 ? sampleCount : sampleCount + 1;
      const nextAverage = draft && sampleCount > 0
        ? (averageTone * sampleCount - draft.tone_level + nextToneLevel) / sampleCount
        : (averageTone * sampleCount + nextToneLevel) / nextSampleCount;
      const { error: toneError } = await supabase.from('client_tones').upsert({
        client_id: client.id,
        organization_id: organization.id,
        selected_tone: clientTone?.selected_tone || 'casual_friendly',
        selected_tone_level: clientTone?.selected_tone_level ?? 25,
        average_tone_level: nextAverage,
        tone_sample_count: nextSampleCount,
      }, { onConflict: 'client_id' });
      if (toneError) throw new Error(`Saving client tone history failed: ${toneError.message}`);

      await logActivity(organization.id, draft ? 'draft_regenerated' : 'draft_created', draft ? 'Email draft regenerated' : 'Email draft created', `Draft created for ${invoice.invoice_number}.`, { client_id: client.id, invoice_id: invoice.id });
      showToast(draft ? 'Email draft regenerated.' : 'Email draft created.', 'success');
      setDrafting(false);
      setDraft(savedDraft as EmailDraft);
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
      
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3C493F', '#D64545', '#4C5FD5', '#B9770E']
      });
      setShowSentOverlay(true);
      setTimeout(() => setShowSentOverlay(false), 2000);

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

  const openPromiseModal = () => {
    setPromiseDate(new Date().toISOString().slice(0, 10));
    setPromiseNotes('');
    setPromiseModalOpen(true);
  };

  const savePaymentPromise = async () => {
    if (!invoice || !client || !organization || !promiseDate) return;
    setSavingPromise(true);
    try {
      const { error: promiseError } = await supabase.from('payment_promises').insert({
        invoice_id: invoice.id,
        organization_id: organization.id,
        client_id: client.id,
        promised_date: promiseDate,
        status: 'pending',
        source: 'manual',
        notes: promiseNotes.trim(),
      });
      if (promiseError) throw promiseError;

      await logActivity(organization.id, 'payment_promise_recorded', 'Payment promise recorded', `Payment promised for ${formatDate(promiseDate)}.`, { client_id: client.id, invoice_id: invoice.id });
      showToast('Payment promise recorded.', 'success');
      setPromiseModalOpen(false);
      await fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not record the payment promise';
      showToast(message, 'error');
    } finally {
      setSavingPromise(false);
    }
  };

  if (loading) return <LoadingState message="Loading invoice..." />;
  if (!invoice || !client) return <ErrorState message="Invoice not found." />;

  const dueStatus = getInvoiceDueStatus(invoice.due_date, invoice.payment_status);
  const invoiceAge = getInvoiceAge(invoice.due_date);
  const previousInvoices = allInvoices.filter((i) => i.id !== invoice.id);
  const smartAlerts = getSmartAlerts(invoice, paymentHistory, paymentPromise);
  const selectedTone = getToneAnchor(toneLevel);
  const recommendedTone = getToneAnchor(recommendedToneLevel);

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

        {smartAlerts.map((alert) => (
          <div key={alert.title} className={`card p-5 ${alert.severity === 'high' ? 'border-cadence-danger' : 'border-cadence-warning'}`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className={`w-5 h-5 mt-0.5 shrink-0 ${alert.severity === 'high' ? 'text-cadence-danger' : 'text-cadence-warning'}`} />
              <div>
                <h2 className="text-sm font-medium text-cadence-text">{alert.title}</h2>
                <p className="mt-1 text-sm text-cadence-secondary">{alert.message}</p>
                <p className="mt-2 text-xs text-cadence-muted">{alert.recommendedAction}</p>
              </div>
            </div>
          </div>
        ))}

        <div className="card p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-sm font-medium text-cadence-text">Payment promise</h2>
              <p className="text-xs text-cadence-muted mt-1">Record the date the client says payment will be made.</p>
            </div>
            {paymentPromise?.status === 'pending' ? (
              <StatusBadge status={paymentPromise.status} />
            ) : (
              <button onClick={openPromiseModal} className="btn-secondary text-xs">Record promise</button>
            )}
          </div>
          {paymentPromise ? (
            <div className="rounded-lg bg-cadence-surface2 p-3 text-sm">
              <p className="text-cadence-text">Promised for <span className="font-mono">{formatDate(paymentPromise.promised_date)}</span></p>
              {paymentPromise.notes && <p className="mt-1 text-xs text-cadence-muted">{paymentPromise.notes}</p>}
            </div>
          ) : (
            <button onClick={openPromiseModal} className="btn-secondary text-sm">Record promise</button>
          )}
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
                <p className="text-xs text-cadence-secondary mt-1">Recommended tone: {getToneAnchor(toneLevelFromKey(analysis.recommended_tone as ToneKey)).label}</p>
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

        {analysis && (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="w-4 h-4 text-cadence-accent" />
              <h2 className="text-sm font-medium text-cadence-text">Tone</h2>
            </div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-sm text-cadence-secondary">{selectedTone.label} <span className="font-mono">{toneLevel}/100</span></p>
              <p className="text-xs text-cadence-muted">AI recommendation: {recommendedTone.label}</p>
            </div>
            <input
              aria-label="Email tone"
              className="w-full accent-cadence-accent"
              type="range"
              min="0"
              max="100"
              value={toneLevel}
              onChange={(event) => setToneLevel(normalizeToneLevel(Number(event.target.value)))}
            />
            <div className="mt-2 flex justify-between text-2xs text-cadence-muted">
              {TONE_ANCHORS.map((anchor) => <span key={anchor.level} title={anchor.label}>{anchor.level}</span>)}
            </div>
            <p className="mt-3 text-xs text-cadence-muted">
              {toneLevel === recommendedToneLevel ? 'Using Cadence’s AI recommendation.' : 'You have overridden Cadence’s AI recommendation for this invoice.'}
            </p>
            {selectedTone.key === 'modest' && <p className="mt-1 text-xs text-cadence-muted">Modest sits between Friendly and Formal at 40/100.</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => setToneLevel(recommendedToneLevel)} className="btn-secondary text-xs">Use AI recommendation</button>
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
              <div className="flex gap-2 items-center">
                <span className="text-xs text-cadence-muted">Tone: {draft.tone_level !== undefined ? getToneAnchor(draft.tone_level).label : draft.tone}</span>
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
            {emailThread.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-cadence-text mb-2">Email Thread History</h3>
                <div className="space-y-2">
                  {emailThread.map((email, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-cadence-surface border border-cadence-border text-sm">
                      <div className="flex justify-between text-xs text-cadence-muted mb-1">
                        <span className="font-medium text-cadence-text">{email.from}</span>
                        <span>{email.date}</span>
                      </div>
                      <p className="text-cadence-secondary whitespace-pre-wrap">{email.snippet || email.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {emailThread.length > 0 && (
              <div className="mb-4 flex items-center gap-2 p-2 bg-purple-500/5 border border-purple-500/10 rounded-lg">
                <div className="flex -space-x-2">
                  <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Legal" className="w-6 h-6 rounded-full border border-cadence-surface bg-cadence-surface" alt="Legal Agent" />
                  <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Comms" className="w-6 h-6 rounded-full border border-cadence-surface bg-cadence-surface" alt="Comms Agent" />
                  <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Coordinator" className="w-6 h-6 rounded-full border border-cadence-surface bg-cadence-surface" alt="Coordinator" />
                </div>
                <span className="text-xs text-purple-600/80 font-medium">Multi-Agent team analyzed thread context for this draft.</span>
              </div>
            )}
            <div className="rounded-xl border border-cadence-border bg-white shadow-sm overflow-hidden">
              <div className="bg-cadence-surface2/50 border-b border-cadence-border p-3 flex items-center gap-2">
                <div className="flex gap-1.5 mr-4">
                  <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
                </div>
                <span className="text-xs font-medium text-cadence-muted">New Message</span>
              </div>
              <div className="p-4 space-y-0 text-sm">
                <div className="flex border-b border-cadence-border/50 py-2">
                  <span className="text-cadence-muted w-16">To:</span>
                  <span className="text-cadence-text font-medium">{client.contact_email || '—'}</span>
                </div>
                <div className="flex border-b border-cadence-border/50 py-2">
                  <span className="text-cadence-muted w-16">Subject:</span>
                  <span className="text-cadence-text font-medium">{draft.subject}</span>
                </div>
                <div className="pt-4">
                  <p className="text-cadence-text whitespace-pre-wrap leading-relaxed font-body">{draft.body}</p>
                </div>
              </div>
            </div>
            {draft.preservation_warnings?.length > 0 && (
              <div className="mt-3 rounded-lg bg-cadence-warningSoft p-3">
                <p className="text-xs font-medium text-cadence-warning">Please verify these facts before sending:</p>
                <ul className="mt-1 list-disc pl-4 text-xs text-cadence-secondary">
                  {draft.preservation_warnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              </div>
            )}
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

      <Modal open={promiseModalOpen} onClose={() => setPromiseModalOpen(false)} title="Record payment promise">
        <div className="space-y-4">
          <div>
            <label className="label">Promised payment date</label>
            <input className="input" type="date" min={new Date().toISOString().slice(0, 10)} value={promiseDate} onChange={(e) => setPromiseDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <textarea className="input min-h-24" value={promiseNotes} onChange={(e) => setPromiseNotes(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setPromiseModalOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={savePaymentPromise} disabled={!promiseDate || savingPromise} className="btn-primary">
              {savingPromise && <Loader2 className="w-4 h-4 animate-spin" />} Record promise
            </button>
          </div>
        </div>
      </Modal>

      {showSentOverlay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm transition-all duration-300">
          <div className="animate-in zoom-in-50 duration-500 fade-in text-8xl font-black text-white drop-shadow-2xl font-display tracking-tighter mix-blend-overlay">
            SENT!
          </div>
        </div>
      )}
    </div>
  );
}
