import { useState } from 'react';
import { Mail, MessageSquare } from 'lucide-react';

export function Contact() {
  const [submitted, setSubmitted] = useState(false);
  return (
    <div className="bg-cadence-bg">
      <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-20">
        <span className="text-xs font-mono uppercase tracking-wider text-cadence-muted">Contact</span>
        <h1 className="font-display text-4xl font-semibold text-cadence-text leading-tight mt-2 mb-6">
          Get in touch
        </h1>
        <p className="text-cadence-secondary mb-8">
          Questions, feedback, or partnership inquiries — we'd love to hear from you.
        </p>
        {submitted ? (
          <div className="card p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-cadence-successSoft flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-cadence-success" />
            </div>
            <p className="text-sm text-cadence-secondary">Thanks for reaching out. We'll get back to you soon.</p>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="card p-6 space-y-4">
            <div>
              <label className="label">Your name</label>
              <input className="input" required />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" required />
            </div>
            <div>
              <label className="label">Message</label>
              <textarea className="input min-h-[120px]" required />
            </div>
            <button type="submit" className="btn-primary w-full">
              <MessageSquare className="w-4 h-4" /> Send message
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
