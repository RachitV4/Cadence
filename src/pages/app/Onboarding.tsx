import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Loader2, Building2, Users } from 'lucide-react';

const TEAM_SIZES = ['1–5', '6–20', '21–50', '50+'];

export function Onboarding() {
  const navigate = useNavigate();
  const { user, refreshOrganization } = useAuth();
  const { showToast } = useToast();
  const [agencyName, setAgencyName] = useState('');
  const [teamSize, setTeamSize] = useState('1–5');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: agencyName, team_size: teamSize, created_by: user.id })
      .select()
      .single();
    if (orgError) {
      setLoading(false);
      showToast('Could not create your workspace. Please try again.', 'error');
      return;
    }
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({ organization_id: org.id, user_id: user.id, role: 'owner' });
    if (memberError) {
      setLoading(false);
      showToast('Could not set up your workspace. Please try again.', 'error');
      return;
    }
    await refreshOrganization();
    setLoading(false);
    showToast('Your workspace is ready.', 'success');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col bg-cadence-bg">
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-10 h-10 rounded-lg bg-cadence-accent flex items-center justify-center mx-auto mb-4">
              <span className="font-display font-bold text-white">C</span>
            </div>
            <h1 className="font-display text-2xl font-semibold text-cadence-text">Welcome to Cadence</h1>
            <p className="text-sm text-cadence-muted mt-2">Let's set up your workspace. This takes 30 seconds.</p>
          </div>
          <form onSubmit={handleSubmit} className="card p-6 space-y-5">
            <div>
              <label className="label">
                <Building2 className="w-4 h-4 inline mr-1.5 text-cadence-muted" />
                Agency name
              </label>
              <input className="input" value={agencyName} onChange={(e) => setAgencyName(e.target.value)} placeholder="e.g. Brightside Studio" required />
            </div>
            <div>
              <label className="label">
                <Users className="w-4 h-4 inline mr-1.5 text-cadence-muted" />
                Team size
              </label>
              <div className="grid grid-cols-4 gap-2">
                {TEAM_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setTeamSize(size)}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                      teamSize === size
                        ? 'border-cadence-accent bg-cadence-accentSoft text-cadence-accent'
                        : 'border-cadence-border text-cadence-secondary hover:bg-cadence-surface2'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create workspace'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
