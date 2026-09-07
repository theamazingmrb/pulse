import type { Metadata } from "next";
import LegalLayout from "@/components/legal-layout";

export const metadata: Metadata = {
  title: "Privacy Policy — Priority Compass",
  description: "How Priority Compass handles your data.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="September 7, 2026">
      <section>
        <h2 className="text-xl font-semibold mb-2">Overview</h2>
        <p>
          Priority Compass is a personal productivity app. We take a simple, privacy-first
          approach: your tasks, journals, reflections, and check-ins belong to you. We do not
          sell your data, and we do not use it for advertising.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">What we collect</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Account information</strong> — your email address and name, used to create
            and secure your account.
          </li>
          <li>
            <strong>Content you create</strong> — tasks, projects, journal entries, reflections,
            check-ins, and focus sessions.
          </li>
          <li>
            <strong>Connected accounts</strong> — if you connect Google Calendar or Spotify, we
            store the tokens needed to sync that data. We only access the data required for the
            feature you use (e.g. calendar events for scheduling, playback state for the remote
            control).
          </li>
          <li>
            <strong>Device and usage data</strong> — basic analytics to understand how the app is
            used and to keep it running reliably.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">How we use your data</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>To provide and improve the app&apos;s features.</li>
          <li>To sync your data across your devices.</li>
          <li>To send notifications you&apos;ve opted into (check-in reminders, task reminders).</li>
          <li>To keep your account and data secure.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Data storage and security</h2>
        <p>
          Your data is stored securely with our hosting providers (Supabase and Vercel). We use
          industry-standard encryption in transit and at rest. Access to your data is protected by
          your account credentials.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Third-party services</h2>
        <p>
          When you connect Google Calendar or Spotify, your data is shared with those providers
          solely to provide the integration you requested. Their use of your data is governed by
          their own privacy policies.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Your choices</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>You can disconnect Google Calendar or Spotify at any time from Settings.</li>
          <li>You can delete your content at any time.</li>
          <li>You can request deletion of your account and all associated data by contacting us.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Contact</h2>
        <p>
          If you have questions about this policy, contact us at{" "}
          <a href="mailto:support@prioritycompass.app" className="text-primary underline">
            support@prioritycompass.app
          </a>
          .
        </p>
      </section>
    </LegalLayout>
  );
}
