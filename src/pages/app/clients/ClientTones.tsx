import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { logActivity } from '@/lib/utils';
import { LoadingState, Breadcrumbs } from '@/components/ui/Primitives';
import { TONES, type ToneKey } from '@/types';
import { Check, MessageSquare, Lightbulb, Copy, Edit2, Send } from 'lucide-react';
import type { Client, ClientTone, EmailDraft } from '@/types';

export function ClientTones() {
  const { clientId } = useParams();
  const { organization } = useAuth();
  const { showToast } = useToast();
  const [client, setClient] = useState<Client | null>(null);
  const [tone, setTone] = useState<ClientTone | null>(null);
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ToneKey>('casual_friendly');
  
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
    if (toneRes.data) setSelected((toneRes.data as ClientTone).selected_tone as ToneKey);
    setLoading(false);
  }, [clientId, organization]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveTone = async (toneKey: ToneKey) => {
    if (!clientId || !organization || !client) return;
    setSelected(toneKey);
    if (tone) {
      await supabase.from('client_tones').update({ selected_tone: toneKey }).eq('id', tone.id);
    } else {
      await supabase.from('client_tones').insert({ client_id: clientId, organization_id: organization.id, selected_tone: toneKey });
    }
    await logActivity(organization.id, 'tone_selected', 'Tone selected', `Tone set to ${TONES.find((t) => t.key === toneKey)?.name}.`, { client_id: clientId });
    showToast('Tone saved.', 'success');
    await fetchData();
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

      <div className="space-y-3 mb-10">
        {TONES.map((toneDef) => (
          <button
            key={toneDef.key}
            onClick={() => saveTone(toneDef.key)}
            className={`w-full card p-4 text-left transition-all ${selected === toneDef.key ? 'ring-2 ring-cadence-accent border-cadence-accent' : 'hover:border-cadence-accent'}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selected === toneDef.key ? 'bg-cadence-accent' : 'bg-cadence-surface2'}`}>
                  <MessageSquare className={`w-5 h-5 ${selected === toneDef.key ? 'text-white' : 'text-cadence-muted'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-cadence-text">{toneDef.name}</p>
                  <p className="text-xs text-cadence-muted mt-1 leading-relaxed">{toneDef.description}</p>
                </div>
              </div>
              {selected === toneDef.key && (
                <div className="w-6 h-6 rounded-full bg-cadence-accent flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          </button>
        ))}
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
                  Drafted email <span className="normal-case text-cadence-secondary ml-1">· tone: {TONES.find(t => t.key === draft.tone)?.name || draft.tone}</span>
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
