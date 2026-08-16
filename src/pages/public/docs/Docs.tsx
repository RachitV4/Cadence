import { useParams, Link } from 'react-router-dom';
import { BookOpen, FileText, Receipt, Brain, MessageSquare, Shield, Plug } from 'lucide-react';

const TOPICS: Record<string, { title: string; sections: { heading: string; body: string[] }[] }> = {
  'getting-started': {
    title: 'Getting Started',
    sections: [
      { heading: 'Create your account', body: ['Sign up with your email. Cadence creates your profile and workspace automatically.', 'After signing up, you\'ll complete a short onboarding to set your agency name and team size.'] },
      { heading: 'Create your first client', body: ['Go to Create Client and enter the client name, contact email, and whether they\'re a repeat client.', 'Add notes about the relationship — Cadence uses these when generating advice and tone recommendations.'] },
      { heading: 'Upload a contract', body: ['Drag a signed contract PDF into the upload area. Cadence processes every page.', 'Extracted terms appear with source evidence. Confirm or edit each one.'] },
      { heading: 'Upload an invoice', body: ['Upload an invoice PDF or enter details manually. Cadence matches it to the contract.', 'After confirmation, Cadence generates advice, recommends a tone, and drafts an email.'] },
    ],
  },
  'contracts': {
    title: 'Contracts',
    sections: [
      { heading: 'How contracts are processed', body: ['Cadence reads the PDF page by page, extracting text with OCR fallback for scanned documents.', 'Each page\'s extraction status is tracked so you can see exactly what was read.'] },
      { heading: 'Extracted terms', body: ['Cadence extracts payment terms, contract value, late fees, milestones, deadlines, termination, liability, IP, renewal, and more.', 'Each term shows its source page, section, and confidence level.'] },
      { heading: 'Findings', body: ['Cadence flags clauses worth a second look — payment dependencies, long payment periods, scope ambiguity, and more.', 'Each finding includes the severity, source page, and evidence text.'] },
      { heading: 'Confirmation', body: ['You can confirm or edit any extracted term. Cadence uses confirmed terms when generating invoice advice.', 'Editing a term overrides the AI-extracted value and is used in all future analysis.'] },
    ],
  },
  'invoices': {
    title: 'Invoices',
    sections: [
      { heading: 'Uploading invoices', body: ['Upload a PDF invoice or enter the details manually. Cadence extracts the invoice number, amount, dates, and description.', 'You review and confirm the extracted values before Cadence generates advice.'] },
      { heading: 'Contract-aware analysis', body: ['Cadence loads the client\'s contract terms and payment history alongside the invoice.', 'This cross-source context is what makes the advice specific rather than generic.'] },
      { heading: 'Payment history', body: ['Each invoice tracks payment status. Past payment behavior informs future advice.', 'Cadence can tell the difference between a client who usually pays on time and one who doesn\'t.'] },
    ],
  },
  'ai-advice': {
    title: 'AI Advice',
    sections: [
      { heading: 'How advice is generated', body: ['Cadence combines contract terms, invoice details, client notes, repeat-client status, and payment history.', 'The AI produces a structured recommendation with a risk level, explanation, evidence, and suggested action.'] },
      { heading: 'Risk levels', body: ['Low risk: the situation is normal and a gentle reminder is appropriate.', 'Medium risk: some factor warrants attention — a grace period expiring, a first overdue invoice.', 'High risk: repeated missed payments or contractual dependencies that need resolution.'] },
      { heading: 'Evidence', body: ['Every recommendation cites its sources — contract clauses, past invoices, client notes.', 'You can click through to view the exact source text in the contract.'] },
    ],
  },
  'tones': {
    title: 'Tones',
    sections: [
      { heading: 'The five tones', body: ['Humble: soft and deferential, acknowledging the relationship.', 'Casual / Friendly: warm and conversational, like a normal check-in.', 'Formal: professional and structured, referencing terms and dates.', 'Strict: direct and firm, referencing obligations plainly.', 'Modest: measured and understated, stating facts without insistence.'] },
      { heading: 'How tone is recommended', body: ['Cadence considers the client relationship, payment behavior, invoice urgency, and contract formality.', 'A long-standing client with a good track record gets a warmer tone. A repeat late-payer gets a firmer one.'] },
    ],
  },
  'security': {
    title: 'Security',
    sections: [
      { heading: 'Data isolation', body: ['Every organization\'s data is isolated through Supabase Row Level Security policies.', 'Users can only access data belonging to organizations they are a member of.'] },
      { heading: 'Private storage', body: ['Contract and invoice files are stored in private Supabase Storage buckets.', 'Access requires authentication and organization membership.'] },
    ],
  },
  'integrations': {
    title: 'Integrations',
    sections: [
      { heading: 'Current integrations', body: ['Cadence processes documents server-side using AI through secure edge functions.', 'Email sending is demo-mode only — you review and send manually.'] },
      { heading: 'Planned integrations', body: ['Gmail and Outlook for sending emails directly.', 'Stripe, QuickBooks, and Xero for invoice synchronization.', 'Slack and HubSpot for notifications and CRM sync.'] },
    ],
  },
};

