import { useAuth } from '@/contexts/AuthContext';
import { Breadcrumbs } from '@/components/ui/Primitives';
import { User, Mail, Building2, Users } from 'lucide-react';

export function Profile() {
  const { user, profile, organization } = useAuth();
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Profile' }]} />
      <h1 className="font-display text-2xl font-semibold text-cadence-text mb-6">Profile</h1>
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-cadence-border">
          <div className="w-12 h-12 rounded-full bg-cadence-accentSoft flex items-center justify-center font-display font-semibold text-cadence-accent text-lg">
            {profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-sm font-medium text-cadence-text">{profile?.full_name || 'Your name'}</p>
            <p className="text-xs text-cadence-muted">{user?.email}</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-mono text-cadence-muted mb-1">NAME</p>
            <p className="text-sm text-cadence-text flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-cadence-muted" /> {profile?.full_name || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-mono text-cadence-muted mb-1">EMAIL</p>
            <p className="text-sm text-cadence-text flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-cadence-muted" /> {user?.email}</p>
          </div>
          <div>
            <p className="text-xs font-mono text-cadence-muted mb-1">AGENCY</p>
            <p className="text-sm text-cadence-text flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-cadence-muted" /> {organization?.name || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-mono text-cadence-muted mb-1">TEAM SIZE</p>
            <p className="text-sm text-cadence-text flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-cadence-muted" /> {organization?.team_size || '—'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
