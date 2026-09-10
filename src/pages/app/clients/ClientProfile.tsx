import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, Outlet } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { LoadingState, Breadcrumbs, EmptyState } from '@/components/ui/Primitives';
import { formatCurrency, formatDate, getInvoiceDueStatus } from '@/lib/utils';
import type { Client, Contract, Invoice, ClientTone, ActivityEvent } from '@/types';
import { FileText, Receipt, MessageSquare, Activity as ActivityIcon, ArrowRight, Repeat, Mail, StickyNote, UserPlus } from 'lucide-react';

export function ClientProfile() {
  const { clientId } = useParams();
  const { showToast } = useToast();
  const { organization } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tone, setTone] = useState<ClientTone | null>(null);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!clientId || !organization) return;
    const [clientRes, contractsRes, invoicesRes, toneRes, activitiesRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).maybeSingle(),
      supabase.from('contracts').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
      supabase.from('invoices').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
      supabase.from('client_tones').select('*').eq('client_id', clientId).maybeSingle(),
      supabase.from('activity_events').select('*').eq('client_id', clientId).order('created_at', { ascending: false }).limit(5),
    ]);
    setClient(clientRes.data as Client | null);
    setContracts((contractsRes.data as Contract[]) || []);
    setInvoices((invoicesRes.data as Invoice[]) || []);
    setTone(toneRes.data as ClientTone | null);
    setActivities((activitiesRes.data as ActivityEvent[]) || []);
    setLoading(false);
  }, [clientId, organization]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <LoadingState />;
  if (!client) return <EmptyState icon={<UserPlus className="w-6 h-6" />} title="Client not found" description="This client may have been deleted." action={<Link to="/dashboard" className="btn-secondary">Back to dashboard</Link>} />;

  const activeContract = contracts.find((c) => c.status === 'complete');
  const overdueInvoices = invoices.filter((i) => getInvoiceDueStatus(i.due_date, i.payment_status) === 'overdue');
  const dueTodayInvoices = invoices.filter((i) => getInvoiceDueStatus(i.due_date, i.payment_status) === 'due_today');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: client.name }]} />

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-cadence-text">{client.name}</h1>
          <div className="flex items-center gap-3 mt-1.5 text-sm text-cadence-muted">
            {client.contact_email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {client.contact_email}</span>}
            <span className="flex items-center gap-1">
              <Repeat className="w-3.5 h-3.5" /> {client.is_repeat ? 'Repeat client' : 'New client'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={async () => {
              try {
                showToast('Creating Google Drive Vault...', 'info');
                const { data: { session } } = await supabase.auth.getSession();
                const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-drive`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    clientId: client.id,
                    clientName: client.name,
                    providerToken: session?.provider_token
                  }),
                });
                if (!res.ok) throw new Error('Failed to sync');
                const data = await res.json();
                window.open(data.folderUrl, '_blank');
                showToast('Google Drive folder created!', 'success');
              } catch (e) {
                showToast('Failed to create Drive Vault. Please re-login with Google.', 'error');
              }
            }}
            className="btn-secondary"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 14H7v-2h10v2zm0-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
            Sync to Drive
          </button>
          <button 
            onClick={async () => {
              try {
                showToast('Running batch analysis...', 'info');
                const { data: { session } } = await supabase.auth.getSession();
                const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/batch-negotiate`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ clientId: client.id, organizationId: organization?.id }),
                });
                if (!res.ok) throw new Error('No overdue invoices found for this client.');
                const data = await res.json();
                showToast(`Successfully batched ${data.invoicesCount} invoices!`, 'success');
              } catch (e) {
                showToast(e instanceof Error ? e.message : 'Batch negotiation failed.', 'error');
              }
            }}
            className="btn-secondary"
          >
            <svg className="w-4 h-4 mr-2 text-cadence-muted" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14h-2v-2h2zm0-4h-2V7h2z"/></svg>
            Batch Negotiate
          </button>
        </div>
      </div>

      {client.notes && (
        <div className="card p-4 mb-6 flex items-start gap-3">
          <StickyNote className="w-4 h-4 text-cadence-muted mt-0.5 shrink-0" />
          <p className="text-sm text-cadence-secondary">{client.notes}</p>
        </div>
      )}

      {/* Status overview */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-xs font-mono text-cadence-muted mb-1">CONTRACT STATUS</p>
          <p className="text-sm font-medium text-cadence-text">{activeContract ? 'Active' : contracts.length > 0 ? 'Processing' : 'No contract'}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-mono text-cadence-muted mb-1">INVOICE STATUS</p>
          <p className="text-sm font-medium text-cadence-text">
            {overdueInvoices.length > 0 ? `${overdueInvoices.length} overdue` : dueTodayInvoices.length > 0 ? 'Due today' : invoices.length > 0 ? 'Up to date' : 'No invoices'}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-mono text-cadence-muted mb-1">RELATIONSHIP</p>
          <p className="text-sm font-medium text-cadence-text">{client.is_repeat ? 'Repeat' : 'New'}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-mono text-cadence-muted mb-1">RECOMMENDED TONE</p>
          <p className="text-sm font-medium text-cadence-text">{tone?.selected_tone?.replace('_', ' / ') || 'Not set'}</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Link to={`/dashboard/client/${client.id}/contracts`} className="card p-4 hover:border-cadence-accent transition-colors flex items-center gap-3">
          <FileText className="w-5 h-5 text-cadence-accent" />
          <div className="flex-1"><p className="text-sm font-medium text-cadence-text">Contracts</p><p className="text-xs text-cadence-muted">{contracts.length} total</p></div>
          <ArrowRight className="w-4 h-4 text-cadence-muted" />
        </Link>
        <Link to={`/dashboard/client/${client.id}/invoices`} className="card p-4 hover:border-cadence-accent transition-colors flex items-center gap-3">
          <Receipt className="w-5 h-5 text-cadence-accent" />
          <div className="flex-1"><p className="text-sm font-medium text-cadence-text">Invoices</p><p className="text-xs text-cadence-muted">{invoices.length} total</p></div>
          <ArrowRight className="w-4 h-4 text-cadence-muted" />
        </Link>
        <Link to={`/dashboard/client/${client.id}/tones`} className="card p-4 hover:border-cadence-accent transition-colors flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-cadence-accent" />
          <div className="flex-1"><p className="text-sm font-medium text-cadence-text">Tones</p><p className="text-xs text-cadence-muted">{tone?.selected_tone?.replace('_', ' / ') || 'Not set'}</p></div>
          <ArrowRight className="w-4 h-4 text-cadence-muted" />
        </Link>
        <Link to={`/dashboard/client/${client.id}/activity`} className="card p-4 hover:border-cadence-accent transition-colors flex items-center gap-3">
          <ActivityIcon className="w-5 h-5 text-cadence-accent" />
          <div className="flex-1"><p className="text-sm font-medium text-cadence-text">Activity</p><p className="text-xs text-cadence-muted">{activities.length} recent</p></div>
          <ArrowRight className="w-4 h-4 text-cadence-muted" />
        </Link>
      </div>

      {/* Recent invoices */}
      {invoices.length > 0 && (
        <section className="mb-6">
          <h2 className="font-display text-lg font-semibold text-cadence-text mb-3">Recent invoices</h2>
          <div className="card divide-y divide-cadence-border">
            {invoices.slice(0, 5).map((inv) => {
              const status = getInvoiceDueStatus(inv.due_date, inv.payment_status);
              return (
                <Link key={inv.id} to={`/dashboard/invoice/${inv.id}`} className="px-4 py-3 flex items-center gap-4 hover:bg-cadence-surface2 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-cadence-text">{inv.invoice_number || 'Untitled'}</p>
                    <p className="text-xs text-cadence-muted">{formatDate(inv.due_date)}</p>
                  </div>
                  <span className="text-sm font-mono text-cadence-text">{formatCurrency(inv.amount)}</span>
                  <span className={`badge ${status === 'overdue' ? 'badge-danger' : status === 'due_today' ? 'badge-warning' : status === 'paid' ? 'badge-success' : 'badge-muted'}`}>
                    {status === 'overdue' ? 'Overdue' : status === 'due_today' ? 'Due today' : status === 'paid' ? 'Paid' : 'Upcoming'}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <Outlet context={{ client, refetch: fetchData }} />
    </div>
  );
}
