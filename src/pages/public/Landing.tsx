import { Link } from 'react-router-dom';
import {
  FileText,
  Brain,
  Mail,
  Shield,
  ArrowRight,
  Check,
  X,
  Sparkles,
  MessageSquare,
  Scale,
  Clock,
  Layers,
  AlertTriangle,
} from 'lucide-react';

export function Landing() {
  return (
    <div className="bg-cadence-bg">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cadence-accentSoft/40 to-transparent pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 lg:pt-28 lg:pb-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cadence-border bg-cadence-surface px-3 py-1 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-cadence-accent" />
              <span className="text-xs font-mono text-cadence-secondary">
                AI commercial intelligence for service businesses
              </span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold text-cadence-text leading-[1.05] tracking-tight">
              Turn contracts into action — before revenue gets stuck.
            </h1>
            <p className="mt-6 text-lg text-cadence-secondary leading-relaxed max-w-2xl">
              Cadence remembers your contracts, invoices, payment terms, and client context — then
              tells you exactly what to do, in what tone, with a ready-to-send email. It connects the
              paperwork to the follow-up so nothing falls through the cracks.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Link to="/signup" className="btn-primary text-base px-6 py-3">
                Get started free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/how-it-works" className="btn-secondary text-base px-6 py-3">
                See how it works
              </Link>
            </div>
            <p className="mt-4 text-sm text-cadence-muted">
              Free plan available. No credit card required.
            </p>
          </div>
        </div>
      </section>

      {/* Product preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="text-center mb-10">
          <span className="text-xs font-mono uppercase tracking-wider text-cadence-muted">
            Product preview
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-cadence-text mt-2">
            One invoice. Full context. A ready reply.
          </h2>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Contract context */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-cadence-accentSoft flex items-center justify-center">
                <FileText className="w-4 h-4 text-cadence-accent" />
              </div>
              <div>
                <p className="text-xs font-mono text-cadence-muted">Contract context</p>
                <p className="text-sm font-medium text-cadence-text">Northwind Media — MSA</p>
              </div>
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-cadence-muted">Payment terms</dt>
                <dd className="font-mono text-cadence-text">Net 30</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-cadence-muted">Late fee</dt>
                <dd className="font-mono text-cadence-text">1.5% / month</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-cadence-muted">Grace period</dt>
                <dd className="font-mono text-cadence-text">7 days</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-cadence-muted">Client status</dt>
                <dd>
                  <span className="badge-success">3+ yrs</span>
                </dd>
              </div>
            </dl>
            <div className="mt-4 pt-4 border-t border-cadence-border">
              <p className="text-xs text-cadence-muted leading-relaxed">
                Cadence pulled these terms from the signed MSA and matched them to the overdue
                invoice automatically.
              </p>
            </div>
          </div>

          {/* AI advice */}
          <div className="card p-5 ring-1 ring-cadence-accentLine">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-cadence-accent flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-mono text-cadence-muted">AI advice</p>
                <p className="text-sm font-medium text-cadence-text">Invoice INV-2041</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="rounded-lg bg-cadence-warningSoft p-3">
                <p className="text-xs font-mono text-cadence-warning mb-1">OVERDUE · 12 DAYS</p>
                <p className="text-cadence-text text-sm leading-relaxed">
                  Invoice is 12 days past due. The contract's 7-day grace period has lapsed. Late
                  fees of 1.5%/month now apply under clause 4.2.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-cadence-warning mt-0.5 shrink-0" />
                <p className="text-xs text-cadence-secondary leading-relaxed">
                  This is a first reminder for a long-standing client. Preserve the relationship
                  while enforcing terms.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-cadence-success mt-0.5 shrink-0" />
                <p className="text-xs text-cadence-secondary leading-relaxed">
                  Reference late-fee clause 4.2. Do not apply the fee yet — mention it as a
                  contractual right.
                </p>
              </div>
            </div>
          </div>

          {/* Email draft */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-cadence-accentSoft flex items-center justify-center">
                <Mail className="w-4 h-4 text-cadence-accent" />
              </div>
              <div>
                <p className="text-xs font-mono text-cadence-muted">Recommended tone</p>
                <p className="text-sm font-medium text-cadence-text">Professional · Warm</p>
              </div>
            </div>
            <div className="rounded-lg border border-cadence-border bg-cadence-bg p-4 text-sm">
              <p className="text-xs font-mono text-cadence-muted mb-2">
                To: accounts@northwind.co
              </p>
              <p className="text-xs font-mono text-cadence-muted mb-3">
                Subject: Friendly reminder — Invoice INV-2041
              </p>
              <p className="text-cadence-secondary leading-relaxed text-sm">
                Hi Dana, I hope you're doing well. I'm following up on Invoice INV-2041 for the Q3
                campaign retainer, which was due on the 15th. I know things can get busy on your
                end — could you let me know if there's anything you need from me to process this? As
                a heads up, per our MSA, late fees may apply after the grace period. Happy to help
                however I can. Best, Jordan
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="badge-accent">
                <Sparkles className="w-3 h-3" /> AI drafted
              </span>
              <span className="text-xs font-mono text-cadence-muted">Awaits your approval</span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-cadence-muted mt-6 max-w-xl mx-auto">
          Cadence gives information, not legal advice. You review and send every email yourself.
        </p>
      </section>

      {/* Old workflow vs Cadence */}
      <section className="border-y border-cadence-border bg-cadence-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-12">
            <span className="text-xs font-mono uppercase tracking-wider text-cadence-muted">
              The difference
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-cadence-text mt-2">
              Old workflow vs Cadence
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Old workflow */}
            <div className="rounded-xl border border-cadence-border bg-cadence-bg p-6">
              <div className="flex items-center gap-2 mb-5">
                <Clock className="w-5 h-5 text-cadence-muted" />
                <h3 className="font-display text-lg font-semibold text-cadence-text">
                  The old workflow
                </h3>
              </div>
              <ul className="space-y-4">
                {[
                  { t: 'Open the contract', d: 'Find the PDF, scroll to payment terms, figure out what they say.' },
                  { t: 'Check the invoice', d: 'Open your accounting tool, find the invoice, check the due date.' },
                  { t: 'Guess the tone', d: 'Is this client friendly? Do they need a firm reminder? You decide from memory.' },
                  { t: 'Write the email', d: 'Stare at a blank draft. Try to sound professional. Rewrite it twice.' },
                  { t: 'Hope you sent it', d: 'No record of what you said, when, or whether it worked.' },
                ].map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="font-mono text-xs text-cadence-muted mt-0.5 w-5 shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-cadence-text">{step.t}</p>
                      <p className="text-sm text-cadence-muted mt-0.5">{step.d}</p>
                    </div>
                    <X className="w-4 h-4 text-cadence-muted mt-0.5 shrink-0" />
                  </li>
                ))}
              </ul>
            </div>

            {/* Cadence */}
            <div className="rounded-xl border border-cadence-accentLine bg-cadence-accentSoft/30 p-6">
              <div className="flex items-center gap-2 mb-5">
                <Sparkles className="w-5 h-5 text-cadence-accent" />
                <h3 className="font-display text-lg font-semibold text-cadence-text">
                  With Cadence
                </h3>
              </div>
              <ul className="space-y-4">
                {[
                  { t: 'Upload the contract once', d: 'Cadence reads and remembers every term — payment windows, late fees, grace periods.' },
                  { t: 'Upload the invoice', d: 'Cadence matches it to the contract and checks the due date against real terms.' },
                  { t: 'Get contextual advice', d: 'Cadence tells you the invoice is overdue, the grace period has lapsed, and which clause applies.' },
                  { t: 'Get the right tone', d: 'Cadence recommends a tone based on the client relationship — warm for long-term, firm for new.' },
                  { t: 'Review and send', d: 'A complete email draft is ready. You approve it, you send it, Cadence logs everything.' },
                ].map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="font-mono text-xs text-cadence-accent mt-0.5 w-5 shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-cadence-text">{step.t}</p>
                      <p className="text-sm text-cadence-secondary mt-0.5">{step.d}</p>
                    </div>
                    <Check className="w-4 h-4 text-cadence-accent mt-0.5 shrink-0" />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Differentiation */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <span className="text-xs font-mono uppercase tracking-wider text-cadence-muted">
            Why Cadence
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-cadence-text mt-2">
            Not just another tool in the stack
          </h2>
          <p className="mt-3 text-cadence-secondary max-w-xl mx-auto">
            Generic AI doesn't know your contracts. Accounting software doesn't write emails.
            Reminder systems don't read the fine print. Cadence does all three.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Generic AI */}
          <div className="rounded-xl border border-cadence-border bg-cadence-surface p-5">
            <div className="w-10 h-10 rounded-lg bg-cadence-surface2 flex items-center justify-center mb-4">
              <MessageSquare className="w-5 h-5 text-cadence-muted" />
            </div>
            <h3 className="font-display font-semibold text-cadence-text mb-2">Generic AI</h3>
            <p className="text-sm text-cadence-muted leading-relaxed">
              Writes a decent email — if you paste in every detail yourself. It doesn't know your
              contracts, your clients, or your payment terms.
            </p>
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-cadence-muted">
                <X className="w-3.5 h-3.5" /> No contract memory
              </div>
              <div className="flex items-center gap-2 text-xs text-cadence-muted">
                <X className="w-3.5 h-3.5" /> No client context
              </div>
              <div className="flex items-center gap-2 text-xs text-cadence-muted">
                <X className="w-3.5 h-3.5" /> Manual every time
              </div>
            </div>
          </div>

          {/* Accounting software */}
          <div className="rounded-xl border border-cadence-border bg-cadence-surface p-5">
            <div className="w-10 h-10 rounded-lg bg-cadence-surface2 flex items-center justify-center mb-4">
              <Scale className="w-5 h-5 text-cadence-muted" />
            </div>
            <h3 className="font-display font-semibold text-cadence-text mb-2">
              Accounting software
            </h3>
            <p className="text-sm text-cadence-muted leading-relaxed">
              Tracks invoices and sends automated reminders. But it can't read your contract terms
              or tailor the message to the relationship.
            </p>
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-cadence-muted">
                <X className="w-3.5 h-3.5" /> Doesn't read contracts
              </div>
              <div className="flex items-center gap-2 text-xs text-cadence-muted">
                <X className="w-3.5 h-3.5" /> Generic reminders only
              </div>
              <div className="flex items-center gap-2 text-xs text-cadence-muted">
                <X className="w-3.5 h-3.5" /> No tone intelligence
              </div>
            </div>
          </div>

          {/* Reminder systems */}
          <div className="rounded-xl border border-cadence-border bg-cadence-surface p-5">
            <div className="w-10 h-10 rounded-lg bg-cadence-surface2 flex items-center justify-center mb-4">
              <Clock className="w-5 h-5 text-cadence-muted" />
            </div>
            <h3 className="font-display font-semibold text-cadence-text mb-2">
              Reminder systems
            </h3>
            <p className="text-sm text-cadence-muted leading-relaxed">
              Tell you an invoice is late. That's it. No advice on what to do, no draft, no
              awareness of the client or the contract.
            </p>
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-cadence-muted">
                <X className="w-3.5 h-3.5" /> Alerts only
              </div>
              <div className="flex items-center gap-2 text-xs text-cadence-muted">
                <X className="w-3.5 h-3.5" /> No recommendations
              </div>
              <div className="flex items-center gap-2 text-xs text-cadence-muted">
                <X className="w-3.5 h-3.5" /> No email drafting
              </div>
            </div>
          </div>

          {/* Cadence */}
          <div className="rounded-xl border-2 border-cadence-accent bg-cadence-accentSoft/30 p-5">
            <div className="w-10 h-10 rounded-lg bg-cadence-accent flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-display font-semibold text-cadence-text mb-2">Cadence</h3>
            <p className="text-sm text-cadence-secondary leading-relaxed">
              Remembers your contracts, reads your invoices, understands your clients, and drafts
              the right email in the right tone — every time.
            </p>
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-cadence-text">
                <Check className="w-3.5 h-3.5 text-cadence-accent" /> Contract intelligence
              </div>
              <div className="flex items-center gap-2 text-xs text-cadence-text">
                <Check className="w-3.5 h-3.5 text-cadence-accent" /> Client memory
              </div>
              <div className="flex items-center gap-2 text-xs text-cadence-text">
                <Check className="w-3.5 h-3.5 text-cadence-accent" /> Tone-aware drafts
              </div>
              <div className="flex items-center gap-2 text-xs text-cadence-text">
                <Check className="w-3.5 h-3.5 text-cadence-accent" /> Human-controlled
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust band */}
      <section className="border-t border-cadence-border bg-cadence-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid sm:grid-cols-3 gap-8 text-center">
            <div>
              <div className="w-12 h-12 rounded-xl bg-cadence-accentSoft flex items-center justify-center mx-auto mb-3">
                <Shield className="w-6 h-6 text-cadence-accent" />
              </div>
              <h3 className="font-display font-semibold text-cadence-text mb-1">
                You stay in control
              </h3>
              <p className="text-sm text-cadence-muted">
                Cadence drafts. You review. You send. Nothing goes out without your approval.
              </p>
            </div>
            <div>
              <div className="w-12 h-12 rounded-xl bg-cadence-accentSoft flex items-center justify-center mx-auto mb-3">
                <Layers className="w-6 h-6 text-cadence-accent" />
              </div>
              <h3 className="font-display font-semibold text-cadence-text mb-1">
                Everything connected
              </h3>
              <p className="text-sm text-cadence-muted">
                Contracts, invoices, clients, and emails in one place — linked, not siloed.
              </p>
            </div>
            <div>
              <div className="w-12 h-12 rounded-xl bg-cadence-accentSoft flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-cadence-accent" />
              </div>
              <h3 className="font-display font-semibold text-cadence-text mb-1">
                Evidence-backed
              </h3>
              <p className="text-sm text-cadence-muted">
                Every recommendation cites the specific clause and invoice it came from.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="rounded-2xl bg-cadence-text text-white p-10 sm:p-14 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold">
            Stop chasing. Start closing.
          </h2>
          <p className="mt-4 text-white/70 max-w-xl mx-auto">
            Upload a contract, upload an invoice, and let Cadence handle the rest. Free to start.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white text-cadence-text px-6 py-3 text-base font-medium hover:bg-white/90 transition-all"
            >
              Get started free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center rounded-lg border border-white/20 text-white px-6 py-3 text-base font-medium hover:bg-white/10 transition-all"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
