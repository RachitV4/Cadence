import { Shield, Lock, Users, Eye, FileText, Server, CheckCircle2 } from 'lucide-react';

const PILLARS = [
  { icon: Lock, title: 'Supabase Auth', desc: 'Authentication is handled by Supabase Auth with secure session management. Passwords are hashed and never stored in plaintext.' },
  { icon: Shield, title: 'Row Level Security', desc: 'Every database table has RLS enabled. Policies enforce that users can only access data within their own organization.' },
  { icon: FileText, title: 'Private file storage', desc: 'Contract and invoice documents are stored in private Supabase Storage buckets. Access requires authentication and organization membership.' },
  { icon: Users, title: 'Organization isolation', desc: 'Each agency gets its own organization. Data is scoped by organization_id and enforced by RLS policies on every query.' },
  { icon: Server, title: 'Server-side AI processing', desc: 'AI calls happen in Supabase Edge Functions, not in the browser. API keys and service credentials never reach the client.' },
  { icon: Eye, title: 'Human approval', desc: 'Cadence never sends emails automatically. Every draft requires human review and an explicit send action.' },
  { icon: CheckCircle2, title: 'Auditability', desc: 'Every action — uploads, confirmations, advice generation, email drafts, sends — is logged in an activity timeline you can review.' },
];

export function SecurityPage() {
  return (
    <div className="bg-cadence-bg">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        <div className="max-w-3xl">
          <span className="text-xs font-mono uppercase tracking-wider text-cadence-muted">Security</span>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-cadence-text leading-tight mt-2">
            Your contracts and invoices stay private and isolated.
          </h1>
          <p className="mt-5 text-lg text-cadence-secondary">
            Cadence is built on Supabase with multi-tenant isolation at the database level. Here\'s how we protect your data.
          </p>
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid sm:grid-cols-2 gap-6">
          {PILLARS.map((p) => (
            <div key={p.title} className="card p-6">
              <div className="w-10 h-10 rounded-lg bg-cadence-accentSoft flex items-center justify-center mb-4">
                <p.icon className="w-5 h-5 text-cadence-accent" />
              </div>
              <h3 className="font-display font-semibold text-cadence-text mb-2">{p.title}</h3>
              <p className="text-sm text-cadence-secondary leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 rounded-xl bg-cadence-surface2 p-6">
          <p className="text-sm text-cadence-muted leading-relaxed">
            Cadence gives information, not legal advice. We do not claim compliance with specific regulatory frameworks.
            If you require SOC 2, GDPR, or other formal compliance attestations, please contact us before relying on Cadence for regulated workflows.
          </p>
        </div>
      </section>
    </div>
  );
}
