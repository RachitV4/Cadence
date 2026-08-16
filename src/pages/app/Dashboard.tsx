import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatRelativeTime, getInvoiceDueStatus, formatCurrency, formatDate } from '@/lib/utils';
import { EmptyState, LoadingState, StatusBadge } from '@/components/ui/Primitives';
import type { Client, Invoice, Contract, ActivityEvent, EmailDraft } from '@/types';
import { UserPlus, FileText, Receipt, Lightbulb, ArrowRight, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

export function Dashboard() {
  const { profile, organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);

  const fetchData = useCallback(async () => {
    if (!organization) return;
    const [clientsRes, invoicesRes, contractsRes, activitiesRes, draftsRes] = await Promise.all([
      supabase.from('clients').select('*').eq('organization_id', organization.id).order('created_at', { ascending: false }),
      supabase.from('invoices').select('*, client:clients(name)').eq('organization_id', organization.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('contracts').select('*, client:clients(name)').eq('organization_id', organization.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('activity_events').select('*').eq('organization_id', organization.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('email_drafts').select('*, invoice:invoices(invoice_number, client:clients(name))').eq('organization_id', organization.id).eq('status', 'draft').order('created_at', { ascending: false }).limit(5),
    ]);
    setClients((clientsRes.data as Client[]) || []);
    setInvoices((invoicesRes.data as Invoice[]) || []);
    setContracts((contractsRes.data as Contract[]) || []);
    setActivities((activitiesRes.data as ActivityEvent[]) || []);
    setDrafts((draftsRes.data as EmailDraft[]) || []);
    setLoading(false);
  }, [organization]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <LoadingState message="Loading your dashboard..." />;

  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const isEmpty = clients.length === 0;

  const attentionItems = invoices.filter((inv) => {
    const status = getInvoiceDueStatus(inv.due_date, inv.payment_status);
    return status === 'overdue' || status === 'due_today';
  });

  const completedSteps = [
    { label: 'Create client', done: clients.length > 0 },
    { label: 'Upload contract', done: contracts.length > 0 },
    { label: 'Upload invoice', done: invoices.length > 0 },
    { label: 'Get advice', done: drafts.length > 0 || invoices.some((i) => i.status === 'analyzed') },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-cadence-text">Dashboard</h1>
        <p className="text-sm text-cadence-secondary mt-1">Welcome back, {firstName}. Here's what needs your attention.</p>
      </div>

      {isEmpty ? (
        <div className="card p-8">
          <EmptyState
            icon={<UserPlus className="w-6 h-6" />}
            title="Your Cadence workspace is ready"
            description="Start with a client and we'll remember the rest — contracts, invoices, advice, and drafts."
            action={
              <Link to="/dashboard/client/new" className="btn-primary">
                Create client <ArrowRight className="w-4 h-4" />
              </Link>
            }
          />
          <div className="mt-8 pt-6 border-t border-cadence-border">
            <p className="text-xs font-mono uppercase tracking-wider text-cadence-muted mb-4">Getting started</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {completedSteps.map((step, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step.done ? 'bg-cadence-successSoft' : 'bg-cadence-surface2 border border-cadence-border'}`}>
                    {step.done ? <CheckCircle2 className="w-4 h-4 text-cadence-success" /> : <span className="text-xs font-mono text-cadence-muted">{i + 1}</span>}
                  </div>
                  <span className={`text-sm ${step.done ? 'text-cadence-text' : 'text-cadence-muted'}`}>{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Needs attention */}
          {attentionItems.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-semibold text-cadence-text mb-3">Needs your attention</h2>
              <div className="space-y-2">
                {attentionItems.map((inv) => {
                  const status = getInvoiceDueStatus(inv.due_date, inv.payment_status);
                  const clientName = (inv as unknown as { client?: { name?: string } }).client?.name || 'Client';
                  return (
                    <Link
                      key={inv.id}
                      to={`/dashboard/invoice/${inv.id}`}
                      className="card p-4 flex items-center gap-4 hover:border-cadence-accent transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${status === 'overdue' ? 'bg-cadence-dangerSoft' : 'bg-cadence-warningSoft'}`}>
                        {status === 'overdue' ? <AlertTriangle className="w-5 h-5 text-cadence-danger" /> : <Clock className="w-5 h-5 text-cadence-warning" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-cadence-text">{clientName}</p>
                        <p className="text-xs text-cadence-muted">{inv.invoice_number} · {formatCurrency(inv.amount)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={status} />
                        <span className="text-xs text-cadence-muted hidden sm:block">{formatDate(inv.due_date)}</span>
                        <ArrowRight className="w-4 h-4 text-cadence-muted" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Drafts awaiting review */}
          {drafts.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-semibold text-cadence-text mb-3">Drafts awaiting review</h2>
              <div className="space-y-2">
                {drafts.map((draft) => {
                  const inv = (draft as unknown as { invoice?: { invoice_number?: string; client?: { name?: string } } }).invoice;
                  return (
                    <Link
                      key={draft.id}
                      to={`/dashboard/invoice/${draft.invoice_id}`}
                      className="card p-4 flex items-center gap-4 hover:border-cadence-accent transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-cadence-accentSoft flex items-center justify-center shrink-0">
                        <Lightbulb className="w-5 h-5 text-cadence-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-cadence-text">{inv?.client?.name || 'Client'}</p>
                        <p className="text-xs text-cadence-muted truncate">{draft.subject}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-cadence-muted" />
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Recent activity */}
          <section>
            <h2 className="font-display text-lg font-semibold text-cadence-text mb-3">Recent activity</h2>
            {activities.length > 0 ? (
              <div className="card divide-y divide-cadence-border">
                {activities.slice(0, 5).map((event) => (
                  <div key={event.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-cadence-accent shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-cadence-text">{event.event_title}</p>
                      {event.event_description && <p className="text-xs text-cadence-muted">{event.event_description}</p>}
                    </div>
                    <span className="text-xs text-cadence-muted shrink-0">{formatRelativeTime(event.created_at)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card p-6 text-center">
                <p className="text-sm text-cadence-muted">No activity yet.</p>
              </div>
            )}
          </section>

          {/* Quick stats */}
          <section className="grid sm:grid-cols-3 gap-4">
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-2">
                <UserPlus className="w-4 h-4 text-cadence-muted" />
                <span className="text-xs font-mono text-cadence-muted">CLIENTS</span>
              </div>
              <p className="font-display text-2xl font-semibold text-cadence-text">{clients.length}</p>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-cadence-muted" />
                <span className="text-xs font-mono text-cadence-muted">CONTRACTS</span>
              </div>
              <p className="font-display text-2xl font-semibold text-cadence-text">{contracts.length}</p>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-2">
                <Receipt className="w-4 h-4 text-cadence-muted" />
                <span className="text-xs font-mono text-cadence-muted">INVOICES</span>
              </div>
              <p className="font-display text-2xl font-semibold text-cadence-text">{invoices.length}</p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
