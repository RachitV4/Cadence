export function Privacy() {
  return (
    <div className="bg-cadence-bg">
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-20">
        <h1 className="font-display text-4xl font-semibold text-cadence-text mb-8">Privacy Policy</h1>
        <div className="space-y-6 text-sm text-cadence-secondary leading-relaxed">
          <div>
            <h2 className="font-display text-lg font-semibold text-cadence-text mb-2">Data we collect</h2>
            <p>Cadence collects your email address, agency name, and team size during onboarding. When you upload contracts and invoices, the file contents and extracted data are stored in your private workspace.</p>
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-cadence-text mb-2">How we use your data</h2>
            <p>Your data is used to provide contract analysis, invoice advice, and email drafting. AI processing happens server-side through secure edge functions. Your document contents are not used for model training.</p>
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-cadence-text mb-2">Data isolation</h2>
            <p>Each organization's data is isolated through database-level Row Level Security. Other users cannot access your contracts, invoices, or client data.</p>
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-cadence-text mb-2">Data retention</h2>
            <p>Your data is retained for as long as your account is active. You can request deletion of your data at any time.</p>
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-cadence-text mb-2">Contact</h2>
            <p>For privacy inquiries, please use the contact page.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
