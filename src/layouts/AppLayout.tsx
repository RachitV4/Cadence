import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/lib/supabase';
import type { Client } from '@/types';
import {
  LayoutDashboard, UserPlus, FileText, Receipt, MessageSquare,
  Activity, User, CreditCard, Settings, LogOut, Menu, X, Bell,
  Search, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function AppLayout() {
  const { organization, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState<Client[]>([]);

  const fetchClients = useCallback(async () => {
    if (!organization) return;
    
    // Fetch clients
    const { data: clientsData } = await supabase
      .from('clients')
      .select('*')
      .eq('organization_id', organization.id)
      .order('name', { ascending: true });
      
    // Fetch invoices to determine risk
    const { data: invoicesData } = await supabase
      .from('invoices')
      .select('client_id, amount, payment_status, due_date')
      .eq('organization_id', organization.id);
      
    const invoices = invoicesData || [];
    
    const enrichedClients = (clientsData || []).map(client => {
      const clientInvoices = invoices.filter(inv => inv.client_id === client.id);
      const hasHighRisk = clientInvoices.some(inv => {
        const isOverdue = inv.payment_status !== 'paid' && new Date(inv.due_date) < new Date();
        return isOverdue && inv.amount > 10000;
      });
      return { ...client, hasHighRisk };
    });

    setClients(enrichedClients as any);
  }, [organization]);

  useEffect(() => {
    fetchClients();
    
    if (!organization) return;
    const sub = supabase.channel('clients-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients', filter: `organization_id=eq.${organization.id}` }, () => {
        fetchClients();
      })
      .subscribe();
      
    return () => { sub.unsubscribe(); };
  }, [fetchClients, organization]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const path = location.pathname;
  const isActive = (route: string) => path === route || path.startsWith(route + '/');

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-cadence-bg flex">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-cadence-surface border-r border-cadence-border flex flex-col transition-transform lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-cadence-border">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src="/logo.png" alt="Cadence Logo" className="w-8 h-auto object-contain" />
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-cadence-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4">
          <Link to="/dashboard" className={cn('flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors mb-1', isActive('/dashboard') && path === '/dashboard' ? 'bg-cadence-accentSoft text-cadence-accent font-medium' : 'text-cadence-secondary hover:bg-cadence-surface2')}>
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </Link>
          <Link to="/dashboard/client/new" className={cn('flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors mb-1', isActive('/dashboard/client/new') ? 'bg-cadence-accentSoft text-cadence-accent font-medium' : 'text-cadence-secondary hover:bg-cadence-surface2')}>
            <UserPlus className="w-4 h-4" /> Create client
          </Link>

          <div className="mt-6 mb-2 px-3">
            <span className="text-xs font-mono uppercase tracking-wider text-cadence-muted">Your clients</span>
          </div>
          {clients.length === 0 ? (
            <p className="px-3 text-xs text-cadence-muted">No clients yet.</p>
          ) : (
            <div className="space-y-0.5">
              {clients.map((client) => (
                <div key={client.id}>
                  <Link
                    to={`/dashboard/client/${client.id}`}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
                      isActive(`/dashboard/client/${client.id}`)
                        ? 'bg-cadence-accentSoft text-cadence-accent font-medium'
                        : 'text-cadence-secondary hover:bg-cadence-surface2'
                    )}
                  >
                    {(client as any).hasHighRisk ? (
                      <span className="relative flex w-2 h-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full w-2 h-2 bg-red-500"></span>
                      </span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-cadence-muted shrink-0" />
                    )}
                    <span className="truncate">{client.name}</span>
                  </Link>
                  {isActive(`/dashboard/client/${client.id}`) && (
                    <div className="ml-5 mt-0.5 mb-1 space-y-0.5">
                      <Link to={`/dashboard/client/${client.id}/contracts`} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors', isActive(`/dashboard/client/${client.id}/contracts`) ? 'text-cadence-accent font-medium' : 'text-cadence-muted hover:text-cadence-secondary')}>
                        <FileText className="w-3.5 h-3.5" /> Contracts
                      </Link>
                      <Link to={`/dashboard/client/${client.id}/invoices`} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors', isActive(`/dashboard/client/${client.id}/invoices`) ? 'text-cadence-accent font-medium' : 'text-cadence-muted hover:text-cadence-secondary')}>
                        <Receipt className="w-3.5 h-3.5" /> Invoices
                      </Link>
                      <Link to={`/dashboard/client/${client.id}/tones`} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors', isActive(`/dashboard/client/${client.id}/tones`) ? 'text-cadence-accent font-medium' : 'text-cadence-muted hover:text-cadence-secondary')}>
                        <MessageSquare className="w-3.5 h-3.5" /> Tones
                      </Link>
                      <Link to={`/dashboard/client/${client.id}/activity`} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors', isActive(`/dashboard/client/${client.id}/activity`) ? 'text-cadence-accent font-medium' : 'text-cadence-muted hover:text-cadence-secondary')}>
                        <Activity className="w-3.5 h-3.5" /> Activity
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-cadence-border px-3 py-3 space-y-0.5">
          <Link to="/dashboard/profile" className={cn('flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors', isActive('/dashboard/profile') ? 'bg-cadence-accentSoft text-cadence-accent font-medium' : 'text-cadence-secondary hover:bg-cadence-surface2')}>
            <User className="w-4 h-4" /> Profile
          </Link>
          <Link to="/dashboard/subscription" className={cn('flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors', isActive('/dashboard/subscription') ? 'bg-cadence-accentSoft text-cadence-accent font-medium' : 'text-cadence-secondary hover:bg-cadence-surface2')}>
            <CreditCard className="w-4 h-4" /> Subscription
          </Link>
          <Link to="/dashboard/settings" className={cn('flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors', isActive('/dashboard/settings') ? 'bg-cadence-accentSoft text-cadence-accent font-medium' : 'text-cadence-secondary hover:bg-cadence-surface2')}>
            <Settings className="w-4 h-4" /> Settings
          </Link>
          <button onClick={handleSignOut} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-cadence-secondary hover:bg-cadence-surface2 transition-colors">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 bg-cadence-bg/80 backdrop-blur-sm border-b border-cadence-border h-16 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-cadence-text">
              <Menu className="w-5 h-5" />
            </button>
            {organization && (
              <span className="text-sm font-mono text-cadence-muted hidden sm:block">{organization.name}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-cadence-border px-3 py-1.5 text-sm text-cadence-muted hover:bg-cadence-surface2 transition-colors"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden sm:inline text-xs font-mono bg-cadence-surface2 border border-cadence-border rounded px-1.5 py-0.5">⌘K</kbd>
            </button>
            <Link to="/dashboard/notifications" className="relative text-cadence-secondary hover:text-cadence-text p-2 transition-colors">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-cadence-danger text-white text-xs flex items-center justify-center font-medium">
                  {unreadCount}
                </span>
              )}
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="h-full w-full"
            >
              <Outlet context={{ clients, refetchClients: fetchClients }} />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Search modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
          <div className="absolute inset-0 bg-black/20" onClick={() => setSearchOpen(false)} />
          <div className="relative bg-cadence-surface border border-cadence-border rounded-xl shadow-xl w-full max-w-lg animate-slide-up">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-cadence-border">
              <Search className="w-4 h-4 text-cadence-muted" />
              <input
                autoFocus
                placeholder="Search clients or type a command..."
                className="flex-1 bg-transparent text-sm outline-none text-cadence-text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setSearchOpen(false);
                }}
              />
              <button onClick={() => setSearchOpen(false)} className="text-cadence-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto scrollbar-thin p-2">
              <div className="mb-2 px-2 text-[10px] font-bold text-cadence-muted uppercase tracking-wider">Commands</div>
              {[
                { name: 'Go to Dashboard', icon: <Activity className="w-4 h-4" />, href: '/dashboard' },
                { name: 'Create New Client', icon: <UserPlus className="w-4 h-4" />, href: '/dashboard/client/new' },
                { name: 'Settings & Integrations', icon: <Settings className="w-4 h-4" />, href: '/dashboard/settings' },
              ].filter(cmd => cmd.name.toLowerCase().includes(searchQuery.toLowerCase())).map((cmd) => (
                <Link
                  key={cmd.href}
                  to={cmd.href}
                  onClick={() => setSearchOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-cadence-surface2 transition-colors mb-1"
                >
                  <div className="text-cadence-muted">{cmd.icon}</div>
                  <span className="text-sm text-cadence-text font-medium">{cmd.name}</span>
                  <ChevronRight className="w-4 h-4 text-cadence-muted ml-auto" />
                </Link>
              ))}

              <div className="mt-4 mb-2 px-2 text-[10px] font-bold text-cadence-muted uppercase tracking-wider">Clients</div>
              {clients.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                <p className="px-3 py-2 text-sm text-cadence-muted">No matching clients.</p>
              ) : (
                clients.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map((c) => (
                  <Link
                    key={c.id}
                    to={`/dashboard/client/${c.id}`}
                    onClick={() => setSearchOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-cadence-surface2 transition-colors mb-1"
                  >
                    <User className="w-4 h-4 text-cadence-muted" />
                    <span className="text-sm text-cadence-text">{c.name}</span>
                    <ChevronRight className="w-4 h-4 text-cadence-muted ml-auto" />
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
