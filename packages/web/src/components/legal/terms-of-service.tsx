import { LegalLayout } from "./layout";

export function TermsOfServicePage() {
  return (
    <LegalLayout title="Terms of Service" effectiveDate="March 7, 2026">
      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">1. About This Service</h2>
        <p className="mb-4">
          Brain Cloud is a personal project operated by an individual developer, not a company or
          legal entity. By using Brain Cloud, you agree to these Terms of Service. If you do not
          agree, do not use the service.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">2. No Warranty</h2>
        <p className="mb-4">
          THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER
          EXPRESS, IMPLIED, OR STATUTORY. WE MAKE NO GUARANTEES REGARDING UPTIME, AVAILABILITY,
          RELIABILITY, ACCURACY, OR FITNESS FOR A PARTICULAR PURPOSE. USE THE SERVICE AT YOUR OWN RISK.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">3. Limitation of Liability</h2>
        <p className="mb-4">
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE OPERATOR SHALL NOT BE LIABLE FOR ANY INDIRECT,
          INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES,
          WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER
          INTANGIBLE LOSSES, RESULTING FROM YOUR USE OF THE SERVICE.
        </p>
        <p className="mb-4">
          THE TOTAL AGGREGATE LIABILITY OF THE OPERATOR FOR ALL CLAIMS ARISING FROM OR RELATED TO THE
          SERVICE SHALL NOT EXCEED ZERO DOLLARS ($0.00 USD).
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">4. Indemnification</h2>
        <p className="mb-4">
          You agree to indemnify, defend, and hold harmless the operator from and against any and all
          claims, liabilities, damages, losses, costs, and expenses (including reasonable attorneys' fees)
          arising from or related to your use of the service, your violation of these terms, or your
          violation of any rights of a third party.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">5. Service Modifications and Termination</h2>
        <p className="mb-4">
          We reserve the right to modify, suspend, or terminate the service (or your access to it) at
          any time, for any reason, without notice or liability. We may also change, update, or
          discontinue any feature or functionality of the service at our sole discretion.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">6. Your Content</h2>
        <p className="mb-4">
          You retain all intellectual property rights in the content you create and store through
          Brain Cloud. By using the service, you grant us a limited, non-exclusive license to store,
          process, and display your content solely for the purpose of delivering the service to you.
          This license terminates when you delete your content or your account.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">7. Acceptable Use</h2>
        <p className="mb-4">You agree not to:</p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Use the service for any unlawful purpose.</li>
          <li>Attempt to gain unauthorized access to the service or its related systems.</li>
          <li>Interfere with or disrupt the integrity or performance of the service.</li>
          <li>Use the service to store or transmit malicious code.</li>
          <li>Abuse the API or exceed reasonable usage limits.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">8. Governing Law</h2>
        <p className="mb-4">
          These terms shall be governed by and construed in accordance with the laws of the
          Commonwealth of Pennsylvania, without regard to its conflict of law provisions. Any disputes
          arising under these terms shall be subject to the exclusive jurisdiction of the courts located
          in the Commonwealth of Pennsylvania.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">9. Severability</h2>
        <p className="mb-4">
          If any provision of these terms is found to be unenforceable or invalid, that provision shall
          be limited or eliminated to the minimum extent necessary so that these terms shall otherwise
          remain in full force and effect.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">10. Entire Agreement</h2>
        <p className="mb-4">
          These terms, together with the Privacy Policy, constitute the entire agreement between you
          and the operator regarding the use of the service, and supersede any prior agreements.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">11. Changes to These Terms</h2>
        <p className="mb-4">
          We may update these Terms of Service from time to time. Changes will be reflected by updating
          the effective date at the top of this page. Continued use of the service after changes
          constitutes acceptance of the revised terms.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-4">12. Contact</h2>
        <p className="mb-4">
          For questions about these terms, contact us at{" "}
          <a href="mailto:hello@brain-ai.dev" className="text-primary hover:underline">
            hello@brain-ai.dev
          </a>.
        </p>
      </section>
    </LegalLayout>
  );
}
