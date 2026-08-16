import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    desc: 'For trying Cadence with a single client.',
    features: ['1 client', 'Basic contract analysis', 'Manual email drafts', 'Contract term extraction', 'Activity timeline'],
    cta: 'Get started free',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$19–29',
    period: '/month',
    desc: 'For agencies managing multiple client relationships.',
    features: ['Unlimited clients', 'Full contract intelligence', 'Invoice analysis with contract context', 'AI advice engine', 'Tone recommendations', 'AI email drafting', 'Payment promise tracking', 'Priority processing'],
    cta: 'Start Pro trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: '$79+',
    period: '/month',
    desc: 'For teams that need collaboration and portfolio views.',
    features: ['Everything in Pro', 'Team collaboration', 'Portfolio overview', 'Advanced analytics', 'Custom integrations', 'Coming soon'],
    cta: 'Join waitlist',
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <div className="bg-cadence-bg">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12 text-center">
        <span className="text-xs font-mono uppercase tracking-wider text-cadence-muted">Pricing</span>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold text-cadence-text leading-tight mt-2">
          Simple pricing that scales with your client list.
        </h1>
        <p className="mt-5 text-lg text-cadence-secondary max-w-xl mx-auto">
          Start free. Upgrade when you need more clients and full AI capabilities.
        </p>
      </section>
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`card p-6 flex flex-col ${plan.highlighted ? 'ring-2 ring-cadence-accent border-cadence-accent' : ''}`}
            >
              {plan.highlighted && (
                <span className="badge-accent mb-3 self-start">Most popular</span>
              )}
              <h3 className="font-display text-xl font-semibold text-cadence-text">{plan.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-3xl font-semibold text-cadence-text">{plan.price}</span>
                <span className="text-sm text-cadence-muted">{plan.period}</span>
              </div>
              <p className="mt-2 text-sm text-cadence-secondary">{plan.desc}</p>
              <ul className="mt-5 space-y-2.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-cadence-success mt-0.5 shrink-0" />
                    <span className="text-cadence-secondary">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/signup"
                className={`mt-6 ${plan.highlighted ? 'btn-primary' : 'btn-secondary'} w-full`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-cadence-muted mt-6">
          No live billing during the beta period. Pricing shown for reference only.
        </p>
      </section>
    </div>
  );
}
