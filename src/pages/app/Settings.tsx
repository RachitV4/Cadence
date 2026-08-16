import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { Breadcrumbs } from '@/components/ui/Primitives';
import { Bell, Shield, MessageSquare, User as UserIcon } from 'lucide-react';
import { useState } from 'react';

export function Settings() {
  const { user, profile, refreshOrganization } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState(profile?.full_name || '');

  const saveName = async () => {
    if (!user) return;
    await supabase.from('profiles').update({ full_name: name }).eq('id', user.id);
    await refreshOrganization();
    showToast('Settings saved.', 'success');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]} />
      <h1 className="font-display text-2xl font-semibold text-cadence-text mb-6">Settings</h1>

      <div className="space-y-6">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <UserIcon className="w-4 h-4 text-cadence-muted" />
            <h2 className="text-sm font-medium text-cadence-text">Profile</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="label">Full name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <button onClick={saveName} className="btn-primary">Save</button>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-cadence-muted" />
            <h2 className="text-sm font-medium text-cadence-text">Preferences</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="label">Default tone</label>
              <select className="input" defaultValue="casual_friendly">
                <option value="humble">Humble</option>
                <option value="casual_friendly">Casual / Friendly</option>
                <option value="formal">Formal</option>
                <option value="strict">Strict</option>
                <option value="modest">Modest</option>
              </select>
              <p className="text-xs text-cadence-muted mt-1">Used when no client-specific tone is set.</p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-cadence-muted" />
            <h2 className="text-sm font-medium text-cadence-text">Notifications</h2>
          </div>
          <div className="space-y-2">
            {['Invoice due reminders', 'Contract analysis complete', 'Payment promise missed'].map((item) => (
              <label key={item} className="flex items-center gap-3 text-sm text-cadence-secondary">
                <input type="checkbox" defaultChecked className="rounded border-cadence-border" />
                {item}
              </label>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-cadence-muted" />
            <h2 className="text-sm font-medium text-cadence-text">Security</h2>
          </div>
          <p className="text-sm text-cadence-muted">Your account is secured by Supabase Auth. Data is isolated by organization through Row Level Security.</p>
        </div>
      </div>
    </div>
  );
}
