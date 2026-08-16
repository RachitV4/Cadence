import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatRelativeTime, getInvoiceDueStatus, formatCurrency, formatDate } from '@/lib/utils';
import { EmptyState, LoadingState, StatusBadge } from '@/components/ui/Primitives';
import type { Client, Invoice, Contract, ActivityEvent, EmailDraft, ContractFinding } from '@/types';
import { UserPlus, FileText, Receipt, Lightbulb, ArrowRight, Clock, AlertTriangle, CheckCircle2, TrendingUp, ShieldAlert, AlertCircle, FileWarning } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export function Dashboard() {
  const { profile, organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [highRiskFindings, setHighRiskFindings] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    if (!organization) return;
    const [clientsRes, invoicesRes, contractsRes, activitiesRes, draftsRes, findingsRes] = await Promise.all([
      supabase.from('clients').select('*').eq('organization_id', organization.id).order('created_at', { ascending: false }),
      supabase.from('invoices').select('*, client:clients(name)').eq('organization_id', organization.id).order('created_at', { ascending: false }),
      supabase.from('contracts').select('*, client:clients(name)').eq('organization_id', organization.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('activity_events').select('*').eq('organization_id', organization.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('email_drafts').select('*, invoice:invoices(invoice_number, client:clients(name))').eq('organization_id', organization.id).eq('status', 'draft').order('created_at', { ascending: false }).limit(5),
      supabase.from('contract_findings')
        .select('*, contract:contracts(file_name, client:clients(name))')
        .eq('severity', 'high')
        .eq('dismissed', false)
        .order('created_at', { ascending: false })
        .limit(10)
    ]);
    
    setClients((clientsRes.data as Client[]) || []);
    setInvoices((invoicesRes.data as Invoice[]) || []);
    setContracts((contractsRes.data as Contract[]) || []);
    setActivities((activitiesRes.data as ActivityEvent[]) || []);
    setDrafts((draftsRes.data as EmailDraft[]) || []);
    setHighRiskFindings(findingsRes.data || []);
    setLoading(false);
  }, [organization]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const chartData = useMemo(() => {
    let overdue = 0;
    let pending = 0;
    let paid = 0;

    invoices.forEach(inv => {
      if (inv.payment_status === 'paid') {
        paid += inv.amount;
      } else {
        const status = getInvoiceDueStatus(inv.due_date, inv.payment_status);
        if (status === 'overdue') overdue += inv.amount;
        else pending += inv.amount;
      }
    });

    return [
      { name: 'Overdue', amount: overdue, color: '#ef4444' }, // cadence-danger
      { name: 'Pending', amount: pending, color: '#eab308' }, // cadence-warning
      { name: 'Paid', amount: paid, color: '#22c55e' } // cadence-success
    ];
  }, [invoices]);

  if (loading) return <LoadingState message="Loading your dashboard..." />;

  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const isEmpty = clients.length === 0;

  const overdueInvoices = invoices.filter((inv) => {
    const status = getInvoiceDueStatus(inv.due_date, inv.payment_status);
    return status === 'overdue';
  });

  const dueTodayInvoices = invoices.filter((inv) => {
    const status = getInvoiceDueStatus(inv.due_date, inv.payment_status);
    return status === 'due_today';
  });

  const completedSteps = [
    { label: 'Create client', done: clients.length > 0 },
    { label: 'Upload contract', done: contracts.length > 0 },
    { label: 'Upload invoice', done: invoices.length > 0 },
    { label: 'Get advice', done: drafts.length > 0 || invoices.some((i) => i.status === 'analyzed') },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-cadence-text tracking-tight">Command Center</h1>
          <p className="text-base text-cadence-secondary mt-1">Welcome back, {firstName}. Here's the latest on your receivables.</p>
        </div>
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content Column */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Cash Flow Visualizer */}
            <section className="card p-6 bg-gradient-to-br from-cadence-surface to-cadence-surface2 border-cadence-border/60 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-cadence-accent" />
                <h2 className="font-display text-lg font-bold text-cadence-text">Invoices by Status</h2>
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.2} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} dy={10} />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#71717a', fontSize: 12 }}
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                      dx={-10}
                    />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                      formatter={(value: number) => [formatCurrency(value), 'Amount']}
                    />
                    <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={60}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Smart Alerts / Risk Dashboard */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="w-5 h-5 text-cadence-danger" />
                <h2 className="font-display text-lg font-bold text-cadence-text">Smart Alerts & Risks</h2>
              </div>
              
              <div className="space-y-4">
                {highRiskFindings.length === 0 && overdueInvoices.length === 0 && (
                   <div className="card p-6 text-center bg-cadence-surface border-dashed border-cadence-border">
                     <CheckCircle2 className="w-8 h-8 text-cadence-success mx-auto mb-2 opacity-80" />
                     <p className="text-sm font-medium text-cadence-text">All clear!</p>
                     <p className="text-xs text-cadence-muted mt-1">No high-risk findings or overdue invoices.</p>
                   </div>
                )}

                {/* Overdue Invoice Alerts */}
                {overdueInvoices.map((inv) => {
                  const clientName = (inv as unknown as { client?: { name?: string } }).client?.name || 'Client';
                  return (
                    <Link
                      key={`overdue-${inv.id}`}
                      to={`/dashboard/invoice/${inv.id}`}
                      className="card p-4 flex items-start gap-4 hover:border-cadence-danger/50 transition-colors bg-cadence-dangerSoft/20"
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-cadence-dangerSoft">
                        <AlertCircle className="w-5 h-5 text-cadence-danger" />
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cadence-danger/10 text-cadence-danger border border-cadence-danger/20">Overdue Invoice</span>
                          <p className="text-sm font-semibold text-cadence-text truncate">{clientName}</p>
                        </div>
                        <p className="text-sm text-cadence-text font-medium mb-1">{inv.invoice_number} is past due</p>
                        <p className="text-xs text-cadence-muted">Amount: {formatCurrency(inv.amount)} · Due: {formatDate(inv.due_date)}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-cadence-muted self-center" />
                    </Link>
                  );
                })}

                {/* High Risk Contract Findings */}
                {highRiskFindings.map((finding) => {
                  const clientName = finding.contract?.client?.name || 'Unknown Client';
                  const fileName = finding.contract?.file_name || 'Contract';
                  return (
                    <Link
                      key={`finding-${finding.id}`}
                      to={`/dashboard/contract/${finding.contract_id}`}
                      className="card p-4 flex items-start gap-4 hover:border-cadence-warning/50 transition-colors bg-cadence-warningSoft/10"
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-cadence-warningSoft">
                        <FileWarning className="w-5 h-5 text-cadence-warning" />
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cadence-warning/10 text-cadence-warning border border-cadence-warning/20">High Risk Term</span>
                          <p className="text-sm font-semibold text-cadence-text truncate">{clientName}</p>
                        </div>
                        <p className="text-sm text-cadence-text font-medium mb-1">{finding.title}</p>
                        <p className="text-xs text-cadence-muted line-clamp-2">{finding.description}</p>
                        <p className="text-[10px] text-cadence-muted mt-2 uppercase tracking-wider font-mono">Found in: {fileName}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-cadence-muted self-center" />
                    </Link>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Right Sidebar Column */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Quick stats */}
            <section className="grid grid-cols-2 gap-3">
              <div className="card p-4 hover:border-cadence-border transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <UserPlus className="w-4 h-4 text-cadence-accent" />
                  <span className="text-xs font-mono text-cadence-muted">CLIENTS</span>
                </div>
                <p className="font-display text-2xl font-semibold text-cadence-text">{clients.length}</p>
              </div>
              <div className="card p-4 hover:border-cadence-border transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-cadence-accent" />
                  <span className="text-xs font-mono text-cadence-muted">CONTRACTS</span>
                </div>
                <p className="font-display text-2xl font-semibold text-cadence-text">{contracts.length}</p>
              </div>
              <div className="card p-4 col-span-2 flex items-center justify-between hover:border-cadence-border transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Receipt className="w-4 h-4 text-cadence-accent" />
                    <span className="text-xs font-mono text-cadence-muted">TOTAL INVOICES</span>
                  </div>
                  <p className="font-display text-2xl font-semibold text-cadence-text">{invoices.length}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-cadence-muted block mb-1">Total Value</span>
                  <p className="text-sm font-semibold text-cadence-success">{formatCurrency(invoices.reduce((sum, inv) => sum + inv.amount, 0))}</p>
                </div>
              </div>
            </section>

            {/* Needs attention (Due Today etc) */}
            {dueTodayInvoices.length > 0 && (
              <section>
                <h3 className="font-display text-sm font-semibold text-cadence-text mb-3 uppercase tracking-wider text-cadence-muted">Due Today</h3>
                <div className="space-y-2">
                  {dueTodayInvoices.map((inv) => {
                    const clientName = (inv as unknown as { client?: { name?: string } }).client?.name || 'Client';
                    return (
                      <Link
                        key={inv.id}
                        to={`/dashboard/invoice/${inv.id}`}
                        className="card p-3 flex items-center gap-3 hover:border-cadence-accent transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-cadence-warningSoft">
                          <Clock className="w-4 h-4 text-cadence-warning" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-cadence-text truncate">{clientName}</p>
                          <p className="text-xs text-cadence-muted">{formatCurrency(inv.amount)}</p>
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
                <h3 className="font-display text-sm font-semibold text-cadence-text mb-3 uppercase tracking-wider text-cadence-muted">Drafts to Review</h3>
                <div className="space-y-2">
                  {drafts.map((draft) => {
                    const inv = (draft as unknown as { invoice?: { invoice_number?: string; client?: { name?: string } } }).invoice;
                    return (
                      <Link
                        key={draft.id}
                        to={`/dashboard/invoice/${draft.invoice_id}`}
                        className="card p-3 flex items-center gap-3 hover:border-cadence-accent transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-cadence-accentSoft flex items-center justify-center shrink-0">
                          <Lightbulb className="w-4 h-4 text-cadence-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-cadence-text truncate">{inv?.client?.name || 'Client'}</p>
                          <p className="text-xs text-cadence-muted truncate">{draft.subject}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Recent activity */}
            <section>
              <h3 className="font-display text-sm font-semibold text-cadence-text mb-3 uppercase tracking-wider text-cadence-muted">Recent Activity</h3>
              {activities.length > 0 ? (
                <div className="card divide-y divide-cadence-border">
                  {activities.slice(0, 4).map((event) => (
                    <div key={event.id} className="p-3 flex items-start gap-3">
                      <div className="w-2 h-2 mt-1.5 rounded-full bg-cadence-accent shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-cadence-text">{event.event_title}</p>
                        <span className="text-[10px] text-cadence-muted shrink-0 block mt-0.5">{formatRelativeTime(event.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card p-4 text-center">
                  <p className="text-xs text-cadence-muted">No activity yet.</p>
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

