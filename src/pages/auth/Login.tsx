import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { ArrowLeft, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    showToast('Welcome back.', 'success');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col bg-cadence-bg">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <Link to="/" className="flex items-center gap-2 mb-8 justify-center">
            <div className="w-9 h-9 rounded-lg bg-cadence-accent flex items-center justify-center">
              <span className="font-display font-bold text-white">C</span>
            </div>
            <span className="font-display font-semibold text-cadence-text text-xl">Cadence</span>
          </Link>
          <div className="card p-6">
            <h1 className="font-display text-xl font-semibold text-cadence-text mb-1">Log in</h1>
            <p className="text-sm text-cadence-muted mb-6">Welcome back to Cadence.</p>
            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-cadence-dangerSoft p-3 mb-4">
                <AlertCircle className="w-4 h-4 text-cadence-danger mt-0.5 shrink-0" />
                <p className="text-sm text-cadence-danger">{error}</p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cadence-muted" />
                  <input type="email" className="input pl-10" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cadence-muted" />
                  <input type="password" className="input pl-10" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log in'}
              </button>
            </form>
            <p className="text-sm text-cadence-muted text-center mt-4">
              No account? <Link to="/signup" className="text-cadence-accent hover:underline">Sign up</Link>
            </p>
          </div>
          <Link to="/" className="flex items-center justify-center gap-1 text-xs text-cadence-muted hover:text-cadence-secondary mt-6">
            <ArrowLeft className="w-3 h-3" /> Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
