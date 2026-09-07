import Link from 'next/link'

export const metadata = { title: 'Privacy Policy — MnemonicFlow' }

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-void text-ink-primary">
      <nav className="px-6 py-4 flex items-center gap-3 max-w-3xl mx-auto">
        <Link href="/login" className="text-xs text-ink-tertiary hover:text-neon-green transition-colors">
          ← Back
        </Link>
      </nav>
      <article className="max-w-3xl mx-auto px-6 pb-16 space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold font-display text-ink-primary">Privacy Policy</h1>
          <p className="text-xs text-ink-tertiary">Last updated: August 31, 2026</p>
        </header>

        <Section title="1. Introduction">
          This Privacy Policy explains how MnemonicFlow (&quot;we&quot;, &quot;our&quot;, &quot;the Service&quot;) collects, uses, stores, and protects your personal data when you use our educational platform.
        </Section>

        <Section title="2. Data We Collect">
          <p className="font-semibold text-ink-primary mb-2">Account Data</p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-ink-secondary">
            <li>Email address (used for authentication and communication)</li>
            <li>Full name (displayed in your profile)</li>
            <li>Password (hashed and stored securely by our authentication provider, Supabase — we never store passwords in plain text)</li>
            <li>Academic program, year, and college (for personalization)</li>
          </ul>
          <p className="font-semibold text-ink-primary mt-4 mb-2">Usage Data</p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-ink-secondary">
            <li>Study content you generate (mnemonics, flashcards, notes, quiz results)</li>
            <li>Subjects and topics you interact with</li>
            <li>Session timestamps and learning progress metrics</li>
          </ul>
          <p className="font-semibold text-ink-primary mt-4 mb-2">Technical Data</p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-ink-secondary">
            <li>Browser type, device information, and IP address (standard web server logs)</li>
            <li>Authentication session tokens (managed by Supabase)</li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Data">
          <ul className="list-disc pl-5 space-y-1 text-sm text-ink-secondary">
            <li>To provide and maintain your account and the Service</li>
            <li>To personalize your learning experience (subject recommendations, spaced repetition scheduling)</li>
            <li>To authenticate your identity and protect your account</li>
            <li>To communicate service updates, security alerts, and support messages</li>
            <li>To improve the Service based on aggregated, de-identified usage patterns (only with your explicit optional consent — see Section 6)</li>
          </ul>
        </Section>

        <Section title="4. Data Storage and Security">
          <p>Your data is stored in a Supabase-hosted PostgreSQL database. Supabase provides enterprise-grade security including encryption at rest, row-level security policies, and SOC 2 compliance.</p>
          <p className="mt-2">Authentication is handled by Supabase Auth, which uses industry-standard password hashing (bcrypt). We do not store passwords in plain text and cannot access your password.</p>
          <p className="mt-2">We implement Row Level Security (RLS) policies to ensure you can only access your own data.</p>
        </Section>

        <Section title="5. Data Sharing">
          <p>We do <strong>not</strong> sell your personal data to third parties.</p>
          <p className="mt-2">We share data only with:</p>
          <ul className="list-disc pl-5 mt-1 space-y-1 text-sm text-ink-secondary">
            <li><strong>Supabase</strong> — our database and authentication provider, which processes data under its own privacy and security policies</li>
            <li><strong>AI service providers</strong> — when you generate study content, your topic/subject input is sent to AI APIs to produce educational content. These providers process data according to their own policies</li>
          </ul>
        </Section>

        <Section title="6. Optional Research and Analytics Consent">
          <p>During registration, you may <strong>optionally</strong> consent to the use of your data in anonymized and aggregated form for platform improvement, learning pattern analysis, and educational research.</p>
          <p className="mt-2">If you provide this consent:</p>
          <ul className="list-disc pl-5 mt-1 space-y-1 text-sm text-ink-secondary">
            <li>Your personally identifiable information (name, email) will <strong>not</strong> be included in aggregated datasets</li>
            <li>Data is de-identified before inclusion in any analysis or research dataset</li>
            <li>De-identification involves removing direct identifiers and aggregating data to a level where individual re-identification is not reasonably feasible</li>
            <li>You may withdraw this consent at any time from your Settings</li>
          </ul>
          <p className="mt-2">If you do <strong>not</strong> provide this consent, your account functions normally with no limitations. Research consent is entirely optional.</p>
        </Section>

        <Section title="7. Your Rights">
          <p>You have the right to:</p>
          <ul className="list-disc pl-5 mt-1 space-y-1 text-sm text-ink-secondary">
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your account and associated data</li>
            <li>Withdraw optional research consent at any time</li>
            <li>Export your study data</li>
          </ul>
          <p className="mt-2">To exercise these rights, contact us through the MnemonicFlow platform or use the account management options in your Settings.</p>
        </Section>

        <Section title="8. Cookies and Local Storage">
          <p>We use:</p>
          <ul className="list-disc pl-5 mt-1 space-y-1 text-sm text-ink-secondary">
            <li><strong>Authentication cookies</strong> — managed by Supabase to maintain your login session</li>
            <li><strong>Local storage</strong> — to store your application preferences (settings, subject selections, flashcard data)</li>
          </ul>
          <p className="mt-2">These are necessary for the Service to function and cannot be disabled while using the platform.</p>
        </Section>

        <Section title="9. Data Retention">
          <p>Your account data is retained for as long as your account is active. If you delete your account, your personal data and study content will be removed from our active database within a reasonable period, subject to any legal retention obligations.</p>
          <p className="mt-2">De-identified, aggregated data used for research (with your consent) may be retained after account deletion, as it no longer identifies you.</p>
        </Section>

        <Section title="10. Children's Privacy">
          The Service is designed for medical and dental students who are typically 18 years or older. We do not knowingly collect data from children under 16. If you believe a child has provided us with personal data, please contact us.
        </Section>

        <Section title="11. Changes to This Policy">
          We may update this Privacy Policy. Material changes will be communicated through the Service or by email. Continued use after changes constitutes acceptance.
        </Section>

        <Section title="12. Contact">
          For privacy-related questions or requests, contact us through the MnemonicFlow platform.
        </Section>
      </article>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-bold font-display text-ink-primary">{title}</h2>
      <div className="text-sm text-ink-secondary leading-relaxed">{children}</div>
    </section>
  )
}
