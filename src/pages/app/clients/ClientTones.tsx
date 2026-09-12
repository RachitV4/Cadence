import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { logActivity } from '@/lib/utils';
import { getToneAnchor, normalizeToneLevel, TONE_ANCHORS, toneLevelFromKey } from '@/lib/toneSimulator';
import { LoadingState, Breadcrumbs } from '@/components/ui/Primitives';
import { TONES, type ToneKey } from '@/types';
import { Check, MessageSquare, Lightbulb, Copy, Edit2, Send, Loader2, Play } from 'lucide-react';
import type { Client, ClientTone, EmailDraft } from '@/types';

export function ClientTones() {
  const { clientId } = useParams();
  const { organization } = useAuth();
  const { showToast } = useToast();
  const [client, setClient] = useState<Client | null>(null);
  const [tone, setTone] = useState<ClientTone | null>(null);
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState(25);
  
  const [editingDraft, setEditingDraft] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');

  const [playgroundInput, setPlaygroundInput] = useState('');
  const [playgroundResult, setPlaygroundResult] = useState<{ risk_analysis: string; suggested_action: string; draft_response: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!clientId || !organization) return;
    const [clientRes, toneRes, draftsRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).maybeSingle(),
      supabase.from('client_tones').select('*').eq('client_id', clientId).maybeSingle(),
      supabase.from('email_drafts').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
    ]);
    setClient(clientRes.data as Client | null);
    setTone(toneRes.data as ClientTone | null);
    setDrafts((draftsRes.data as EmailDraft[]) || []);
    if (toneRes.data) {
      const savedTone = toneRes.data as ClientTone;
      setSelectedLevel(savedTone.selected_tone_level ?? toneLevelFromKey(savedTone.selected_tone as ToneKey));
    } else {
      setSelectedLevel(25);
    }
    setLoading(false);
  }, [clientId, organization]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveTone = async () => {
    if (!clientId || !organization || !client) return;
    try {
      const anchor = getToneAnchor(selectedLevel);
      const { error } = tone
        ? await supabase.from('client_tones').update({ selected_tone: anchor.key, selected_tone_level: selectedLevel }).eq('id', tone.id)
        : await supabase.from('client_tones').insert({ client_id: clientId, organization_id: organization.id, selected_tone: anchor.key, selected_tone_level: selectedLevel });
      if (error) throw error;
      await logActivity(organization.id, 'tone_selected', 'Tone selected', `Tone baseline set to ${anchor.label} (${selectedLevel}/100).`, { client_id: clientId });
      showToast('Tone saved.', 'success');
      await fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save tone.', 'error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard', 'success');
  };

  const sendDraft = async (draft: EmailDraft) => {
    try {
      const { error } = await supabase.functions.invoke('dispatch-email', {
        body: { draftId: draft.id }
      });
      if (error) throw error;
      showToast('Email sent successfully', 'success');
      await fetchData();
    } catch (err) {
      console.error('Failed to dispatch email:', err);
      showToast('Failed to send email', 'error');
    }
  };

  const saveEdit = async (draft: EmailDraft) => {
    await supabase.from('email_drafts').update({ body: editBody }).eq('id', draft.id);
    setEditingDraft(null);
    showToast('Draft updated', 'success');
    await fetchData();
  };

  const handlePlaygroundSubmit = async () => {
    if (!playgroundInput.trim()) return;
    setIsAnalyzing(true);
    setPlaygroundResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const toneName = TONES.find(t => t.key === selected)?.name || 'professional';
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-draft`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: playgroundInput, tone: toneName }),
      });
      if (!res.ok) throw new Error('Analysis failed');
      const data = await res.json();
      setPlaygroundResult(data);
    } catch (err) {
      showToast('Analysis failed', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const [isScraping, setIsScraping] = useState(false);
  const handleScrapeEmails = async () => {
    setIsScraping(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      // Call scrape-gmail edge function
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-gmail`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientEmail: client?.email || 'client@example.com',
          providerToken: session?.provider_token,
        }),
      });
      if (!res.ok) throw new Error('Scraping failed');
      const data = await res.json();
      if (data.emails && data.emails.length > 0) {
        const emailText = data.emails.map((e: any) => `From: ${e.from}\nDate: ${e.date}\nSubject: ${e.subject}\n\n${e.snippet}`).join('\n\n---\n\n');
        setPlaygroundInput((prev) => prev + (prev ? '\n\n' : '') + emailText);
        showToast('Gmail messages imported as context.', 'success');
      } else {
        showToast('No relevant emails found.', 'success');
      }
    } catch (err) {
      showToast('Failed to scrape Gmail', 'error');
    } finally {
      setIsScraping(false);
    }
  };

  if (loading) return <LoadingState />;
  if (!client) return <LoadingState />;

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: client.name, href: `/dashboard/client/${client.id}` }, { label: 'Tones' }]} />
      <h1 className="font-display text-2xl font-semibold text-cadence-text mb-2">Tones & Automations</h1>
      <p className="text-sm text-cadence-secondary mb-6">Choose how Cadence communicates with {client.name}. Cadence can also recommend a tone based on the relationship.</p>

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
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-sm font-medium text-cadence-text">{getToneAnchor(selectedLevel).label}</p>
            <p className="text-xs text-cadence-muted mt-1">Client baseline · {selectedLevel}/100</p>
          </div>
          <button onClick={saveTone} className="btn-primary text-xs">Save tone</button>
        </div>
        <input
          aria-label="Client communication tone"
          className="w-full accent-cadence-accent"
          type="range"
          min="0"
          max="100"
          value={selectedLevel}
          onChange={(event) => setSelectedLevel(normalizeToneLevel(Number(event.target.value)))}
        />
        <div className="mt-2 flex justify-between text-2xs text-cadence-muted">
          {TONE_ANCHORS.map((anchor) => <span key={anchor.level} title={anchor.label}>{anchor.level}</span>)}
        </div>
        {getToneAnchor(selectedLevel).key === 'modest' && <p className="mt-3 text-xs text-cadence-muted">Modest sits between Friendly and Formal at 40/100.</p>}
      </div>

      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Play className="w-5 h-5 text-cadence-accent" />
            <h2 className="font-display text-xl font-semibold text-cadence-text">Interactive Draft Playground</h2>
          </div>
          <button 
            onClick={handleScrapeEmails}
            disabled={isScraping}
            className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-2 border-cadence-border"
          >
            {isScraping ? <Loader2 className="w-3 h-3 animate-spin" /> : <svg className="w-3.5 h-3.5 text-cadence-muted" viewBox="0 0 24 24"><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/></svg>}
            Import Gmail Context
          </button>
        </div>
        <p className="text-sm text-cadence-secondary mb-4">
          Test out Cadence's AI. Paste an email or message from {client.name} below to analyze risk and generate a drafted response based on the selected tone.
        </p>
        <div className="card p-5">
          <textarea
            className="w-full text-sm leading-relaxed p-3 border border-cadence-border rounded-lg mb-3 bg-cadence-surface focus:ring-1 focus:ring-cadence-accent outline-none text-cadence-text resize-none"
            rows={4}
            placeholder="e.g. We're still waiting on the budget approval for the final milestone..."
            value={playgroundInput}
            onChange={(e) => setPlaygroundInput(e.target.value)}
          />
          <button
            onClick={handlePlaygroundSubmit}
            disabled={isAnalyzing || !playgroundInput.trim()}
            className="w-full bg-cadence-accent hover:bg-opacity-90 text-white font-medium rounded-lg text-sm px-4 py-2.5 text-center flex items-center justify-center disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Analyze & Draft'}
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
                <h4 className="text-xs font-mono uppercase tracking-wider text-cadence-accent mb-2">Drafted Response ({TONES.find(t => t.key === selected)?.name})</h4>
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
                      const { data: { session } } = await supabase.auth.getSession();
                      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-gmail`, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${session?.access_token}`,
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          to: client?.email || 'client@example.com',
                          subject: 'Following up',
                          body: playgroundResult.draft_response,
                          providerToken: session?.provider_token
                        }),
                      });
                      if (!res.ok) throw new Error('Failed to send');
                      showToast('Email sent securely via Gmail!', 'success');
                    } catch (e) {
                      showToast('Failed to send email. Check Gmail scopes.', 'error');
                    }
                  }} 
                  className="bg-cadence-accent text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-opacity-90 w-full justify-center"
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
            {drafts.map((draft) => (
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

                  <div className="flex gap-2 mt-4 pt-3 border-t border-cadence-border border-opacity-50">
                    {editingDraft === draft.id ? (
                      <>
                        <button onClick={() => setEditingDraft(null)} className="px-3 py-1.5 text-sm font-medium rounded-lg border border-cadence-border bg-cadence-surface text-cadence-secondary hover:text-cadence-text">Cancel</button>
                        <button onClick={() => saveEdit(draft)} className="px-3 py-1.5 text-sm font-medium rounded-lg bg-cadence-accent text-white hover:bg-cadence-accent/90">Save Edit</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => copyToClipboard(draft.body)} className="px-3 py-1.5 text-sm font-medium rounded-lg border border-cadence-border bg-cadence-surface text-cadence-secondary hover:text-cadence-text flex items-center gap-1.5">
                          <Copy className="w-3.5 h-3.5" /> Copy
                        </button>
                        <button onClick={() => { setEditingDraft(draft.id); setEditBody(draft.body); }} className="px-3 py-1.5 text-sm font-medium rounded-lg border border-cadence-border bg-cadence-surface text-cadence-secondary hover:text-cadence-text flex items-center gap-1.5">
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <div className="ml-auto flex items-center gap-2">
                          {draft.status === 'sent' && (
                            <span className="text-xs font-medium text-cadence-success flex items-center gap-1 bg-cadence-successSoft px-2 py-1 rounded-md">
                              <Check className="w-3.5 h-3.5" /> Sent
                            </span>
                          )}
                          <button 
                            onClick={() => sendDraft(draft)} 
                            disabled={draft.status === 'sent'}
                            className={`px-4 py-1.5 text-sm font-medium rounded-lg flex items-center gap-1.5 ${draft.status === 'sent' ? 'bg-cadence-surface2 text-cadence-muted cursor-not-allowed border border-cadence-border' : 'bg-cadence-accent text-white hover:bg-cadence-accent/90'}`}
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
          </div>
        )}
      </div>
    </div>
  );
}
