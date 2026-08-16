import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { logActivity } from '@/lib/utils';
import { Breadcrumbs } from '@/components/ui/Primitives';
import { Loader2, User as UserIcon, Mail, Repeat, StickyNote } from 'lucide-react';

export function CreateClient() {
  const navigate = useNavigate();
  const { organization } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isRepeat, setIsRepeat] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .insert({
        organization_id: organization.id,
        name,
        contact_email: email,
        is_repeat: isRepeat,
        notes,
      })
      .select()
      .single();

    if (error) {
      setLoading(false);
      showToast('Could not create client. Please try again.', 'error');
      return;
    }

    await logActivity(organization.id, 'client_created', 'Client created', `${name} added to your workspace.`, { client_id: data.id });
    setLoading(false);
    showToast('Client created.', 'success');
    navigate(`/dashboard/client/${data.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Create client' }]} />
      <h1 className="font-display text-2xl font-semibold text-cadence-text mb-2">Create client</h1>
      <p className="text-sm text-cadence-secondary mb-8">Add a client to start tracking contracts and invoices.</p>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div>
          <label className="label">
            <UserIcon className="w-4 h-4 inline mr-1.5 text-cadence-muted" />
            Client name
          </label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. TechStart Inc." required />
        </div>
        <div>
          <label className="label">
            <Mail className="w-4 h-4 inline mr-1.5 text-cadence-muted" />
            Contact email
          </label>
          <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="accounts@client.com" />
        </div>
        <div>
          <label className="label">
            <Repeat className="w-4 h-4 inline mr-1.5 text-cadence-muted" />
            Repeat client?
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setIsRepeat(true)} className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${isRepeat ? 'border-cadence-accent bg-cadence-accentSoft text-cadence-accent' : 'border-cadence-border text-cadence-secondary hover:bg-cadence-surface2'}`}>
              Yes, repeat
            </button>
            <button type="button" onClick={() => setIsRepeat(false)} className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${!isRepeat ? 'border-cadence-accent bg-cadence-accentSoft text-cadence-accent' : 'border-cadence-border text-cadence-secondary hover:bg-cadence-surface2'}`}>
              No, new
            </button>
          </div>
        </div>
        <div>
          <label className="label">
            <StickyNote className="w-4 h-4 inline mr-1.5 text-cadence-muted" />
            Anything we should know? <span className="text-cadence-muted font-normal">(optional)</span>
          </label>
          <textarea className="input min-h-[80px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. 2-year client. Detail-oriented. Usually pays after approval." />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate('/dashboard')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save client'}
          </button>
        </div>
      </form>
    </div>
  );
}
