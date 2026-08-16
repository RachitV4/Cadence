import { Link } from 'react-router-dom';
import {
  FileText,
  Mail,
  Shield,
  ArrowRight,
  Check,
  Users,
  Receipt,
  Lightbulb,
  Quote,
  MessageSquare,
  PenLine,
  Hand,
} from 'lucide-react';

export function Product() {
  return (
    <div className="bg-cadence-bg">
      {/* Header */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        <div className="max-w-3xl">
          <span className="text-xs font-mono uppercase tracking-wider text-cadence-muted">
            Product
          </span>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-cadence-text leading-tight mt-2">
            Eight capabilities that connect paperwork to payment.
          </h1>
          <p className="mt-5 text-lg text-cadence-secondary leading-relaxed">
            Cadence isn't a chatbot bolted onto a database. Each capability is built to close a
            specific gap between the contract you signed and the invoice you're chasing.
          </p>
        </div>
      </section>

      {/* Capabilities */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-20">
        {/* 01 Contract intelligence */}
        <CapabilityBlock
          number="01"
          icon={FileText}
          label="Contract intelligence"
          title="Cadence reads the contract so you don't have to remember it."
          description="Upload a signed contract and Cadence extracts the terms that matter — payment windows, late fee percentages, grace periods, renewal dates, and termination clauses. Every invoice is checked against the real terms, not your memory of them."
          mockup={
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono text-cadence-muted">
                <FileText className="w-3.5 h-3.5" /> MSA_Northwind_signed.pdf
              </div>
              <div className="rounded-lg border border-cadence-border bg-cadence-bg p-4 space-y-2.5">
                {[
                  ['Payment terms', 'Net 30'],
                  ['Late fee', '1.5% / month'],
                  ['Grace period', '7 days'],
                  ['Renewal', 'Annual, auto-renew'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-cadence-muted">{k}</span>
                    <span className="font-mono text-cadence-text">{v}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-cadence-success">
                <Check className="w-3.5 h-3.5" /> Terms extracted and linked to client
              </div>
            </div>
          }
        />

        {/* 02 Client memory */}
        <CapabilityBlock
          number="02"
          icon={Users}
          label="Client memory"
          title="Cadence remembers who the client is — not just what they owe."
          description="Every client has a profile that captures relationship history, communication preferences, past payment behavior, and contract context. When Cadence drafts an email, it knows whether this is a trusted partner of five years or a new account on its first invoice."
          reverse
          mockup={
            <div className="space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-cadence-border">
                <div className="w-10 h-10 rounded-full bg-cadence-accentSoft flex items-center justify-center font-display font-semibold text-cadence-accent">
                  NM
                </div>
                <div>
                  <p className="text-sm font-medium text-cadence-text">Northwind Media</p>
                  <p className="text-xs text-cadence-muted">Client since Mar 2021</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-cadence-surface2 p-2.5">
                  <p className="text-cadence-muted">Relationship</p>
                  <p className="font-mono text-cadence-text mt-0.5">3+ years</p>
                </div>
                <div className="rounded-lg bg-cadence-surface2 p-2.5">
                  <p className="text-cadence-muted">Payment behavior</p>
                  <p className="font-mono text-cadence-success mt-0.5">Usually on time</p>
                </div>
                <div className="rounded-lg bg-cadence-surface2 p-2.5">
                  <p className="text-cadence-muted">Active contracts</p>
                  <p className="font-mono text-cadence-text mt-0.5">1 MSA</p>
                </div>
                <div className="rounded-lg bg-cadence-surface2 p-2.5">
                  <p className="text-cadence-muted">Open invoices</p>
                  <p className="font-mono text-cadence-warning mt-0.5">1 overdue</p>
                </div>
              </div>
            </div>
          }
        />

        {/* 03 Invoice intelligence */}
        <CapabilityBlock
          number="03"
          icon={Receipt}
          label="Invoice intelligence"
          title="Cadence checks every invoice against the contract that governs it."
          description="Upload an invoice and Cadence matches it to the right client and contract, calculates the true due date including grace periods, flags discrepancies, and tells you exactly where it stands — before you write a single word."
          mockup={
            <div className="space-y-3">
              <div className="rounded-lg border border-cadence-border bg-cadence-bg p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-cadence-text">INV-2041</span>
                  <span className="badge-warning">Overdue · 12 days</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-cadence-muted">Amount</span>
                    <span className="font-mono text-cadence-text">$12,400.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cadence-muted">Due date</span>
                    <span className="font-mono text-cadence-text">Sep 15</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cadence-muted">Grace ends</span>
                    <span className="font-mono text-cadence-text">Sep 22</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cadence-muted">Late fee accrues</span>
                    <span className="font-mono text-cadence-danger">$186.00 / mo</span>
                  </div>
                </div>
              </div>
            </div>
          }
        />

        {/* 04 Advice engine */}
        <CapabilityBlock
          number="04"
          icon={Lightbulb}
          label="Advice engine"
          title="Cadence tells you what to do — and why."
          description="Instead of a blank draft, Cadence gives you a structured recommendation: the situation, the risk, the contractual basis, and the suggested action. You see the reasoning before you see the email."
          reverse
          mockup={
            <div className="space-y-3">
              <div className="rounded-lg bg-cadence-warningSoft p-4">
                <p className="text-xs font-mono text-cadence-warning mb-2">SITUATION</p>
                <p className="text-sm text-cadence-text leading-relaxed">
                  Invoice is 12 days overdue. The 7-day grace period has lapsed.
                </p>
              </div>
              <div className="rounded-lg bg-cadence-surface2 p-4">
                <p className="text-xs font-mono text-cadence-muted mb-2">RECOMMENDED ACTION</p>
                <p className="text-sm text-cadence-text leading-relaxed">
                  Send a first reminder. Reference clause 4.2 but do not apply the late fee yet —
                  the client has a strong payment history.
                </p>
              </div>
            </div>
          }
        />

        {/* 05 Evidence */}
        <CapabilityBlock
          number="05"
          icon={Quote}
          label="Evidence"
          title="Every recommendation cites its source."
          description="Cadence doesn't hallucinate terms. When it says a late fee applies, it links to the exact clause in the contract and the exact line on the invoice. You can verify the basis of every recommendation in one click."
          mockup={
            <div className="space-y-2">
              <div className="rounded-lg border border-cadence-border bg-cadence-bg p-3">
                <p className="text-sm text-cadence-text">
                  "Late fees of 1.5%/month apply after the grace period."
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="badge-accent">
                    <FileText className="w-3 h-3" /> Clause 4.2
                  </span>
                  <span className="badge-muted">MSA_Northwind.pdf</span>
                </div>
              </div>
              <div className="rounded-lg border border-cadence-border bg-cadence-bg p-3">
                <p className="text-sm text-cadence-text">
                  "Grace period of 7 days from due date."
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="badge-accent">
                    <FileText className="w-3 h-3" /> Clause 4.3
                  </span>
                  <span className="badge-muted">MSA_Northwind.pdf</span>
                </div>
              </div>
            </div>
          }
        />

        {/* 06 Tone intelligence */}
        <CapabilityBlock
          number="06"
          icon={MessageSquare}
          label="Tone intelligence"
          title="The right words for the right relationship."
          description="A five-year client gets a warm nudge. A new account gets a professional reminder. A repeat late-payer gets something firmer. Cadence recommends a tone based on the client's history and the situation — and you can adjust it."
          reverse
          mockup={
            <div className="space-y-2">
              <div className="rounded-lg border-2 border-cadence-accent bg-cadence-accentSoft/30 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-cadence-text">Professional · Warm</span>
                  <span className="badge-success">Recommended</span>
                </div>
                <p className="text-xs text-cadence-secondary">
                  For a long-standing client with a good track record.
                </p>
              </div>
              <div className="rounded-lg border border-cadence-border bg-cadence-bg p-3">
                <span className="text-sm font-medium text-cadence-text">Professional · Firm</span>
                <p className="text-xs text-cadence-muted mt-1">
                  For repeat late-payers or escalating situations.
                </p>
              </div>
              <div className="rounded-lg border border-cadence-border bg-cadence-bg p-3">
                <span className="text-sm font-medium text-cadence-text">Friendly · Casual</span>
                <p className="text-xs text-cadence-muted mt-1">
                  For close partners where a light touch works best.
                </p>
              </div>
            </div>
          }
        />

        {/* 07 Email drafting */}
        <CapabilityBlock
          number="07"
          icon={Mail}
          label="Email drafting"
          title="A complete email, ready for your review."
          description="Cadence writes the full email — subject line, greeting, body, and sign-off — using the contract context, the invoice details, the recommended tone, and the client's history. You read it, edit it if you want, and send it yourself."
          mockup={
            <div className="rounded-lg border border-cadence-border bg-cadence-bg p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono text-cadence-muted">
                <PenLine className="w-3.5 h-3.5" /> Draft email
              </div>
              <p className="text-xs font-mono text-cadence-muted">To: accounts@northwind.co</p>
              <p className="text-xs font-mono text-cadence-muted">
                Subject: Friendly reminder — Invoice INV-2041
              </p>
              <p className="text-sm text-cadence-secondary leading-relaxed pt-1">
                Hi Dana, I hope you're doing well. I'm following up on Invoice INV-2041 for the Q3
                campaign retainer, which was due on the 15th…
              </p>
              <div className="flex items-center gap-2 pt-2 border-t border-cadence-border">
                <span className="badge-accent">AI drafted</span>
                <span className="text-xs text-cadence-muted">Awaiting your review</span>
              </div>
            </div>
          }
        />

        {/* 08 Human control */}
        <CapabilityBlock
          number="08"
          icon={Hand}
          label="Human control"
          title="Cadence advises. You decide. You send."
          description="Cadence never sends anything on your behalf. It drafts, recommends, and organizes — but every email, every tone, and every decision passes through your review first. The AI is a co-pilot, not an autopilot."
          reverse
          mockup={
            <div className="space-y-3">
              <div className="rounded-lg border border-cadence-border bg-cadence-bg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-cadence-accent" />
                  <span className="text-sm font-medium text-cadence-text">Review checklist</span>
                </div>
                <ul className="space-y-2 text-sm">
                  {[
                    'Read the AI advice',
                    'Check the cited clauses',
                    'Review the recommended tone',
                    'Edit the email draft',
                    'Approve and send',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border-2 border-cadence-border" />
                      <span className="text-cadence-secondary">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary flex-1 text-xs">Edit draft</button>
                <button className="btn-primary flex-1 text-xs">Approve & send</button>
              </div>
            </div>
          }
        />
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="rounded-2xl border border-cadence-border bg-cadence-surface p-10 sm:p-14 text-center">
          <h2 className="font-display text-3xl font-semibold text-cadence-text">
            See it work step by step.
          </h2>
          <p className="mt-3 text-cadence-secondary max-w-lg mx-auto">
            Walk through the full flow — from creating a client to sending an email.
          </p>
          <Link to="/how-it-works" className="btn-primary mt-6 text-base px-6 py-3">
            See how it works
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function CapabilityBlock({
  number,
  icon: Icon,
  label,
  title,
  description,
  mockup,
  reverse,
}: {
  number: string;
  icon: typeof FileText;
  label: string;
  title: string;
  description: string;
  mockup: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
      <div className={reverse ? 'lg:order-2' : ''}>
        <div className="flex items-center gap-3 mb-4">
          <span className="font-mono text-sm text-cadence-accent">{number}</span>
          <div className="w-10 h-10 rounded-lg bg-cadence-accentSoft flex items-center justify-center">
            <Icon className="w-5 h-5 text-cadence-accent" />
          </div>
          <span className="text-xs font-mono uppercase tracking-wider text-cadence-muted">
            {label}
          </span>
        </div>
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-cadence-text leading-tight">
          {title}
        </h2>
        <p className="mt-4 text-cadence-secondary leading-relaxed">{description}</p>
      </div>
      <div className={reverse ? 'lg:order-1' : ''}>
        <div className="card p-6 shadow-sm">{mockup}</div>
      </div>
    </div>
  );
}
