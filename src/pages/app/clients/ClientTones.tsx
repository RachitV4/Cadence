import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { logActivity } from '@/lib/utils';
import { getToneAnchor, normalizeToneLevel, TONE_ANCHORS, toneLevelFromKey } from '@/lib/toneSimulator';
import { LoadingState, Breadcrumbs } from '@/components/ui/Primitives';
import type { ToneKey } from '@/types';
import { Check, Lightbulb, Copy, Edit2, Send } from 'lucide-react';
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
