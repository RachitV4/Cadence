import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export function About() {
  return (
    <div className="bg-cadence-bg">
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-20">
        <span className="text-xs font-mono uppercase tracking-wider text-cadence-muted">About</span>
        <h1 className="font-display text-4xl font-semibold text-cadence-text leading-tight mt-2 mb-6">
          Cadence was built to solve a real problem.
        </h1>
        <div className="space-y-4 text-cadence-secondary leading-relaxed">
          <p>
            Service businesses sign contracts, deliver work, send invoices, and then wait. When payment is late, someone has to open the contract, check the terms, figure out the tone, and write a follow-up email. It's repetitive, error-prone, and easy to avoid.
          </p>
          <p>
            Cadence connects the contract to the invoice to the follow-up. It remembers what was agreed, checks what's actually happening, and helps you decide what to do next — with evidence, not guesswork.
          </p>
          <p>
            The philosophy is simple: Cadence does the thinking. You keep the decision.
          </p>
        </div>
        <div className="mt-10">
          <Link to="/signup" className="btn-primary">
            Get started free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
