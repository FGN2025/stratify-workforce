import { NavLink } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-border bg-background/50 backdrop-blur-xl py-6 px-6">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} FGN Academy. All rights reserved.</p>
        <nav className="flex items-center gap-4">
          <NavLink to="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </NavLink>
          <NavLink to="/eula" className="hover:text-foreground transition-colors">
            EULA
          </NavLink>
        </nav>
      </div>
    </footer>
  );
}
