import { LegalLayout } from "./layout";

export function TermsOfServicePage() {
  return (
    <LegalLayout title="Terms of Service" effectiveDate="March 8, 2026">
      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">1. Agreement to Terms</h2>
        <p className="mb-4">
          These Terms of Service ("Terms") govern your access to and use of Brain Cloud, a SaaS
          platform that provides AI assistants with persistent memory via the Model Context Protocol
          (MCP), operated by Brain Cloud ("we," "us," "our"). By accessing or using Brain Cloud, you
          agree to be bound by these Terms and our{" "}
          <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
          If you do not agree, do not use the service.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">2. Beta Service</h2>
        <p className="mb-4">
          Brain Cloud is currently in beta. During the beta period, the service is provided free of
          charge and may be subject to changes, interruptions, or discontinuation without notice. We
          make no guarantees regarding uptime, availability, or feature stability during beta. Features
          may be added, modified, or removed at any time. Pricing details will be announced before the
          beta period ends, and you will be given advance notice before any charges apply.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">3. Eligibility</h2>
        <p className="mb-4">
          You must be at least 16 years of age to use Brain Cloud. By using the service, you represent
          and warrant that you meet this age requirement. If you are using Brain Cloud on behalf of an
          organization, you represent that you have authority to bind that organization to these Terms.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">4. Account Responsibilities</h2>
        <p className="mb-4">
          You are responsible for maintaining the security of your account credentials, including your
          login credentials and API keys. You are responsible for all activity that occurs under your
          account. You must notify us immediately at{" "}
          <a href="mailto:privacy@brain-ai.dev" className="text-primary hover:underline">
            privacy@brain-ai.dev
          </a>{" "}
          if you become aware of any unauthorized access to or use of your account.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">5. Data Ownership and License</h2>
        <p className="mb-4">
          You retain all intellectual property rights in the content you create and store through
          Brain Cloud, including your thoughts, decisions, sessions, sentiment data, handoffs, and
          conversation logs ("Your Content"). Brain Cloud does not claim ownership of Your Content.
        </p>
        <p className="mb-4">
          By using the service, you grant Brain Cloud a limited, non-exclusive, worldwide license to
          store, process, index, and display Your Content solely for the purpose of providing and
          improving the service for you. This includes generating vector embeddings for search and
          producing AI-generated insights from your data. This license terminates when you delete Your
          Content or your account.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">6. Acceptable Use</h2>
        <p className="mb-4">You agree not to:</p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Use the service for any unlawful purpose or in violation of any applicable laws.</li>
          <li>Attempt to gain unauthorized access to the service, other accounts, or related systems.</li>
          <li>Interfere with or disrupt the integrity, security, or performance of the service.</li>
          <li>Use the service to store or transmit malicious code, malware, or harmful content.</li>
          <li>Circumvent, disable, or interfere with rate limits or other usage restrictions.</li>
          <li>
            Use automated means (bots, scrapers, scripts) to access the service in a manner that
            exceeds reasonable use or places undue load on our infrastructure.
          </li>
          <li>Reverse engineer, decompile, or disassemble any part of the service.</li>
          <li>Resell, sublicense, or redistribute the service without our written permission.</li>
        </ul>
        <p className="mb-4">
          Violation of these acceptable use terms may result in temporary or permanent suspension of
          your account.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">7. Rate Limits</h2>
        <p className="mb-4">
          API calls to Brain Cloud are subject to rate limits. Current rate limits are documented in
          the API documentation and may change at any time. If you exceed rate limits, your requests
          may be temporarily throttled or rejected. Persistent or intentional abuse of rate limits may
          result in temporary or permanent restriction of your access to the service.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">8. AI Features Disclaimer</h2>
        <p className="mb-4">
          Brain Cloud includes AI-powered features such as daily coaching, daily digests, session
          scoring, and "Ask Brain" search. These features generate insights and recommendations based
          on your data using automated processing. AI-generated content is provided for informational
          purposes only and should not be relied upon as professional, medical, legal, financial, or
          other expert advice. You are solely responsible for any decisions you make based on
          AI-generated content.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">9. Intellectual Property</h2>
        <p className="mb-4">
          Brain Cloud and its original content (excluding Your Content), features, and functionality
          are and will remain the exclusive property of Brain Cloud. The service is protected by
          copyright, trademark, and other applicable laws. Our trademarks and trade dress may not be
          used in connection with any product or service without our prior written consent.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">10. Termination</h2>
        <p className="mb-4">
          Either party may terminate this agreement at any time. You may terminate by deleting your
          account through the Settings page or the DELETE /api/account endpoint. We may terminate or
          suspend your access immediately, without prior notice, if you violate these Terms or for
          any other reason at our sole discretion.
        </p>
        <p className="mb-4">
          Before deleting your account, you may export your data in JSON or CSV format. Upon account
          deletion, all of Your Content will be permanently deleted in accordance with our{" "}
          <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">11. Disclaimer of Warranties</h2>
        <p className="mb-4 uppercase">
          The service is provided "as is" and "as available" without warranties of any kind, whether
          express, implied, or statutory. We specifically disclaim all implied warranties of
          merchantability, fitness for a particular purpose, and non-infringement. We do not warrant
          that the service will be uninterrupted, error-free, secure, or available at any particular
          time or location. During the beta period, the service may contain bugs, errors, or
          incomplete features. Use the service at your own risk.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">12. Limitation of Liability</h2>
        <p className="mb-4 uppercase">
          To the maximum extent permitted by applicable law, Brain Cloud shall not be liable for any
          indirect, incidental, special, consequential, or punitive damages, or any loss of profits,
          revenue, data, use, goodwill, or other intangible losses, resulting from (a) your access to
          or use of or inability to access or use the service, (b) any conduct or content of any
          third party on the service, (c) any content obtained from the service, or (d) unauthorized
          access, use, or alteration of your content.
        </p>
        <p className="mb-4 uppercase">
          In no event shall Brain Cloud's total aggregate liability for all claims arising from or
          related to the service exceed the amount you paid us in the twelve (12) months preceding
          the claim, or fifty dollars ($50.00 USD), whichever is greater. During the beta period
          while the service is free, total aggregate liability shall not exceed zero dollars ($0.00
          USD).
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">13. Indemnification</h2>
        <p className="mb-4">
          You agree to indemnify, defend, and hold harmless Brain Cloud and its officers, directors,
          employees, and agents from and against any and all claims, liabilities, damages, losses,
          costs, and expenses (including reasonable attorneys' fees) arising from or related to
          (a) your use of the service, (b) Your Content, (c) your violation of these Terms, or
          (d) your violation of any rights of a third party.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">14. Governing Law</h2>
        <p className="mb-4">
          These Terms shall be governed by and construed in accordance with the laws of the State of
          Delaware, United States, without regard to its conflict of law provisions.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">15. Dispute Resolution</h2>
        <p className="mb-4">
          Any dispute arising from or relating to these Terms or the service shall first be attempted
          to be resolved through good faith negotiation between the parties for a period of at least
          thirty (30) days. If the dispute cannot be resolved through negotiation, it shall be
          submitted to binding arbitration in accordance with the rules of the American Arbitration
          Association. The arbitration shall take place in the State of Delaware, and the
          arbitrator's decision shall be final and binding.
        </p>
        <p className="mb-4">
          You agree that any arbitration or proceeding shall be limited to the dispute between you and
          Brain Cloud individually. You waive any right to participate in a class action lawsuit or
          class-wide arbitration.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">16. Changes to Terms</h2>
        <p className="mb-4">
          We may update these Terms from time to time. When we make material changes, we will notify
          you by email (sent to the address associated with your account) at least 30 days before the
          changes take effect. The "Effective Date" at the top of this page indicates when the Terms
          were last revised. Your continued use of Brain Cloud after the updated Terms take effect
          constitutes your acceptance of the changes. If you do not agree to the revised Terms, you
          must stop using the service.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">17. General Provisions</h2>

        <h3 className="text-lg font-medium mt-6 mb-3">Severability</h3>
        <p className="mb-4">
          If any provision of these Terms is found to be unenforceable or invalid by a court of
          competent jurisdiction, that provision shall be limited or eliminated to the minimum extent
          necessary so that these Terms shall otherwise remain in full force and effect.
        </p>

        <h3 className="text-lg font-medium mt-6 mb-3">Entire Agreement</h3>
        <p className="mb-4">
          These Terms, together with the Privacy Policy, constitute the entire agreement between you
          and Brain Cloud regarding the use of the service and supersede any prior agreements or
          understandings.
        </p>

        <h3 className="text-lg font-medium mt-6 mb-3">Assignment</h3>
        <p className="mb-4">
          You may not assign or transfer these Terms or your rights under them without our prior
          written consent. We may assign our rights and obligations under these Terms without
          restriction.
        </p>

        <h3 className="text-lg font-medium mt-6 mb-3">Waiver</h3>
        <p className="mb-4">
          Our failure to enforce any right or provision of these Terms shall not be considered a
          waiver of that right or provision.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">18. Contact</h2>
        <p className="mb-4">
          For questions about these Terms, contact us at{" "}
          <a href="mailto:privacy@brain-ai.dev" className="text-primary hover:underline">
            privacy@brain-ai.dev
          </a>.
        </p>
      </section>
    </LegalLayout>
  );
}
