import { Link, Outlet, NavLink } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X, ChevronDown } from 'lucide-react';

export function PublicLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);

  const navItems = [
    { label: 'Product', href: '/product' },
    { label: 'Solutions', href: '/solutions' },
    { label: 'How it works', href: '/how-it-works' },
    { label: 'Pricing', href: '/pricing' },
  ];

  const resourceLinks = [
    { label: 'Docs', href: '/docs' },
    { label: 'Security', href: '/security' },
    { label: 'FAQ', href: '/faq' },
  ];

  return (
    <div className="min-h-screen bg-cadence-bg">
      <header className="sticky top-0 z-40 bg-cadence-bg/80 backdrop-blur-sm border-b border-cadence-border">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cadence-accent flex items-center justify-center">
                <span className="font-display font-bold text-white text-sm">C</span>
              </div>
              <span className="font-display font-semibold text-cadence-text text-lg">Cadence</span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) =>
                    `px-3 py-2 text-sm rounded-md transition-colors ${
                      isActive ? 'text-cadence-text font-medium' : 'text-cadence-secondary hover:text-cadence-text'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <div
                className="relative"
                onMouseEnter={() => setResourcesOpen(true)}
                onMouseLeave={() => setResourcesOpen(false)}
              >
                <button className="flex items-center gap-1 px-3 py-2 text-sm text-cadence-secondary hover:text-cadence-text transition-colors">
                  Resources
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {resourcesOpen && (
                  <div className="absolute top-full left-0 pt-1">
                    <div className="bg-cadence-surface border border-cadence-border rounded-lg shadow-lg py-1 w-40">
                      {resourceLinks.map((r) => (
                        <Link
                          key={r.href}
                          to={r.href}
                          className="block px-3 py-2 text-sm text-cadence-secondary hover:text-cadence-text hover:bg-cadence-surface2 transition-colors"
                        >
                          {r.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm text-cadence-secondary hover:text-cadence-text transition-colors">
              Log in
            </Link>
            <Link to="/signup" className="btn-primary">
              Get started free
            </Link>
          </div>
          <div className="md:hidden flex items-center gap-3">
            <Link to="/signup" className="btn-primary text-xs px-3 py-1.5">
              Get started
            </Link>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-cadence-text">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </nav>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-cadence-border bg-cadence-surface animate-fade-in">
            <div className="px-4 py-3 flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 text-sm text-cadence-secondary hover:text-cadence-text rounded-md hover:bg-cadence-surface2"
                >
                  {item.label}
                </Link>
              ))}
              {resourceLinks.map((r) => (
                <Link
                  key={r.href}
                  to={r.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 text-sm text-cadence-secondary hover:text-cadence-text rounded-md hover:bg-cadence-surface2"
                >
                  {r.label}
                </Link>
              ))}
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm text-cadence-secondary hover:text-cadence-text rounded-md hover:bg-cadence-surface2"
              >
                Log in
              </Link>
            </div>
          </div>
        )}
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="border-t border-cadence-border bg-cadence-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-cadence-accent flex items-center justify-center">
                  <span className="font-display font-bold text-white text-xs">C</span>
                </div>
                <span className="font-display font-semibold text-cadence-text">Cadence</span>
              </div>
              <p className="text-xs text-cadence-muted leading-relaxed">
                AI commercial intelligence for service businesses.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-cadence-text mb-3">Product</h4>
              <ul className="space-y-2">
                <li><Link to="/product" className="text-xs text-cadence-muted hover:text-cadence-text">Product</Link></li>
                <li><Link to="/solutions" className="text-xs text-cadence-muted hover:text-cadence-text">Solutions</Link></li>
                <li><Link to="/pricing" className="text-xs text-cadence-muted hover:text-cadence-text">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-medium text-cadence-text mb-3">Resources</h4>
              <ul className="space-y-2">
                <li><Link to="/docs" className="text-xs text-cadence-muted hover:text-cadence-text">Docs</Link></li>
                <li><Link to="/security" className="text-xs text-cadence-muted hover:text-cadence-text">Security</Link></li>
                <li><Link to="/faq" className="text-xs text-cadence-muted hover:text-cadence-text">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-medium text-cadence-text mb-3">Company</h4>
              <ul className="space-y-2">
                <li><Link to="/about" className="text-xs text-cadence-muted hover:text-cadence-text">About</Link></li>
                <li><Link to="/contact" className="text-xs text-cadence-muted hover:text-cadence-text">Contact</Link></li>
                <li><Link to="/privacy" className="text-xs text-cadence-muted hover:text-cadence-text">Privacy</Link></li>
                <li><Link to="/terms" className="text-xs text-cadence-muted hover:text-cadence-text">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-cadence-border">
            <p className="text-xs text-cadence-muted">Cadence gives information, not legal advice.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
