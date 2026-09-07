import type { Metadata } from "next";
import LegalLayout from "@/components/legal-layout";

export const metadata: Metadata = {
  title: "Terms of Service — Priority Compass",
  description: "The terms that govern your use of Priority Compass.",
};

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="September 7, 2026">
      <section>
        <h2 className="text-xl font-semibold mb-2">Acceptance of terms</h2>
        <p>
          By using Priority Compass, you agree to these terms. If you do not agree, please do not
          use the app.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Your account</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials and
          for all activity that occurs under your account. You must provide accurate information
          when creating an account.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Acceptable use</h2>
        <p>You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Use the app for any unlawful purpose.</li>
          <li>Attempt to access, tamper with, or disrupt the app&apos;s systems or other users&apos; data.</li>
          <li>Reverse engineer, decompile, or attempt to extract the source code of the app.</li>
          <li>Use the app to store or transmit malicious content.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Your content</h2>
        <p>
          You retain ownership of the content you create in Priority Compass. You grant us a
          limited license to store, process, and display that content solely to provide the
          service to you.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Third-party services</h2>
        <p>
          The app may integrate with third-party services such as Google Calendar and Spotify.
          Your use of those services is subject to their own terms of service. We are not
          responsible for the availability or behavior of third-party services.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Disclaimers</h2>
        <p>
          The app is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind,
          whether express or implied. We do not warrant that the app will be uninterrupted,
          error-free, or free of harmful components.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, we shall not be liable for any indirect,
          incidental, special, consequential, or punitive damages arising out of or related to
          your use of the app.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Changes to these terms</h2>
        <p>
          We may update these terms from time to time. We will notify you of material changes by
          posting the updated terms on this page. Continued use of the app after changes
          constitutes acceptance of the revised terms.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Contact</h2>
        <p>
          Questions about these terms? Contact us at{" "}
          <a href="mailto:support@prioritycompass.app" className="text-primary underline">
            support@prioritycompass.app
          </a>
          .
        </p>
      </section>
    </LegalLayout>
  );
}
