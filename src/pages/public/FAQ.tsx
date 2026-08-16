import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  { q: 'What does Cadence actually do?', a: 'Cadence reads your contracts, remembers the terms, and when you upload an invoice, it checks the invoice against the contract and your client history. It then gives you advice, recommends a tone, and drafts a ready-to-send email.' },
  { q: 'Does Cadence send emails automatically?', a: 'No. Cadence drafts emails but never sends them. You review every draft, edit if you want, and press send yourself.' },
  { q: 'Is Cadence a legal tool?', a: 'No. Cadence gives commercial information, not legal advice. Contract findings are labeled "worth a second look" and should be reviewed by a legal professional if you need legal guidance.' },
  { q: 'What file types are supported?', a: 'Currently Cadence supports PDF files for contracts and invoices. OCR fallback is available for scanned documents.' },
  { q: 'How does Cadence handle large contracts?', a: 'Cadence processes contracts page by page, tracking extraction status for each page. A 47-page contract will show 47 pages detected with per-page extraction results.' },
  { q: 'Is my data private?', a: 'Yes. Your data is isolated by organization through database-level Row Level Security. Contract and invoice files are stored in private storage buckets. Only authenticated members of your organization can access your data.' },
  { q: 'Can I use Cadence without a contract?', a: 'You can create clients and invoices without a contract, but the AI advice will be less specific. Cadence\'s value comes from connecting contract terms to invoice situations.' },
  { q: 'What are the five tones?', a: 'Humble, Casual / Friendly, Formal, Strict, and Modest. Cadence recommends one based on the client relationship, payment behavior, and urgency. You can override the recommendation.' },
  { q: 'Is there a free plan?', a: 'Yes. The free plan includes 1 client with basic contract analysis and manual drafts. The Pro plan at $19-29/month adds unlimited clients and full AI capabilities.' },
  { q: 'Does Cadence integrate with QuickBooks or Stripe?', a: 'Not yet. Integration adapters are designed for future support of Gmail, Outlook, Stripe, QuickBooks, Xero, and other tools, but these are not implemented in the current version.' },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="bg-cadence-bg">
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-20">
        <span className="text-xs font-mono uppercase tracking-wider text-cadence-muted">FAQ</span>
        <h1 className="font-display text-4xl font-semibold text-cadence-text leading-tight mt-2 mb-10">
          Frequently asked questions
        </h1>
        <div className="space-y-2">
          {FAQS.map((faq, i) => (
            <div key={i} className="card overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <span className="text-sm font-medium text-cadence-text">{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-cadence-muted transition-transform ${open === i ? 'rotate-180' : ''}`} />
              </button>
              {open === i && (
                <div className="px-5 pb-4 animate-fade-in">
                  <p className="text-sm text-cadence-secondary leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
