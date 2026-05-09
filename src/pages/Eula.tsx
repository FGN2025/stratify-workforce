import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { useEffect } from 'react';

const Eula = () => {
  useEffect(() => {
    document.title = 'End User License Agreement | FGN Academy';
    const desc = 'The End User License Agreement (EULA) governing your use of FGN Academy learning, simulation, and credentialing services.';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', desc);

    const canonicalHref = `${window.location.origin}/eula`;
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
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">End User License Agreement</h1>
            <p className="text-sm text-muted-foreground mt-1">Last updated: {lastUpdated}</p>
          </div>
        </header>

        <Card className="glass-card border-border">
          <CardContent className="prose prose-invert max-w-none py-6 space-y-6 text-foreground/90">
            <section>
              <p className="italic text-muted-foreground">
                PLEASE READ THIS END USER LICENSE AGREEMENT ("EULA" or "Agreement") CAREFULLY BEFORE
                USING THE SERVICE. BY ACCESSING OR USING THE SERVICE YOU AGREE TO BE BOUND BY THIS
                AGREEMENT. IF YOU DO NOT AGREE, DO NOT ACCESS OR USE THE SERVICE.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">1. Definitions</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>"FGN", "we", "us", "our"</strong> means FGN Academy and its affiliates.</li>
                <li><strong>"Service"</strong> means the FGN Academy platform, including the website, applications, edge functions, integrations, simulations, courses, SCORM packages, Skill Passports, APIs, and related content.</li>
                <li><strong>"You", "User"</strong> means the individual accessing the Service, or the organization (Tenant) on whose behalf the Service is accessed.</li>
                <li><strong>"Content"</strong> means any text, media, courseware, telemetry, evidence submissions, code, data, or other materials made available through the Service.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">2. License Grant</h2>
              <p>
                Subject to your continued compliance with this Agreement, FGN grants you a limited,
                non-exclusive, non-transferable, non-sublicensable, revocable license to access and
                use the Service for your internal learning, training, evaluation, and workforce
                development purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">3. Accounts and Eligibility</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>You must be at least 13 years old (or the minimum age in your jurisdiction).</li>
                <li>You are responsible for safeguarding your credentials and for all activity under your account.</li>
                <li>You agree to provide accurate information and to keep it up to date.</li>
                <li>Tenant administrators may provision, manage, suspend, or remove user accounts within their tenant.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">4. Restrictions</h2>
              <p>You agree not to, and not to allow any third party to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Reverse engineer, decompile, or otherwise attempt to derive source code, except as expressly permitted by law.</li>
                <li>Copy, modify, distribute, sell, lease, or sublicense any portion of the Service.</li>
                <li>Use the Service to build a competing product or to scrape, harvest, or replicate its data.</li>
                <li>Circumvent rate limits, authentication, RLS, or other security or technical controls.</li>
                <li>Upload malicious code or content that infringes third-party rights or violates law.</li>
                <li>Misrepresent achievements, credentials, evidence submissions, or simulation results.</li>
                <li>Use automated systems to interact with the Service except via documented APIs.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">5. User Content and Evidence</h2>
              <p>
                You retain ownership of Content you submit (including evidence, profile data, and
                Skill Passport entries). You grant FGN a worldwide, royalty-free license to host,
                store, reproduce, transmit, display, and process such Content solely to operate,
                provide, secure, and improve the Service, including syncing with integrated platforms
                you have connected. You represent that you have the rights necessary to submit the
                Content and that it does not violate this Agreement or applicable law.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">6. Third-Party Integrations</h2>
              <p>
                The Service integrates with third-party platforms (including Discord, Breakroom, and
                Play.fgn.gg). Your use of those services is governed by their own terms. FGN is not
                responsible for the availability, content, or practices of third-party platforms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">7. Credentials and Skill Passport</h2>
              <p>
                Achievements, certifications, and credentials issued through the Service represent
                completion of activities tracked by FGN and its integrated platforms. They do not
                constitute a guarantee of employment, licensure, or third-party recognition. You may
                publish a Skill Passport; published passports are intentionally accessible to anyone
                with the link.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">8. Intellectual Property</h2>
              <p>
                The Service, including its software, design, courses, simulations, branding, and
                associated documentation, is owned by FGN or its licensors and is protected by
                intellectual property laws. Except for the limited license granted in Section 2, no
                rights are granted to you by implication, estoppel, or otherwise.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">9. Privacy</h2>
              <p>
                Your use of the Service is also governed by our{' '}
                <a href="/privacy" className="text-primary underline">Privacy Policy</a>, which
                describes how we collect, use, and protect personal information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">10. Acceptable Use</h2>
              <p>
                You agree to use the Service in compliance with all applicable laws and regulations
                and not to use the Service in any way that could damage, disable, overburden, or
                impair the Service, or interfere with any other party's use and enjoyment of it.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">11. Suspension and Termination</h2>
              <p>
                We may suspend or terminate your access to the Service at any time, with or without
                notice, if we believe you have violated this Agreement or pose a risk to the Service
                or other users. You may stop using the Service at any time. Sections that by their
                nature should survive termination (including IP, disclaimers, limitations of
                liability, and governing law) will survive.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">12. Disclaimers</h2>
              <p>
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
                EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION WARRANTIES OF MERCHANTABILITY,
                FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, AND ACCURACY. FGN DOES NOT
                WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL
                COMPONENTS.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">13. Limitation of Liability</h2>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT WILL FGN BE LIABLE FOR ANY
                INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR
                LOST PROFITS, REVENUES, DATA, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF
                THE SERVICE. FGN'S TOTAL AGGREGATE LIABILITY UNDER THIS AGREEMENT WILL NOT EXCEED
                THE GREATER OF (A) THE AMOUNTS PAID BY YOU TO FGN FOR THE SERVICE IN THE TWELVE
                MONTHS PRECEDING THE CLAIM, OR (B) USD $100.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">14. Indemnification</h2>
              <p>
                You agree to defend, indemnify, and hold harmless FGN and its affiliates from any
                claims, damages, liabilities, and expenses (including reasonable attorneys' fees)
                arising from your Content, your use of the Service, or your violation of this
                Agreement or applicable law.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">15. Changes to the Service or Agreement</h2>
              <p>
                We may modify or discontinue the Service, in whole or in part, at any time. We may
                update this Agreement from time to time; material changes will be communicated
                through the Service or by email where appropriate. Continued use after changes take
                effect constitutes acceptance.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">16. Governing Law</h2>
              <p>
                This Agreement is governed by the laws of the jurisdiction in which FGN is
                established, without regard to conflict-of-laws principles. The parties consent to
                the exclusive jurisdiction of the courts located in that jurisdiction for any
                disputes arising under this Agreement, except where prohibited by applicable law.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">17. Contact</h2>
              <p>
                Questions about this Agreement? Reach the FGN Academy team through your tenant
                administrator or the Help Center linked from the in-app menu.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Eula;
