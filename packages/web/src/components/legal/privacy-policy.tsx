import { LegalLayout } from "./layout";

export function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Privacy Policy" effectiveDate="March 8, 2026">
      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">1. Introduction</h2>
        <p className="mb-4">
          Brain Cloud ("we," "us," "our") operates the Brain Cloud service, a SaaS platform that gives
          AI assistants persistent memory via the Model Context Protocol (MCP). This Privacy Policy
          describes how we collect, use, store, and protect your information when you use Brain Cloud
          at brain-ai.dev and through MCP integrations.
        </p>
        <p className="mb-4">
          By using Brain Cloud, you consent to the data practices described in this policy. If you do
          not agree, please do not use the service.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">2. Information We Collect</h2>

        <h3 className="text-lg font-medium mt-6 mb-3">2.1 Account Information</h3>
        <p className="mb-4">
          When you sign in via GitHub or Google OAuth, we receive and store your name, email address,
          avatar URL, and provider-specific user ID. We do not access your repositories, contacts, or
          other data from these providers beyond what is needed for authentication.
        </p>

        <h3 className="text-lg font-medium mt-6 mb-3">2.2 User-Generated Content</h3>
        <p className="mb-4">
          Brain Cloud stores the content you create through the service, including:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Thoughts and notes</li>
          <li>Decisions (with options, rationale, and outcomes)</li>
          <li>Sessions (goals, accomplishments, blockers)</li>
          <li>Sentiment records</li>
          <li>Handoffs between projects</li>
          <li>Conversation logs (prompt text and response summaries)</li>
          <li>DX events (command execution metadata)</li>
        </ul>
        <p className="mb-4">
          This data is provided by you directly through the web dashboard or through MCP tool calls
          from AI assistants (such as Claude) running in your development environment.
        </p>

        <h3 className="text-lg font-medium mt-6 mb-3">2.3 API Keys</h3>
        <p className="mb-4">
          When you create an API key, the key value is shown to you once and then hashed using bcrypt
          before storage. We cannot retrieve your original API key after creation. Only the bcrypt hash
          is stored in our database.
        </p>

        <h3 className="text-lg font-medium mt-6 mb-3">2.4 Analytics Data</h3>
        <p className="mb-4">
          We collect minimal, privacy-preserving analytics. Your IP address is hashed using SHA-256
          combined with a daily-rotating date key before storage. We never store raw IP addresses.
          Country information is derived from Cloudflare request headers at the edge, not from IP
          geolocation lookups. We do not use tracking cookies, advertising pixels, or any cross-site
          tracking mechanisms.
        </p>

        <h3 className="text-lg font-medium mt-6 mb-3">2.5 AI Processing</h3>
        <p className="mb-4">
          Some features (daily digest, coaching insights, "Ask Brain") use Cloudflare Workers AI to
          generate summaries and recommendations from your data. All AI processing occurs on Cloudflare
          infrastructure. Your data is not sent to any third-party AI provider for these features.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">3. Vector Embeddings</h2>
        <p className="mb-4">
          To power semantic search, Brain Cloud converts your text content into vector embeddings using
          the bge-base-en-v1.5 model (768 dimensions) via Cloudflare Workers AI. These embeddings are
          mathematical representations of your text stored in Cloudflare Vectorize. Embeddings cannot
          be reversed to reconstruct the original text. The original text is stored separately in the
          database and is deleted when you delete your content or account.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">4. Cookies</h2>
        <p className="mb-4">
          Brain Cloud uses only two cookies, both strictly for authentication:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>
            <strong>brain_access</strong> — A JSON Web Token (JWT) for authenticating API requests.
            Expires after 15 minutes. Attributes: httpOnly, secure, SameSite=Lax.
          </li>
          <li>
            <strong>brain_refresh</strong> — A refresh token for obtaining new access tokens.
            Expires after 7 days. Attributes: httpOnly, secure, SameSite=Lax.
          </li>
        </ul>
        <p className="mb-4">
          We do not use cookies for tracking, analytics, or advertising purposes.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">5. How We Use Your Information</h2>
        <p className="mb-4">We use your information to:</p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Provide, maintain, and improve the Brain Cloud service</li>
          <li>Authenticate your identity and manage your account</li>
          <li>Generate AI-powered insights from your data (coaching, digests, search)</li>
          <li>Send transactional emails (account verification, password resets)</li>
          <li>Monitor and prevent abuse of the service</li>
        </ul>
        <p className="mb-4">
          We do not sell your data. We do not use your data for advertising. We do not share your data
          with third parties except as described in the Sub-processors section below.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">6. Sub-processors</h2>
        <p className="mb-4">
          Brain Cloud uses the following third-party services to operate:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>
            <strong>Cloudflare</strong> — Hosting (Workers), database (D1), AI inference (Workers AI),
            vector search (Vectorize), and CDN. All data processing and storage occurs on Cloudflare
            infrastructure. Cloudflare encrypts data at rest and all traffic is served over HTTPS.
          </li>
          <li>
            <strong>MailChannels</strong> — Transactional email delivery. MailChannels receives only
            the recipient email address and message content necessary to deliver emails such as account
            notifications.
          </li>
        </ul>
        <p className="mb-4">
          We do not use any additional analytics, advertising, or data processing services.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">7. Data Storage and Security</h2>
        <p className="mb-4">
          Your data is stored in Cloudflare D1 (SQLite-based), logically isolated per user account.
          All data is encrypted at rest by Cloudflare and all traffic between your browser or MCP
          client and our servers is encrypted in transit via HTTPS/TLS.
        </p>
        <p className="mb-4">
          API keys are hashed with bcrypt before storage. OAuth tokens are stored server-side and
          never exposed to the client. Authentication cookies are httpOnly and secure, preventing
          access from client-side JavaScript.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">8. Data Residency &amp; Infrastructure</h2>
        <p className="mb-4">
          All Brain Cloud data is processed and stored on Cloudflare's global network. Cloudflare
          Workers execute at the edge location nearest to your request, meaning your API calls are
          handled by the closest available data center. The primary database (Cloudflare D1) and
          vector index (Cloudflare Vectorize) are located in Cloudflare's automatically managed
          regions — currently defaulting to North America. Cloudflare may replicate read replicas
          to additional regions for performance.
        </p>
        <p className="mb-4">
          Self-hosted deployments give you full control over data residency: you choose the
          Cloudflare account and D1 database location when you run the installer. No data from
          self-hosted instances is sent to or accessible by the Brain Cloud managed service.
        </p>
        <p className="mb-4">
          AI inference (Workers AI) runs on Cloudflare's GPU infrastructure. Cloudflare states that
          Workers AI does not train on customer data and does not retain inputs or outputs after the
          request completes.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">9. Data Retention</h2>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>
            <strong>DX events</strong> — Automatically deleted after 90 days.
          </li>
          <li>
            <strong>Expired authentication sessions</strong> — Automatically deleted after 30 days.
          </li>
          <li>
            <strong>All other data</strong> (thoughts, decisions, sessions, sentiment, handoffs,
            conversations) — Retained until you delete the specific content or delete your account.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">10. Data Portability</h2>
        <p className="mb-4">
          You can export all of your data at any time in JSON or CSV format through the Brain Cloud
          dashboard or API. This includes your thoughts, decisions, sessions, sentiment records,
          handoffs, and conversation logs.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">11. Account Deletion</h2>
        <p className="mb-4">
          You can delete your account at any time from the Settings page in the dashboard or by
          calling the DELETE /api/account endpoint. Account deletion performs a full cascading delete
          of all your data, including thoughts, decisions, sessions, API keys, vector embeddings,
          and any other associated records. This action is permanent and cannot be undone.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">12. Your Rights Under GDPR</h2>
        <p className="mb-4">
          If you are located in the European Economic Area (EEA), United Kingdom, or Switzerland, you
          have the following rights under the General Data Protection Regulation (GDPR):
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>
            <strong>Right to access</strong> — You can request a copy of all personal data we hold
            about you. You can also access your data at any time via the API or data export feature.
          </li>
          <li>
            <strong>Right to rectification</strong> — You can update or correct your data through
            the service at any time.
          </li>
          <li>
            <strong>Right to erasure</strong> — You can delete your account and all associated data
            as described in Section 11.
          </li>
          <li>
            <strong>Right to data portability</strong> — You can export your data in JSON or CSV
            format as described in Section 10.
          </li>
          <li>
            <strong>Right to restrict processing</strong> — You can request that we limit how we
            process your data.
          </li>
          <li>
            <strong>Right to object</strong> — You can object to our processing of your data.
          </li>
        </ul>
        <p className="mb-4">
          <strong>Legal basis for processing:</strong> We process your data under the following legal
          bases: (a) legitimate interest for providing and operating the core service, (b) contractual
          necessity to fulfill our Terms of Service, and (c) consent for optional features such as
          AI-generated coaching and digest emails.
        </p>
        <p className="mb-4">
          To exercise any of these rights, contact our Data Protection Officer at{" "}
          <a href="mailto:privacy@brain-ai.dev" className="text-primary hover:underline">
            privacy@brain-ai.dev
          </a>.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">13. Your Rights Under CCPA</h2>
        <p className="mb-4">
          If you are a California resident, the California Consumer Privacy Act (CCPA) provides you
          with specific rights regarding your personal information.
        </p>

        <h3 className="text-lg font-medium mt-6 mb-3">Categories of Personal Information Collected</h3>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Identifiers (name, email address, account ID)</li>
          <li>Internet activity (hashed IP address, authentication session data)</li>
          <li>User-generated content (thoughts, decisions, sessions, and other content you create)</li>
        </ul>

        <h3 className="text-lg font-medium mt-6 mb-3">Your CCPA Rights</h3>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>
            <strong>Right to know</strong> — You can request disclosure of the categories and specific
            pieces of personal information we have collected about you.
          </li>
          <li>
            <strong>Right to delete</strong> — You can request deletion of your personal information.
            You can also self-serve this through account deletion (Section 11).
          </li>
          <li>
            <strong>Right to non-discrimination</strong> — We will not discriminate against you for
            exercising your CCPA rights.
          </li>
        </ul>
        <p className="mb-4">
          <strong>Do Not Sell My Personal Information:</strong> Brain Cloud does not sell, rent, or
          trade your personal information to any third party for monetary or other valuable
          consideration. We have never sold personal information and have no plans to do so.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">14. Data Breach Notification</h2>
        <p className="mb-4">
          In the event of a data breach that affects your personal information, we will notify
          affected users within 72 hours of becoming aware of the breach, consistent with GDPR
          requirements. Notification will be sent to the email address associated with your account
          and, where applicable, to relevant supervisory authorities.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">15. Children's Privacy</h2>
        <p className="mb-4">
          Brain Cloud is not directed at children under the age of 16. We do not knowingly collect
          personal information from children under 16. If we become aware that we have collected
          personal information from a child under 16, we will take steps to delete that information
          promptly. If you believe a child under 16 has provided us with personal information, please
          contact us at{" "}
          <a href="mailto:privacy@brain-ai.dev" className="text-primary hover:underline">
            privacy@brain-ai.dev
          </a>.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">16. Changes to This Policy</h2>
        <p className="mb-4">
          We may update this Privacy Policy from time to time. When we make material changes, we will
          notify you by email (sent to the address associated with your account) and by posting a
          notice on the service at least 30 days before the changes take effect. The "Effective Date"
          at the top of this page indicates when the policy was last revised. Your continued use of
          Brain Cloud after the updated policy takes effect constitutes your acceptance of the changes.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">17. Contact</h2>
        <p className="mb-4">
          For questions, concerns, or requests regarding your privacy or this policy, contact us at{" "}
          <a href="mailto:privacy@brain-ai.dev" className="text-primary hover:underline">
            privacy@brain-ai.dev
          </a>.
        </p>
      </section>
    </LegalLayout>
  );
}
