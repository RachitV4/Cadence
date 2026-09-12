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

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/spreadsheets',
        redirectTo: `${window.location.origin}/dashboard`
      }
    });
    if (error) {
      showToast(error.message, 'error');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-cadence-bg">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <Link to="/" className="flex flex-col items-center mb-6">
            <img src="/logo.png" alt="Cadence Logo" className="w-12 h-12 rounded-xl object-cover mb-4 shadow-sm" />
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
              
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-cadence-border"></div>
                <span className="flex-shrink-0 mx-4 text-cadence-muted text-xs uppercase tracking-wider font-semibold">Or</span>
                <div className="flex-grow border-t border-cadence-border"></div>
              </div>
              
              <button 
                type="button" 
                onClick={handleGoogleLogin} 
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-cadence-surface border border-cadence-border rounded-lg hover:bg-cadence-surface2 transition-colors text-cadence-text text-sm font-medium"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
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
