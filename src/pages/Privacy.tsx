import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Shield } from 'lucide-react';
import { useEffect } from 'react';

const Privacy = () => {
  useEffect(() => {
    document.title = 'Privacy Policy | FGN Academy';
    const desc = 'How FGN Academy collects, uses, and safeguards your personal data across our learning, simulation, and credentialing services.';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', desc);

    const canonicalHref = `${window.location.origin}/privacy`;
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalHref);
  }, []);

  const lastUpdated = 'May 9, 2026';

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground mt-1">Last updated: {lastUpdated}</p>
          </div>
        </header>

        <Card className="glass-card border-border">
          <CardContent className="prose prose-invert max-w-none py-6 space-y-6 text-foreground/90">
            <section>
              <h2 className="text-xl font-semibold mb-2">1. Introduction</h2>
              <p>
                FGN Academy ("we", "us", "our") provides workforce training, simulation-based learning,
                and skill credentialing through our connected ecosystem (the "Service"). This Privacy
                Policy explains what information we collect, how we use it, and the choices you have.
                By using the Service you agree to the practices described below.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">2. Information We Collect</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Account data:</strong> name, email, username, avatar, organization, and authentication identifiers (including Discord OAuth when you choose to connect it).</li>
                <li><strong>Profile data:</strong> address details validated for residency verification, career interests, and public Skill Passport content you choose to share.</li>
                <li><strong>Learning &amp; performance data:</strong> course progress, lesson completions, XP, achievements, quiz attempts, SCORM session results, and telemetry from connected simulations and partner platforms (e.g., Breakroom, Play.fgn.gg).</li>
                <li><strong>Operational data:</strong> work order assignments, evidence submissions, event registrations, and community memberships.</li>
                <li><strong>Technical data:</strong> device, browser, IP address, log timestamps, and diagnostic information.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">3. How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Deliver and personalize the Service, including learning pathways and credentials.</li>
                <li>Issue and verify Skill Passports, achievements, and certifications.</li>
                <li>Sync progress and rewards across integrated platforms you have connected.</li>
                <li>Communicate operational notices, security alerts, and (where permitted) updates.</li>
                <li>Detect, prevent, and respond to abuse, fraud, and security incidents.</li>
                <li>Comply with legal obligations and enforce our terms.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">4. Sharing of Information</h2>
              <p>We do not sell your personal information. We share data only as needed:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>With your organization (tenant):</strong> administrators of the tenant you belong to can view your learning progress and work order activity.</li>
                <li><strong>With integrated platforms you connect</strong> (such as Discord, Breakroom, and Play.fgn.gg) to enable cross-platform features.</li>
                <li><strong>With service providers</strong> that host infrastructure, deliver email, validate addresses, or process content on our behalf, subject to confidentiality obligations.</li>
                <li><strong>For legal reasons</strong> when required by law, regulation, or valid legal process.</li>
                <li><strong>Public Skill Passport:</strong> data on a passport you publish is intentionally accessible to anyone with the link.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">5. Data Retention</h2>
              <p>
                We retain personal data for as long as your account is active and as needed to provide
                the Service, comply with legal obligations, resolve disputes, and enforce agreements.
                Aggregated or de-identified data may be retained longer for analytics and product improvement.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">6. Security</h2>
              <p>
                We use industry-standard safeguards including encryption in transit, encryption of
                sensitive credentials at rest (AES-256-GCM), row-level security in our database, and
                least-privilege access controls. No method of transmission or storage is 100% secure,
                so we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">7. Your Rights and Choices</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Access, correct, or delete personal information from your profile and connected accounts.</li>
                <li>Disconnect third-party integrations (e.g., Discord) at any time from Settings.</li>
                <li>Unpublish your Skill Passport to remove public access.</li>
                <li>Request export or deletion of your account data by contacting us.</li>
                <li>Depending on your jurisdiction, you may have additional rights under GDPR, CCPA, or similar laws.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">8. Children's Privacy</h2>
              <p>
                The Service is not directed to children under 13. We do not knowingly collect personal
                information from children under 13. If you believe a child has provided us with personal
                information, please contact us so we can remove it.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">9. International Users</h2>
              <p>
                Your information may be processed in countries other than your own. By using the Service,
                you consent to this transfer and processing in accordance with this policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">10. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. Material changes will be communicated
                through the Service or by email where appropriate. Continued use of the Service after
                changes take effect constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">11. Contact Us</h2>
              <p>
                Questions about this policy or our data practices? Reach the FGN Academy team through
                your tenant administrator or via the Help Center linked from the in-app menu.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Privacy;
