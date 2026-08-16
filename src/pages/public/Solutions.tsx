import { Link } from 'react-router-dom';
import { Megaphone, Code2, Palette, Server, Clapperboard, Briefcase, ArrowRight } from 'lucide-react';

const CASES = [
  { icon: Megaphone, name: 'Marketing agencies', problem: 'Retainer invoices get delayed because nobody checks the MSA payment terms until something is already overdue.', solution: 'Cadence reads each MSA, remembers the exact payment window, and flags invoices the moment they cross the grace period — with the clause cited.' },
  { icon: Code2, name: 'Software agencies', problem: 'Milestone-based contracts tie payment to acceptance, but invoices go out without checking whether approval has happened.', solution: 'Cadence cross-references milestone clauses against invoice dates, so you know before sending whether the milestone condition is met.' },
  { icon: Palette, name: 'Design agencies', problem: 'Scope-change conversations happen over email, but nobody links them back to the contract scope clause.', solution: 'Cadence keeps the contract scope front and center so every invoice reminder can reference the agreed scope — no ambiguity.' },
  { icon: Server, name: 'IT providers', problem: 'Monthly service contracts auto-renew, but payment reminders are generic and ignore the renewal terms.', solution: 'Cadence tracks renewal dates alongside invoice cycles, so reminders can reference both the overdue invoice and the active agreement.' },
  { icon: Clapperboard, name: 'Creative studios', problem: 'Project-based work has custom payment schedules, but invoices are sent on a standard cadence that doesn\'t match the contract.', solution: 'Cadence extracts the actual payment schedule from the SOW and checks each invoice against the real milestones — not a guess.' },
  { icon: Briefcase, name: 'Professional services', problem: 'Consulting contracts have notice periods and termination clauses that affect when invoices should be sent and chased.', solution: 'Cadence remembers termination notice periods and contract end dates, so you never chase an invoice for a contract that\'s already ended.' },
];

export function Solutions() {
  return (
    <div className="bg-cadence-bg">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        <div className="max-w-3xl">
          <span className="text-xs font-mono uppercase tracking-wider text-cadence-muted">Solutions</span>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-cadence-text leading-tight mt-2">
            Built for the way service businesses actually work.
          </h1>
          <p className="mt-5 text-lg text-cadence-secondary">
            Each type of service business has its own payment friction. Cadence connects the contract to the invoice for each one.
          </p>
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 space-y-6">
        {CASES.map((c, i) => (
          <div key={i} className="grid lg:grid-cols-[auto_1fr_1fr] gap-6 card p-6">
            <div className="w-12 h-12 rounded-xl bg-cadence-accentSoft flex items-center justify-center">
              <c.icon className="w-6 h-6 text-cadence-accent" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-cadence-text mb-2">{c.name}</h3>
              <p className="text-sm text-cadence-muted leading-relaxed">
                <span className="font-medium text-cadence-secondary">What goes wrong: </span>
                {c.problem}
              </p>
            </div>
            <div>
              <p className="text-sm text-cadence-secondary leading-relaxed">
                <span className="font-medium text-cadence-text">How Cadence connects it: </span>
                {c.solution}
              </p>
            </div>
          </div>
        ))}
      </section>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="rounded-2xl border border-cadence-border bg-cadence-surface p-10 text-center">
          <h2 className="font-display text-2xl font-semibold text-cadence-text">See if Cadence fits your workflow.</h2>
          <Link to="/signup" className="btn-primary mt-6 text-base px-6 py-3">
            Get started free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
