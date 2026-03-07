import { LegalLayout } from "./layout";

export function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Privacy Policy" effectiveDate="March 7, 2026">
      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">1. Introduction</h2>
        <p className="mb-4">
          Brain Cloud ("we," "us," "our") is a personal project operated by an individual developer, not a company.
          This Privacy Policy describes how we collect, use, and protect your information when you use Brain Cloud.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">2. Information We Collect</h2>

        <h3 className="text-lg font-medium mt-6 mb-3">2.1 OAuth Data</h3>
        <p className="mb-4">
          When you sign in via GitHub or Google, we receive and store your name, email address, avatar URL,
          and provider-specific user ID. We store OAuth tokens server-side. API keys are hashed using SHA-256
          before storage.
        </p>

        <h3 className="text-lg font-medium mt-6 mb-3">2.2 Session Data</h3>
        <p className="mb-4">
          We collect your IP address and User-Agent string for session management and security purposes.
        </p>

        <h3 className="text-lg font-medium mt-6 mb-3">2.3 User-Generated Content</h3>
        <p className="mb-4">
          Brain Cloud stores the content you create through the service, including: thoughts, decisions, sessions,
          sentiment data, DX events, and conversation logs. This data is provided by you directly or through
          MCP tool integrations in your development environment.
        </p>

        <h3 className="text-lg font-medium mt-6 mb-3">2.4 AI Processing</h3>
        <p className="mb-4">
          Some features (daily digest, coaching insights) use Workers AI with Meta Llama 3.1 to generate
          summaries and recommendations from your data. All AI processing occurs on Cloudflare infrastructure.
          Your data is not sent to any third-party AI provider.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">3. Cookies and Tracking</h2>
        <p className="mb-4">
          We use HTTP-only secure session cookies exclusively for authentication. Access tokens expire after
          15 minutes; refresh tokens expire after 7 days. We do not use third-party cookies, analytics trackers,
          advertising pixels, or any cross-site tracking mechanisms.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">4. Data Storage</h2>
        <p className="mb-4">
          Your data is stored in Cloudflare D1 (SQLite-based), logically isolated per user. All data is
          associated with your user account and not shared across users.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">5. What We Don't Do</h2>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>We do not sell your data to anyone.</li>
          <li>We do not share your data with third parties.</li>
          <li>We do not use ad networks or advertising of any kind.</li>
          <li>We do not engage in cross-site tracking.</li>
          <li>We do not use analytics services that track you across websites.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">6. Data Retention</h2>
        <p className="mb-4">
          Your data is retained for the duration of your active account. You may request deletion of your
          data at any time by contacting us.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">7. Your Rights</h2>
        <p className="mb-4">
          You can access your data at any time through the Brain Cloud API. To request deletion of your
          account and all associated data, contact us at the email below.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">8. Changes to This Policy</h2>
        <p className="mb-4">
          We may update this Privacy Policy from time to time. Changes will be reflected by updating the
          effective date at the top of this page.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">9. Contact</h2>
        <p className="mb-4">
          For questions or requests regarding your data, contact us at{" "}
          <a href="mailto:hello@brain-ai.dev" className="text-primary hover:underline">
            hello@brain-ai.dev
          </a>.
        </p>
      </section>
    </LegalLayout>
  );
}
