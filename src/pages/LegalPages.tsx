import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

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
      </div>
    </main>
  );
}

export function PrivacyPage() {
  return <LegalLayout title="Privacy policy">
    <p className="legal-updated">Last updated: November 19, 2026</p>
    <p>NexoraOS ("we", "us", "our") operates <a href="https://nexoraos.digital">nexoraos.digital</a>.</p>
    <h2>Data we collect</h2>
    <ul><li>Email and name (via Google OAuth or Discord)</li><li>Payment and subscription data (processed by Whop — we do not store card details)</li><li>Usage data: prompts submitted, products generated, credits used</li><li>Session data via cookies</li></ul>
    <h2>How we use it</h2>
    <ul><li>To provide and improve the platform</li><li>To manage your subscription and credits</li><li>To send product updates (only if notifications enabled)</li></ul>
    <h2>Data storage</h2>
    <p>Stored securely via Supabase. We do not sell your data.</p>
    <h2>Your rights</h2>
    <p>Request deletion of your account and all data by emailing <a href="mailto:support@nexoraos.digital">support@nexoraos.digital</a>. Processed within 30 days.</p>
    <h2>Third-party services</h2>
    <p>Supabase, Whop, Google OAuth, Discord OAuth, Vercel, DeepInfra (prompts not stored).</p>
    <h2>Contact</h2>
    <p><a href="mailto:support@nexoraos.digital">support@nexoraos.digital</a></p>
  </LegalLayout>;
}

export function TermsPage() {
  return <LegalLayout title="Terms of service">
    <p className="legal-updated">Last updated: November 19, 2026</p>
    <p>By using NexoraOS you agree to these terms.</p>
    <h2>1. Service</h2>
    <p>NexoraOS provides AI-powered digital product generation tools. Access sold via monthly subscription through Whop.</p>
    <h2>2. Acceptable use</h2>
    <p>Do not use NexoraOS to generate illegal content, infringe copyrights, or violate any law. Violations result in account termination without refund.</p>
    <h2>3. AI-generated content</h2>
    <p>All content is AI-assisted. You are responsible for reviewing output before publishing or selling. NexoraOS does not guarantee accuracy.</p>
    <h2>4. Credits</h2>
    <p>Credits are consumed per generation. Unused monthly credits do not roll over. Credit top-ups are non-refundable once used.</p>
    <h2>5. Liability</h2>
    <p>NexoraOS is provided "as is". We are not liable for indirect, incidental, or consequential damages.</p>
    <h2>6. Changes</h2>
    <p>We may update these terms at any time. Continued use constitutes acceptance.</p>
    <h2>Contact</h2>
    <p><a href="mailto:support@nexoraos.digital">support@nexoraos.digital</a></p>
  </LegalLayout>;
}

export function RefundPage() {
  return <LegalLayout title="Refund policy">
    <p className="legal-updated">Last updated: November 19, 2026</p>
    <h2>Subscription refunds</h2>
    <p>3-day refund window from purchase date. Email <a href="mailto:support@nexoraos.digital">support@nexoraos.digital</a> with your Whop order ID within 3 days. Refunds processed via Whop in 5–10 business days. After 3 days, non-refundable.</p>
    <h2>Credit top-ups</h2>
    <p>Non-refundable once purchased.</p>
    <h2>Exceptions</h2>
    <p>Platform outage exceeding 24 hours: eligible for pro-rata credit or refund. Contact <a href="mailto:support@nexoraos.digital">support@nexoraos.digital</a>.</p>
    <h2>Contact</h2>
    <p><a href="mailto:support@nexoraos.digital">support@nexoraos.digital</a></p>
  </LegalLayout>;
}
