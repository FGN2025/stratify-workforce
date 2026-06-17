import { NavLink } from 'react-router-dom';
import { useTenant } from '@/contexts/TenantContext';

export function Footer() {
  const { tenant, appName } = useTenant();
  const supportEmail = tenant?.support_email;
  const termsUrl = tenant?.terms_url;
  const privacyUrl = tenant?.privacy_url;

  return (
    <footer className="border-t border-border bg-background/50 backdrop-blur-xl py-6 px-6">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>
          © {new Date().getFullYear()} {appName}. All rights reserved.
          {supportEmail && (
            <>
              {' · '}
              <a href={`mailto:${supportEmail}`} className="hover:text-foreground transition-colors">
                {supportEmail}
              </a>
            </>
          )}
        </p>
        <nav className="flex items-center gap-4">
          {privacyUrl ? (
            <a href={privacyUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              Privacy Policy
            </a>
          ) : (
            <NavLink to="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </NavLink>
          )}
          {termsUrl ? (
            <a href={termsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              Terms
            </a>
          ) : (
            <NavLink to="/eula" className="hover:text-foreground transition-colors">
              EULA
            </NavLink>
          )}
        </nav>
      </div>
    </footer>
  );
}
