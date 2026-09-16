import { Link, Outlet, NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Menu, X, ChevronDown, Sun, Moon, Feather } from 'lucide-react';

type ThemeName = 'light' | 'dark' | 'parchment';
const THEMES: ThemeName[] = ['light', 'dark', 'parchment'];

function getInitialTheme(): ThemeName {
  const saved = localStorage.getItem('cadence-theme');
  return THEMES.includes(saved as ThemeName) ? saved as ThemeName : 'light';
}

function ThemePicker({ theme, onChange, compact = false }: { theme: ThemeName; onChange: (theme: ThemeName) => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((value) => !value)} className={`${compact ? 'p-1.5' : 'p-2'} rounded-lg text-cadence-secondary transition-colors hover:bg-cadence-surface2 hover:text-cadence-text`} title="Choose appearance" aria-label="Choose appearance" aria-expanded={open}>
        {theme === 'light' && <Sun className="w-5 h-5" />}
        {theme === 'dark' && <Moon className="w-5 h-5" />}
        {theme === 'parchment' && <Feather className="w-5 h-5" />}
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-50 w-36 rounded-xl border border-cadence-border bg-cadence-surface p-1.5 shadow-xl">
          {THEMES.map((option) => (
            <button key={option} onClick={() => { onChange(option); setOpen(false); }} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs capitalize ${option === theme ? 'bg-cadence-accentSoft font-medium text-cadence-accent' : 'text-cadence-secondary hover:bg-cadence-surface2'}`}>
              {option === 'light' && <Sun className="h-3.5 w-3.5" />}
              {option === 'dark' && <Moon className="h-3.5 w-3.5" />}
              {option === 'parchment' && <Feather className="h-3.5 w-3.5" />}
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PublicLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeName>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cadence-theme', theme);
  }, [theme]);

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
              <img src="/logo.png" alt="Cadence Logo" className="h-10 w-auto object-contain rounded-md" />
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
            <ThemePicker theme={theme} onChange={setTheme} />
            <Link to="/login" className="text-sm text-cadence-secondary hover:text-cadence-text transition-colors">
              Log in
            </Link>
            <Link to="/signup" className="btn-primary">
              Get started free
            </Link>
          </div>
          <div className="md:hidden flex items-center gap-3">
            <ThemePicker theme={theme} onChange={setTheme} compact />
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
                <img src="/logo.png" alt="Cadence Logo" className="h-10 w-auto object-contain rounded-md grayscale opacity-80" />
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
