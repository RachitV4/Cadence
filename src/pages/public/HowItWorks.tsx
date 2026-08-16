import { Link } from 'react-router-dom';
import { UserPlus, FileText, Brain, Receipt, Lightbulb, MessageSquare, Mail, Eye, Send, ArrowRight } from 'lucide-react';

const STEPS = [
  { icon: UserPlus, title: 'Create client', desc: 'Add a client with their email and a note about the relationship.' },
  { icon: FileText, title: 'Upload contract', desc: 'Drop in the signed PDF. Cadence reads every page.' },
  { icon: Brain, title: 'Cadence remembers terms', desc: 'Payment terms, late fees, milestones — all extracted and stored.' },
  { icon: Receipt, title: 'Upload invoice', desc: 'Add the invoice PDF or enter details manually.' },
  { icon: Lightbulb, title: 'Cadence checks context', desc: 'Contract terms + client history + invoice status are loaded together.' },
  { icon: Lightbulb, title: 'Cadence gives advice', desc: 'A structured recommendation with reasoning and evidence.' },
  { icon: MessageSquare, title: 'Cadence recommends tone', desc: 'Based on the relationship, payment behavior, and urgency.' },
  { icon: Mail, title: 'Cadence drafts email', desc: 'Subject, body, and tone — all context-aware and ready to review.' },
  { icon: Eye, title: 'Human reviews', desc: 'Read the draft, check the evidence, edit if needed.' },
  { icon: Send, title: 'Human sends', desc: 'You press send. Cadence logs the activity.' },
];

export function HowItWorks() {
  return (
    <div className="bg-cadence-bg">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        <div className="max-w-3xl">
          <span className="text-xs font-mono uppercase tracking-wider text-cadence-muted">How it works</span>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-cadence-text leading-tight mt-2">
            Ten steps from contract to sent email.
          </h1>
          <p className="mt-5 text-lg text-cadence-secondary">
            Cadence turns a static PDF and an unpaid invoice into a thoughtful, evidence-backed email — in minutes.
          </p>
        </div>
      </section>
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="space-y-2">
          {STEPS.map((step, i) => (
            <div key={i} className="flex gap-4 group">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-cadence-surface border border-cadence-border flex items-center justify-center group-hover:border-cadence-accent transition-colors">
                  <step.icon className="w-5 h-5 text-cadence-accent" />
                </div>
                {i < STEPS.length - 1 && <div className="w-px h-full min-h-[2rem] bg-cadence-border" />}
              </div>
              <div className="flex-1 pb-8">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-mono text-sm text-cadence-muted">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="font-display text-lg font-semibold text-cadence-text">{step.title}</h3>
                </div>
                <p className="text-sm text-cadence-secondary leading-relaxed ml-12">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="rounded-2xl border border-cadence-border bg-cadence-surface p-10 text-center">
          <h2 className="font-display text-2xl font-semibold text-cadence-text">Ready to try it?</h2>
          <Link to="/signup" className="btn-primary mt-6 text-base px-6 py-3">
            Get started free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
