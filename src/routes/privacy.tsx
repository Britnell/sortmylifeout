import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/privacy')({
  component: PrivacyPolicy,
})

function PrivacyPolicy() {
  return (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell rounded-2xl p-6 sm:p-8">
        <p className="island-kicker mb-2">Legal</p>
        <h1 className="display-title mb-3 text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="mb-8 text-sm text-[var(--sea-ink-soft)]">
          Last updated: May 2025
        </p>

        <div className="max-w-3xl space-y-8 text-base leading-8 text-[var(--sea-ink-soft)]">
          <div>
            <h2 className="mb-2 text-xl font-semibold text-[var(--sea-ink)]">
              1. Introduction
            </h2>
            <p>
              Welcome to Sort My Life Out. We are committed to protecting your
              personal information and your right to privacy. This policy
              explains what information we collect, how we use it, and what
              rights you have in relation to it.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-xl font-semibold text-[var(--sea-ink)]">
              2. Information We Collect
            </h2>
            <p>
              When you create an account and use our service, we collect
              information you provide directly to us, including:
            </p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Account details such as your name and email address</li>
              <li>Calendar events and scheduling data you enter into the app</li>
              <li>
                Profile information such as phone number, if you choose to
                provide it
              </li>
              <li>
                Usage data and interactions with the service to improve your
                experience
              </li>
            </ul>
          </div>

          <div>
            <h2 className="mb-2 text-xl font-semibold text-[var(--sea-ink)]">
              3. How We Use Your Information
            </h2>
            <p>We use the information we collect to:</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Provide, operate, and maintain the service</li>
              <li>Send you reminders and notifications you have opted into</li>
              <li>Respond to your support requests</li>
              <li>Improve and personalise your experience</li>
              <li>Comply with legal obligations</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-2 text-xl font-semibold text-[var(--sea-ink)]">
              4. Sharing Your Information
            </h2>
            <p>
              We do not sell, trade, or rent your personal information to third
              parties. We may share data with trusted service providers who
              assist us in operating the platform (such as hosting and
              authentication providers), under strict confidentiality
              agreements. We may also disclose information where required by
              law.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-xl font-semibold text-[var(--sea-ink)]">
              5. Data Retention
            </h2>
            <p>
              We retain your personal data for as long as your account is
              active or as needed to provide services. You may request deletion
              of your account and associated data at any time by contacting us.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-xl font-semibold text-[var(--sea-ink)]">
              6. Security
            </h2>
            <p>
              We implement reasonable technical and organisational measures to
              protect your personal information against unauthorised access,
              loss, or misuse. However, no method of transmission over the
              internet is 100% secure.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-xl font-semibold text-[var(--sea-ink)]">
              7. Your Rights
            </h2>
            <p>
              Depending on your location, you may have rights to access,
              correct, or delete your personal data, object to or restrict
              processing, and data portability. To exercise any of these rights,
              please contact us.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-xl font-semibold text-[var(--sea-ink)]">
              8. Cookies
            </h2>
            <p>
              We use essential cookies to keep you signed in and maintain your
              session. We do not use tracking or advertising cookies.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-xl font-semibold text-[var(--sea-ink)]">
              9. Changes to This Policy
            </h2>
            <p>
              We may update this privacy policy from time to time. We will
              notify you of significant changes by posting a notice in the app
              or sending an email to your registered address.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-xl font-semibold text-[var(--sea-ink)]">
              10. Contact Us
            </h2>
            <p>
              If you have any questions about this privacy policy or how we
              handle your data, please contact us at{' '}
              <a
                href="mailto:privacy@sortmylifeout.app"
                className="underline hover:text-[var(--sea-ink)]"
              >
                privacy@sortmylifeout.app
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
