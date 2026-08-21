import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export function Settings() {
  const { organization } = useAuth();
  const { showToast } = useToast();
  const [slackUrl, setSlackUrl] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('cadence_slack_webhook');
    if (saved) setSlackUrl(saved);
  }, []);

  const handleSaveSlack = () => {
    localStorage.setItem('cadence_slack_webhook', slackUrl);
    showToast('Slack webhook saved locally!', 'success');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-cadence-text tracking-tight">Organization Settings</h1>
        <p className="text-base text-cadence-secondary mt-1">Manage your integrations, API keys, and workspace preferences.</p>
      </div>

      <div className="space-y-6">
        {/* Slack Integration */}
        <div className="bg-cadence-surface border border-cadence-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-[#E01E5A]/10 rounded-lg">
              <svg className="w-6 h-6 text-[#E01E5A]" viewBox="0 0 24 24"><path fill="currentColor" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM9.013 5.042a2.528 2.528 0 0 1 2.522-2.52A2.528 2.528 0 0 1 14.056 5.042a2.527 2.527 0 0 1-2.521 2.52H9.013v-2.52zM9.013 6.313a2.527 2.527 0 0 1 2.522 2.521 2.527 2.527 0 0 1-2.522 2.521H2.7A2.528 2.528 0 0 1 .18 8.834A2.528 2.528 0 0 1 2.7 6.313h6.313zM18.958 8.835a2.528 2.528 0 0 1 2.52-2.523A2.528 2.528 0 0 1 24 8.835a2.527 2.527 0 0 1-2.522 2.52h-2.52v-2.52zM17.687 8.835a2.527 2.527 0 0 1-2.521 2.52 2.527 2.527 0 0 1-2.521-2.52V2.522A2.528 2.528 0 0 1 15.166 0a2.528 2.528 0 0 1 2.521 2.522v6.313zM14.987 18.958a2.528 2.528 0 0 1-2.522 2.52A2.528 2.528 0 0 1 9.944 18.958a2.527 2.527 0 0 1 2.521-2.52h2.522v2.52zM14.987 17.687a2.527 2.527 0 0 1-2.522-2.521 2.527 2.527 0 0 1 2.522-2.521H21.3a2.528 2.528 0 0 1 2.52 2.521 2.528 2.528 0 0 1-2.52 2.521h-6.313z"/></svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-cadence-text">Slack Integration</h2>
              <p className="text-sm text-cadence-secondary">Receive real-time alerts for high-risk invoices and daily autopilot scans.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={slackUrl}
              onChange={(e) => setSlackUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="flex-1 input-primary"
            />
            <button onClick={handleSaveSlack} className="btn-primary whitespace-nowrap">
              Save Webhook
            </button>
          </div>
        </div>

        {/* Other future integrations */}
        <div className="bg-cadence-surface border border-cadence-border rounded-xl p-6 shadow-sm opacity-50">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-[#635BFF]/10 rounded-lg">
              <svg className="w-6 h-6 text-[#635BFF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.64-2.25 1.64-1.74 0-2.4-.91-2.51-1.92H7.72c.12 1.9 1.49 2.99 3.18 3.31V19h2.32v-1.64c1.85-.35 2.98-1.5 2.98-3.05 0-2.27-1.89-2.82-3.89-3.33z"/></svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-cadence-text flex items-center gap-2">
                Stripe Payments 
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-cadence-accent/10 text-cadence-accent rounded-full">Coming in v5.0</span>
              </h2>
              <p className="text-sm text-cadence-secondary">Generate payment links directly in your invoice follow-up emails.</p>
            </div>
          </div>
          <button disabled className="btn-secondary w-full sm:w-auto">Connect Stripe</button>
        </div>
      </div>
    </div>
  );
}
