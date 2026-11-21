import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

const sections = [
  { title: "Privacy policy", path: "/privacy" },
  { title: "Terms of service", path: "/terms" },
  { title: "Refund policy", path: "/refund" },
];

type LegalPageProps = {
  title: string;
  children: ReactNode;
};

export function LegalLayout({ title, children }: LegalPageProps) {
  return (
    <main className="min-h-screen bg-[hsl(var(--nx-surface-0))] px-5 py-8 text-[hsl(var(--nx-ink))] sm:px-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <header className="mb-12 flex items-center justify-between gap-4 border-b border-[hsl(var(--nx-rule))] pb-5">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-[hsl(var(--nx-ink-muted))] transition-colors hover:text-[hsl(var(--nx-amber))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--nx-amber))]">
            <ArrowLeft size={15} aria-hidden="true" /> Back
          </Link>
          <Link to="/" className="text-sm font-semibold tracking-[-0.02em] text-[hsl(var(--nx-ink))]">NexoraOS</Link>
        </header>
        <article className="legal-prose">
          <p className="mb-3 text-sm text-[hsl(var(--nx-ink-subtle))]">NexoraOS</p>
          <h1>{title}</h1>
          {children}
        </article>
        <footer className="mt-16 flex flex-wrap gap-x-5 gap-y-2 border-t border-[hsl(var(--nx-rule))] pt-5 text-xs text-[hsl(var(--nx-ink-subtle))]">
          {sections.map((section) => <Link key={section.path} to={section.path} className="transition-colors hover:text-[hsl(var(--nx-amber))]">{section.title}</Link>)}
          <a href="mailto:support@nexoraos.digital" className="transition-colors hover:text-[hsl(var(--nx-amber))]">Contact support</a>
        </footer>
      </div>
    </main>
  );
}

export function PrivacyPage() {
  return <LegalLayout title="Privacy policy">
    <p className="legal-updated">Last updated: November 19, 2026</p>
    <p>NexoraOS ("we", "us", "our") operates <a href="https://nexoraos.digital">nexoraos.digital</a>.</p>
    <h2>Data we collect</h2>
    <ul><li>Email and name, provided through Google OAuth or Discord.</li><li>Payment and subscription data processed by Whop. We do not store card details.</li><li>Usage data, including prompts submitted, products generated, and credits used.</li><li>Session data stored through cookies.</li></ul>
    <h2>How we use it</h2>
    <ul><li>To provide and improve the platform.</li><li>To manage your subscription and credits.</li><li>To send product updates when notifications are enabled.</li></ul>
    <h2>Data storage</h2>
    <p>Your data is stored securely via Supabase. We do not sell your data.</p>
    <h2>Your rights</h2>
    <p>You can request deletion of your account and all associated data by emailing <a href="mailto:support@nexoraos.digital">support@nexoraos.digital</a>. Requests are processed within 30 days.</p>
    <h2>Third-party services</h2>
    <p>NexoraOS uses Supabase, Whop, Google OAuth, Discord OAuth, Vercel, and DeepInfra. Prompts sent to DeepInfra are not stored by NexoraOS.</p>
    <h2>Contact</h2>
    <p><a href="mailto:support@nexoraos.digital">support@nexoraos.digital</a></p>
  </LegalLayout>;
}

export function TermsPage() {
  return <LegalLayout title="Terms of service">
    <p className="legal-updated">Last updated: November 19, 2026</p>
    <p>These terms explain the rules for using NexoraOS. By creating an account or using the platform, you agree to use it responsibly and lawfully.</p>
    <h2>What NexoraOS provides</h2>
    <p>NexoraOS is a workspace for turning ideas into digital products, documents, marketing materials, sales pages, research, and related creative outputs. Features may change as the platform develops.</p>
    <h2>Your account</h2>
    <p>You are responsible for maintaining access to your account and for the prompts, files, and other material you submit. Do not share access credentials or use the platform to violate another person’s rights.</p>
    <h2>Acceptable use</h2>
    <p>Do not use NexoraOS to create unlawful content, impersonate others, distribute malware, interfere with the service, or circumvent subscription and credit limits.</p>
    <h2>Your content</h2>
    <p>You retain responsibility for the content you provide and the outputs you publish. Review AI-generated content for accuracy, rights, safety, and suitability before using it commercially or publicly.</p>
    <h2>Subscriptions and credits</h2>
    <p>Paid plans, credits, and billing are processed through Whop. Plan access is subject to the plan shown at checkout and the refund policy below.</p>
    <h2>Availability and changes</h2>
    <p>We work to keep NexoraOS available, but the service may change or be temporarily unavailable for maintenance, security, or technical reasons.</p>
    <h2>Contact</h2>
    <p>Questions about these terms can be sent to <a href="mailto:support@nexoraos.digital">support@nexoraos.digital</a>.</p>
  </LegalLayout>;
}

export function RefundPage() {
  return <LegalLayout title="Refund policy">
    <p className="legal-updated">Last updated: November 19, 2026</p>
    <p>Payments for NexoraOS subscriptions are processed through Whop. This policy explains how to request help with a charge or subscription.</p>
    <h2>Requesting a refund</h2>
    <p>If you believe you were charged in error, contact <a href="mailto:support@nexoraos.digital">support@nexoraos.digital</a> with the account email, transaction date, and a short explanation. We review requests individually and respond within 30 days.</p>
    <h2>Cancellation</h2>
    <p>You can cancel future renewal from your account or through the billing controls provided by Whop. Cancellation stops future charges but does not automatically reverse a completed billing period.</p>
    <h2>Duplicate or unauthorized charges</h2>
    <p>Tell us as soon as possible about duplicate or unauthorized charges. We may ask Whop for transaction details so we can investigate and resolve the issue.</p>
    <h2>Contact</h2>
    <p><a href="mailto:support@nexoraos.digital">support@nexoraos.digital</a></p>
  </LegalLayout>;
}
