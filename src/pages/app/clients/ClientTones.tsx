import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { logActivity } from '@/lib/utils';
import { getToneAnchor, toneLevelFromKey } from '@/lib/toneSimulator';
import { PageLoadingState, Breadcrumbs, ErrorState } from '@/components/ui/Primitives';
import { ToneSlider } from '@/components/ToneSlider';
import type { ToneKey } from '@/types';
import { Check, Lightbulb, Copy, Edit2, Send, Loader2, Play } from 'lucide-react';
import type { Client, ClientTone, EmailDraft } from '@/types';

interface GmailMessage {
  id?: string;
  from: string;
  date: string;
  subject: string;
  snippet: string;
}

interface GmailResponse {
  emails: GmailMessage[];
}

export function ClientTones() {
  const { clientId } = useParams();
  const { organization } = useAuth();
  const { showToast } = useToast();
  const [client, setClient] = useState<Client | null>(null);
  const [tone, setTone] = useState<ClientTone | null>(null);
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState(25);
  const [savedLevel, setSavedLevel] = useState(25);
  const [visibleDraftCount, setVisibleDraftCount] = useState(5);
  const [dataError, setDataError] = useState('');
  
  const [editingDraft, setEditingDraft] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');

  const [playgroundInput, setPlaygroundInput] = useState('');
  const [playgroundResult, setPlaygroundResult] = useState<{ risk_analysis: string; suggested_action: string; draft_response: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!clientId || !organization) return;
    setDataError('');
    const [clientRes, toneRes, draftsRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).maybeSingle(),
      supabase.from('client_tones').select('*').eq('client_id', clientId).maybeSingle(),
      supabase.from('email_drafts').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
    ]);
    const queryError = clientRes.error || toneRes.error || draftsRes.error;
    if (queryError) setDataError(queryError.message);
    setClient(clientRes.data as Client | null);
    setTone(toneRes.data as ClientTone | null);

    // Regeneration can leave historical rows with identical content; collapse those
    // in the inbox without mutating the persisted audit trail.
    const uniqueDrafts: EmailDraft[] = [];
    const seenBodies = new Set<string>();
    for (const d of ((draftsRes.data as EmailDraft[]) || [])) {
      if (!seenBodies.has(d.body)) {
        seenBodies.add(d.body);
        uniqueDrafts.push(d);
      }
    }
    setDrafts(uniqueDrafts);

    if (toneRes.data) {
      const savedTone = toneRes.data as ClientTone;
      const level = savedTone.selected_tone_level ?? toneLevelFromKey(savedTone.selected_tone as ToneKey);
      setSelectedLevel(level);
      setSavedLevel(level);
    } else {
      setSelectedLevel(25);
      setSavedLevel(25);
    }
    setLoading(false);
  }, [clientId, organization]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveTone = async () => {
    if (!clientId || !organization || !client) return;
    try {
      // This is the client's baseline preference. Individual invoice overrides are
      // persisted by InvoiceDetail and only influence the historical average.
      const anchor = getToneAnchor(selectedLevel);
      const { error } = tone
        ? await supabase.from('client_tones').update({ selected_tone: anchor.key, selected_tone_level: selectedLevel }).eq('id', tone.id)
        : await supabase.from('client_tones').insert({ client_id: clientId, organization_id: organization.id, selected_tone: anchor.key, selected_tone_level: selectedLevel });
      if (error) throw error;
      await logActivity(organization.id, 'tone_selected', 'Tone selected', `Tone baseline set to ${anchor.label} (${selectedLevel}/100).`, { client_id: clientId });
      showToast('Tone saved.', 'success');
      setSavedLevel(selectedLevel);
      await fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save tone.', 'error');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard.', 'success');
    } catch {
      showToast('Could not copy to the clipboard.', 'error');
    }
  };

  const sendDraft = async (draft: EmailDraft) => {
    try {
      if (!client?.contact_email) throw new Error('Add the client email address before sending.');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.provider_token) throw new Error('Gmail is not connected. Sign out and reconnect with Google.');
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-gmail`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: client.contact_email,
          subject: draft.subject,
          body: draft.body,
          providerToken: session.provider_token,
        }),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || `Gmail send failed (${response.status})`);
      }
      const { error: updateError } = await supabase.from('email_drafts').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', draft.id);
      if (updateError) throw updateError;
      showToast('Email sent via Gmail.', 'success');
      await fetchData();
    } catch (err) {
      console.error('Failed to dispatch email:', err);
      showToast(err instanceof Error ? err.message : 'Could not send email. Check the Gmail connection.', 'error');
    }
  };

  const saveEdit = async (draft: EmailDraft) => {
    const { error } = await supabase.from('email_drafts').update({ body: editBody }).eq('id', draft.id);
    if (error) {
      showToast(`Could not save the draft. ${error.message}`, 'error');
      return;
    }
    setEditingDraft(null);
    showToast('Draft updated.', 'success');
    await fetchData();
  };

  const handlePlaygroundSubmit = async () => {
    if (!playgroundInput.trim()) return;
    setIsAnalyzing(true);
    setPlaygroundResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const toneName = getToneAnchor(selectedLevel).label;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-draft`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: playgroundInput, tone: toneName }),
      });
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || `Analysis failed (${res.status})`);
      }
      const data = await res.json();
      setPlaygroundResult(data);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Analysis failed.', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const [isScraping, setIsScraping] = useState(false);
  const [realEmails, setRealEmails] = useState<GmailMessage[]>([]);
  const [gmailError, setGmailError] = useState('');
  const [lastGmailCheck, setLastGmailCheck] = useState<Date | null>(null);
  const lastEmailCountRef = useRef(0);
  const stopPollingRef = useRef(false);

  const fetchRealEmails = useCallback(async (silent = true) => {
    if (!client || stopPollingRef.current) return;
    if (!silent) setIsScraping(true);
    setGmailError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      // Supabase exposes Google's short-lived provider token only for OAuth sessions.
      if (!session?.provider_token) {
        stopPollingRef.current = true;
        setGmailError('Gmail is not connected. Sign out and reconnect with Google to grant email access.');
        return;
      }

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-gmail`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientEmail: client.contact_email,
          providerToken: session.provider_token,
        }),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || `Gmail sync failed (${res.status})`);
      }
      const data = await res.json() as GmailResponse;
      setLastGmailCheck(new Date());
      if (data.emails && data.emails.length > 0) {
        setRealEmails(data.emails);
        
        // Auto-draft if a NEW email arrives!
        if (data.emails.length > lastEmailCountRef.current) {
           if (lastEmailCountRef.current > 0) {
             showToast('New client reply detected.', 'success');
           } else if (!silent) {
             showToast('Gmail messages imported.', 'success');
           }
           lastEmailCountRef.current = data.emails.length;
           
           const emailText = data.emails.map((email) => `From: ${email.from}\nDate: ${email.date}\nSubject: ${email.subject}\n\n${email.snippet}`).join('\n\n---\n\n');
           setPlaygroundInput(emailText);
        }
      } else {
        if (!silent) showToast('No relevant emails found.', 'success');
      }
    } catch (err) {
      stopPollingRef.current = true;
      const message = err instanceof Error ? err.message : 'Gmail sync failed.';
      setGmailError(message);
      if (!silent) showToast(message, 'error');
    } finally {
      setIsScraping(false);
    }
  }, [client, showToast]);

  useEffect(() => {
    if (client) {
      fetchRealEmails(true);
      const interval = setInterval(() => {
        fetchRealEmails(true);
      }, 30_000);
      return () => clearInterval(interval);
    }
  }, [client, fetchRealEmails]);

  if (loading) return <PageLoadingState title="Loading AI Inbox" message="Preparing tone preferences and email context..." />;
  if (!client) return <ErrorState message={dataError ? `Could not load this client. ${dataError}` : 'Client not found.'} onRetry={fetchData} />;

  return (
    <div className="app-page max-w-4xl pb-10">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: client.name, href: `/dashboard/client/${client.id}` }, { label: 'AI Inbox & Tone' }]} />
      <h1 className="font-display text-2xl font-semibold text-cadence-text mb-2">AI Inbox & Tone</h1>
      <p className="text-sm text-cadence-secondary mb-6">Review client replies and choose how Cadence communicates with {client.name}.</p>

      {dataError && (
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-cadence-danger/20 bg-cadence-dangerSoft p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-cadence-danger">Some inbox data could not be refreshed.</p>
            <p className="mt-1 text-xs text-cadence-secondary">{dataError}</p>
          </div>
          <button onClick={fetchData} className="btn-secondary self-start sm:self-auto">Try again</button>
        </div>
      )}

      {client.is_repeat && (
        <div className="card p-4 mb-4 flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-cadence-accent shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-cadence-text">Cadence suggests: Casual / Friendly</p>
            <p className="text-xs text-cadence-muted mt-0.5">This is a repeat client. A warm, conversational tone usually works best unless there's a payment issue.</p>
          </div>
        </div>
      )}

      <div className="card p-5 mb-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-cadence-muted">Client tone baseline</p>
            {selectedLevel !== savedLevel && <p className="mt-1 text-xs font-medium text-cadence-warning">Unsaved change</p>}
          </div>
          <button onClick={saveTone} disabled={selectedLevel === savedLevel} className="btn-primary text-xs disabled:cursor-not-allowed disabled:opacity-50">
            {selectedLevel === savedLevel ? 'Tone saved' : 'Save tone'}
          </button>
        </div>
        <ToneSlider value={selectedLevel} onChange={setSelectedLevel} label="Client communication tone" />
      </div>

      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Play className="w-5 h-5 text-cadence-accent" />
            <h2 className="font-display text-xl font-semibold text-cadence-text">Interactive Draft Playground</h2>
          </div>
          <button 
            onClick={() => { stopPollingRef.current = false; void fetchRealEmails(false); }}
            disabled={isScraping}
            className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-2 border-cadence-border"
          >
            {isScraping ? <Loader2 className="w-3 h-3 animate-spin" /> : <svg className="w-3.5 h-3.5 text-cadence-muted" viewBox="0 0 24 24"><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/></svg>}
            Refresh Gmail
          </button>
        </div>
        <p className="text-sm text-cadence-secondary mb-4">
          Cadence checks the connected Gmail account for client replies and prepares a response in your selected tone for review.
        </p>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4 border-b border-cadence-border pb-4">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-cadence-accentSoft flex items-center justify-center text-cadence-accent font-bold">
                 {client.name.charAt(0)}
               </div>
               <div>
                 <p className="text-sm font-medium text-cadence-text">{client.name} <span className="text-cadence-muted text-xs font-normal">via Gmail</span></p>
                 <p className="text-xs text-cadence-muted">{client.contact_email || 'No client email address saved'}</p>
               </div>
             </div>
             <div className="flex items-center gap-2">
               <span className="relative flex w-2 h-2 shrink-0">
                  {!gmailError && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full w-2 h-2 ${gmailError ? 'bg-cadence-warning' : 'bg-green-500'}`}></span>
               </span>
               <span className="text-xs text-cadence-muted font-medium">{gmailError ? 'Connection needed' : 'Watching for replies'}</span>
             </div>
          </div>
          {gmailError && (
            <div className="mb-4 rounded-lg border border-cadence-danger/20 bg-cadence-dangerSoft p-3 text-sm text-cadence-danger">
              <p className="font-medium">Could not refresh Gmail</p>
              <p className="mt-1 text-xs text-cadence-secondary">{gmailError}</p>
              <button onClick={() => { stopPollingRef.current = false; void fetchRealEmails(false); }} className="mt-2 text-xs font-medium underline">Try again</button>
            </div>
          )}
          {lastGmailCheck && <p className="mb-3 text-xs text-cadence-muted">Last checked {lastGmailCheck.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
          <div className="mb-4 space-y-4">
             {!gmailError && realEmails.length === 0 && <p className="rounded-lg bg-cadence-surface2 p-4 text-sm text-cadence-muted">No matching client replies found yet.</p>}
             {realEmails.map((email, idx) => (
                <div key={email.id || idx} className="bg-cadence-surface2 rounded-2xl rounded-tl-sm p-4 border border-cadence-border max-w-[85%]">
                   <p className="text-xs font-medium text-cadence-text mb-1">{email.from} <span className="text-cadence-muted font-normal ml-2">{email.date}</span></p>
                   <p className="text-sm text-cadence-text font-medium mb-1">{email.subject}</p>
                   <p className="text-sm text-cadence-secondary whitespace-pre-wrap">{email.snippet}</p>
                </div>
             ))}
          </div>
          <div className="mb-4">
             <p className="text-xs font-mono uppercase text-cadence-muted mb-2">Client reply or email context</p>
             <textarea
               className="w-full text-sm leading-relaxed p-3 border border-cadence-border rounded-lg bg-cadence-surface focus:ring-1 focus:ring-cadence-accent outline-none text-cadence-text resize-none"
               rows={3}
               placeholder="e.g. We're still waiting on the budget approval for the final milestone, we'll pay next week..."
               value={playgroundInput}
               onChange={(e) => setPlaygroundInput(e.target.value)}
             />
          </div>
          <button
            onClick={handlePlaygroundSubmit}
            disabled={isAnalyzing || !playgroundInput.trim()}
            className="w-full bg-cadence-accent hover:bg-opacity-90 text-cadence-accentFg font-medium rounded-lg text-sm px-4 py-2.5 text-center flex items-center justify-center disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Analyze reply and draft'}
          </button>

          {playgroundResult && (
            <div className="mt-6 space-y-4 animate-fade-in border-t border-cadence-border pt-6">
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-cadence-danger mb-2">Risk Analysis</h4>
                <div className="p-3 bg-cadence-dangerSoft rounded-lg border border-cadence-danger/20 text-sm text-cadence-text">
                  {playgroundResult.risk_analysis}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-cadence-success mb-2">Suggested Action</h4>
                <div className="p-3 bg-cadence-successSoft rounded-lg border border-cadence-success/20 text-sm text-cadence-text">
                  {playgroundResult.suggested_action}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-cadence-accent mb-2">Drafted Response ({getToneAnchor(selectedLevel).label})</h4>
                <div className="p-4 bg-cadence-surface2 rounded-lg border border-cadence-border text-sm text-cadence-text whitespace-pre-wrap relative group mb-3">
                  {playgroundResult.draft_response}
                  <button 
                    onClick={() => copyToClipboard(playgroundResult.draft_response)}
                    className="absolute top-2 right-2 p-1.5 bg-cadence-surface border border-cadence-border rounded text-cadence-muted hover:text-cadence-text opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                <button 
                  onClick={async () => {
                    try {
                      if (!client.contact_email) {
                        showToast('Add a client email address before sending.', 'error');
                        return;
                      }
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session?.provider_token) throw new Error('Gmail is not connected. Sign out and reconnect with Google.');
                      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-gmail`, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${session?.access_token}`,
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          to: client.contact_email,
                          subject: 'Following up',
                          body: playgroundResult.draft_response,
                          providerToken: session?.provider_token
                        }),
                      });
                      if (!res.ok) {
                        const errorBody = await res.json().catch(() => ({}));
                        throw new Error(errorBody.error || `Gmail send failed (${res.status})`);
                      }
                      showToast('Email sent via Gmail.', 'success');
                    } catch (err) {
                      showToast(err instanceof Error ? err.message : 'Could not send email.', 'error');
                    }
                  }} 
                  className="bg-cadence-accent text-cadence-accentFg px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-opacity-90 w-full justify-center"
                >
                  <Send className="w-4 h-4" /> Send directly via Gmail
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="font-display text-xl font-semibold text-cadence-text mb-4">Email Drafts</h2>
        
        {drafts.length === 0 ? (
          <div className="card p-6 text-center text-cadence-secondary text-sm">
            No email drafts generated yet. Upload an invoice to get started.
          </div>
        ) : (
          <div className="space-y-6">
            {drafts.slice(0, visibleDraftCount).map((draft) => (
              <div key={draft.id}>
                <p className="text-xs font-mono uppercase tracking-widest text-cadence-muted mb-2 block">
                  Drafted email <span className="normal-case text-cadence-secondary ml-1">· tone: {getToneAnchor(draft.tone_level).label} · {draft.tone_level}/100</span>
                </p>
                <div className="bg-cadence-surface2 border border-cadence-border rounded-xl p-4">
                  <p className="text-sm mb-3 text-cadence-text">
                    <span className="text-cadence-muted mr-2">Subject:</span>
                    <span className="font-semibold">{draft.subject}</span>
                  </p>
                  
                  {editingDraft === draft.id ? (
                    <textarea 
                      className="w-full text-sm leading-relaxed p-3 border border-cadence-border rounded-lg mb-3 bg-cadence-surface focus:ring-1 focus:ring-cadence-accent outline-none text-cadence-text"
                      rows={8}
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                    />
                  ) : (
                    <div className="text-sm leading-relaxed whitespace-pre-wrap m-0 border-t border-cadence-border pt-3 text-cadence-text">
                      {draft.body}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-cadence-border border-opacity-50 pt-3">
                    {editingDraft === draft.id ? (
                      <>
                        <button onClick={() => setEditingDraft(null)} className="px-3 py-1.5 text-sm font-medium rounded-lg border border-cadence-border bg-cadence-surface text-cadence-secondary hover:text-cadence-text">Cancel</button>
                        <button onClick={() => saveEdit(draft)} className="px-3 py-1.5 text-sm font-medium rounded-lg bg-cadence-accent text-cadence-accentFg hover:bg-cadence-accent/90">Save edit</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => copyToClipboard(draft.body)} className="px-3 py-1.5 text-sm font-medium rounded-lg border border-cadence-border bg-cadence-surface text-cadence-secondary hover:text-cadence-text flex items-center gap-1.5">
                          <Copy className="w-3.5 h-3.5" /> Copy
                        </button>
                        <button onClick={() => { setEditingDraft(draft.id); setEditBody(draft.body); }} className="px-3 py-1.5 text-sm font-medium rounded-lg border border-cadence-border bg-cadence-surface text-cadence-secondary hover:text-cadence-text flex items-center gap-1.5">
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <div className="flex items-center gap-2 sm:ml-auto">
                          {draft.status === 'sent' && (
                            <span className="text-xs font-medium text-cadence-success flex items-center gap-1 bg-cadence-successSoft px-2 py-1 rounded-md">
                              <Check className="w-3.5 h-3.5" /> Sent
                            </span>
                          )}
                          <button 
                            onClick={() => sendDraft(draft)} 
                            disabled={draft.status === 'sent'}
                            className={`px-4 py-1.5 text-sm font-medium rounded-lg flex items-center gap-1.5 ${draft.status === 'sent' ? 'bg-cadence-surface2 text-cadence-muted cursor-not-allowed border border-cadence-border' : 'bg-cadence-accent text-cadence-accentFg hover:bg-cadence-accent/90'}`}
                          >
                            <Send className="w-3.5 h-3.5" /> {draft.status === 'sent' ? 'Resend' : 'Send'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {drafts.length > visibleDraftCount && (
              <button onClick={() => setVisibleDraftCount((count) => count + 5)} className="btn-secondary mx-auto block">Load more drafts</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
