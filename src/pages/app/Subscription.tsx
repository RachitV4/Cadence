import { Breadcrumbs } from '@/components/ui/Primitives';
import { Check } from 'lucide-react';

const PLANS = [
  { name: 'Free', price: '$0', features: ['1 client', 'Basic contract analysis', 'Manual drafts'], current: true },
  { name: 'Pro', price: '$19–29', features: ['Unlimited clients', 'Full AI capabilities', 'Tone recommendations', 'Email drafting'], current: false },
  { name: 'Enterprise', price: '$79+', features: ['Team collaboration', 'Portfolio views', 'Advanced analytics', 'Coming soon'], current: false },
];

export function Subscription() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Subscription' }]} />
      <h1 className="font-display text-2xl font-semibold text-cadence-text mb-2">Subscription</h1>
      <p className="text-sm text-cadence-secondary mb-6">You're on the Free plan. No billing is active during the beta.</p>
      <div className="grid sm:grid-cols-3 gap-4">
        {PLANS.map((plan) => (
          <div key={plan.name} className={`card p-5 ${plan.current ? 'ring-2 ring-cadence-accent' : ''}`}>
            {plan.current && <span className="badge-accent mb-3">Current plan</span>}
            <h3 className="font-display text-lg font-semibold text-cadence-text">{plan.name}</h3>
            <p className="font-display text-2xl font-semibold text-cadence-text mt-2">{plan.price}<span className="text-sm font-normal text-cadence-muted">/mo</span></p>
            <ul className="mt-4 space-y-2">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-cadence-success mt-0.5 shrink-0" />
                  <span className="text-cadence-secondary">{f}</span>
                </li>
              ))}
            </ul>
            {!plan.current && <button disabled className="btn-secondary w-full mt-4 opacity-50 cursor-not-allowed">Upgrade</button>}
          </div>
        ))}
      </div>
      <p className="text-xs text-cadence-muted mt-4 text-center">No live billing during beta. Plans shown for reference.</p>
    </div>
  );
}