const SIDEBAR = [
  { key: 'getting-started', label: 'Getting Started', icon: BookOpen },
  { key: 'contracts', label: 'Contracts', icon: FileText },
  { key: 'invoices', label: 'Invoices', icon: Receipt },
  { key: 'ai-advice', label: 'AI Advice', icon: Brain },
  { key: 'tones', label: 'Tones', icon: MessageSquare },
  { key: 'security', label: 'Security', icon: Shield },
  { key: 'integrations', label: 'Integrations', icon: Plug },
];

export function Docs() {
  const { topic } = useParams();
  const currentKey = topic && TOPICS[topic] ? topic : 'getting-started';
  const doc = TOPICS[currentKey];
  const currentIndex = SIDEBAR.findIndex((s) => s.key === currentKey);

  return (
    <div className="bg-cadence-bg min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-[200px_1fr_160px] gap-8">
          <aside className="hidden lg:block">
            <h4 className="text-xs font-mono uppercase tracking-wider text-cadence-muted mb-3">Documentation</h4>
            <nav className="space-y-1">
              {SIDEBAR.map((item) => (
                <Link
                  key={item.key}
                  to={`/docs/${item.key}`}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    currentKey === item.key
                      ? 'bg-cadence-accentSoft text-cadence-accent font-medium'
                      : 'text-cadence-secondary hover:bg-cadence-surface2'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
          <article className="min-w-0">
            <h1 className="font-display text-3xl font-semibold text-cadence-text mb-6">{doc.title}</h1>
            <div className="space-y-8">
              {doc.sections.map((section, i) => (
                <section key={i}>
                  <h2 className="font-display text-lg font-semibold text-cadence-text mb-3">{section.heading}</h2>
                  {section.body.map((p, j) => (
                    <p key={j} className="text-sm text-cadence-secondary leading-relaxed mb-2">{p}</p>
                  ))}
                </section>
              ))}
            </div>
            <div className="mt-12 pt-6 border-t border-cadence-border flex justify-between">
              {currentIndex > 0 ? (
                <Link to={`/docs/${SIDEBAR[currentIndex - 1].key}`} className="text-sm text-cadence-secondary hover:text-cadence-text">
                  ← {SIDEBAR[currentIndex - 1].label}
                </Link>
              ) : <span />}
              {currentIndex < SIDEBAR.length - 1 ? (
                <Link to={`/docs/${SIDEBAR[currentIndex + 1].key}`} className="text-sm text-cadence-secondary hover:text-cadence-text">
                  {SIDEBAR[currentIndex + 1].label} →
                </Link>
              ) : <span />}
            </div>
          </article>
          <aside className="hidden lg:block">
            <h4 className="text-xs font-mono uppercase tracking-wider text-cadence-muted mb-3">On this page</h4>
            <nav className="space-y-1.5">
              {doc.sections.map((s, i) => (
                <a key={i} href={`#section-${i}`} className="block text-xs text-cadence-muted hover:text-cadence-secondary leading-relaxed">
                  {s.heading}
                </a>
              ))}
            </nav>
          </aside>
        </div>
      </div>
    </div>
  );
}
