import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { dedupeActivityEvents, formatRelativeTime, getInvoiceDueStatus, formatCurrency, formatDate } from '@/lib/utils';
import { EmptyState, PageLoadingState } from '@/components/ui/Primitives';
import { AutopilotTerminal } from '@/components/AutopilotTerminal';
import type { Client, Invoice, InvoiceAnalysis, Contract, ActivityEvent, EmailDraft, ContractFinding } from '@/types';
import { UserPlus, FileText, Receipt, Lightbulb, ArrowRight, Clock, CheckCircle2, TrendingUp, ShieldAlert, AlertCircle, FileWarning, Activity, Globe, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';

type HighRiskFinding = ContractFinding & {
  contract?: { client_id?: string; file_name?: string; client?: { name?: string } };
};

type DashboardInvoice = Invoice & {
  client?: { name?: string } | null;
  invoice_analysis?: InvoiceAnalysis[];
};

type InsightPage = {
  title: string;
  description: string;
  entries: Array<{ label: string; value: string }>;
  source?: { label: string; url: string };
};

// These concise reference cards deliberately rotate per dashboard visit. They are
// product guidance, not a live Chamber of Commerce or third-party data feed.
const INSIGHT_PAGES: InsightPage[] = [
  {
    title: 'Make payment requests actionable',
    description: 'A clear request gives finance teams what they need to act',
    entries: [
      { label: 'Identify the invoice', value: 'Number + amount' },
      { label: 'State the due date', value: 'Use the agreed date' },
      { label: 'Ask one clear question', value: 'Expected payment date' },
      { label: 'Include a payment route', value: 'Link or instructions' },
    ],
  },
  {
    title: 'Follow-up timing',
    description: 'A practical rhythm for invoices that need attention',
    entries: [
      { label: 'Before the due date', value: 'Confirm receipt' },
      { label: 'Due date', value: 'Request a payment date' },
      { label: '7 days overdue', value: 'Reference terms' },
      { label: '14 days overdue', value: 'Escalate calmly' },
    ],
  },
  {
    title: 'Contract checkpoints',
    description: 'Terms worth confirming before a payment follow-up',
    entries: [
      { label: 'Payment terms', value: 'Verify due date' },
      { label: 'Late fee', value: 'Use only if applicable' },
      { label: 'Milestones', value: 'Confirm deliverable status' },
      { label: 'Termination', value: 'Check notice period' },
    ],
  },
  {
    title: 'Collection habits',
    description: 'Small details that make payment requests easier to act on',
    entries: [
      { label: 'Identify the invoice', value: 'Number + amount' },
      { label: 'Ask one clear question', value: 'Payment date' },
      { label: 'Match the relationship', value: 'Use the right tone' },
      { label: 'Record commitments', value: 'Track promises' },
    ],
  },
  {
    title: 'Handle payment promises carefully',
    description: 'A commitment is useful only when it has enough context',
    entries: [
      { label: 'Capture the date', value: 'Use a specific day' },
      { label: 'Record the amount', value: 'Full or partial payment' },
      { label: 'Keep supporting notes', value: 'Source and context' },
      { label: 'Follow up after a miss', value: 'Reference the promise' },
    ],
  },
  {
    title: 'Respond to disputes first',
    description: 'Resolve uncertainty before escalating a collection request',
    entries: [
      { label: 'Acknowledge the concern', value: 'Stay factual' },
      { label: 'Check the agreement', value: 'Terms and milestones' },
      { label: 'Confirm the next owner', value: 'One clear contact' },
      { label: 'Document the outcome', value: 'Keep the timeline' },
    ],
  },
  {
    title: 'India: eligible MSE payment window',
    description: 'A jurisdiction-specific reference; confirm eligibility and contract terms',
    entries: [
      { label: 'Maximum payment period', value: '45 days' },
      { label: 'Supplier scope', value: 'Eligible micro / small enterprise' },
      { label: 'Timing starts from', value: 'Acceptance of goods or services' },
    ],
    source: { label: 'India MSME delayed-payment guidance', url: 'https://ramp.msme.gov.in/ramp/pdf-documents/scheme-guidelines/msefc.pdf' },
  },
  {
    title: 'India: delayed-payment interest',
    description: 'A jurisdiction-specific reference; seek advice before asserting a remedy',
    entries: [
      { label: 'Statutory measure', value: '3× bank rate' },
      { label: 'Calculation basis', value: 'Compound interest' },
      { label: 'Payment frequency', value: 'Monthly rests' },
    ],
    source: { label: 'India MSME delayed-payment guidance', url: 'https://ramp.msme.gov.in/ramp/pdf-documents/scheme-guidelines/msefc.pdf' },
  },
  {
    title: 'EU: public-authority payment terms',
    description: 'A jurisdiction-specific reference for commercial transactions',
    entries: [
      { label: 'Standard payment deadline', value: '30 days' },
      { label: 'Exceptional extension', value: 'Up to 60 days' },
      { label: 'Applies to', value: 'Public authorities' },
    ],
    source: { label: 'European Commission late-payment guidance', url: 'https://single-market-economy.ec.europa.eu/smes/challenges-and-resilience/late-payment_en' },
  },
  {
    title: 'EU: business-to-business terms',
    description: 'A jurisdiction-specific reference for commercial transactions',
    entries: [
      { label: 'Default maximum term', value: '60 days' },
      { label: 'Longer terms require', value: 'Express agreement' },
      { label: 'Creditor safeguard', value: 'Cannot be grossly unfair' },
    ],
    source: { label: 'European Commission late-payment guidance', url: 'https://single-market-economy.ec.europa.eu/smes/challenges-and-resilience/late-payment_en' },
  },
];

export function Dashboard() {
  const { profile, organization } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<DashboardInvoice[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [highRiskFindings, setHighRiskFindings] = useState<HighRiskFinding[]>([]);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dataError, setDataError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [insightIndex] = useState(() => Math.floor(Math.random() * INSIGHT_PAGES.length));

  const fetchData = useCallback(async () => {
    if (!organization) return;
    setDataError('');
    const [clientsRes, invoicesRes, contractsRes, activitiesRes, draftsRes, findingsRes] = await Promise.all([
      supabase.from('clients').select('*').eq('organization_id', organization.id).order('created_at', { ascending: false }),
      supabase.from('invoices').select('*, client:clients(name), invoice_analysis(*)').eq('organization_id', organization.id).order('created_at', { ascending: false }),
      supabase.from('contracts').select('*, client:clients(name)').eq('organization_id', organization.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('activity_events').select('*').eq('organization_id', organization.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('email_drafts').select('*, invoice:invoices(invoice_number, client:clients(name))').eq('organization_id', organization.id).eq('status', 'draft').order('created_at', { ascending: false }).limit(5),
      supabase.from('contract_findings')
        .select('*, contract:contracts!inner(client_id, file_name, client:clients(name))')
        .eq('contract.organization_id', organization.id)
        .eq('severity', 'high')
        .eq('dismissed', false)
        .order('created_at', { ascending: false })
        .limit(10)
    ]);
    const firstError = [clientsRes, invoicesRes, contractsRes, activitiesRes, draftsRes, findingsRes].find((result) => result.error)?.error;
    if (firstError) setDataError(firstError.message);
    
    const allClients = (clientsRes.data as Client[]) || [];
    const activeClients = allClients.filter(c => !(c.notes || '').startsWith('[ARCHIVED]'));
    const activeClientIds = new Set(activeClients.map((client) => client.id));
    
    setClients(activeClients);
    setInvoices(((invoicesRes.data as DashboardInvoice[]) || []).filter(inv => {
      const c = allClients.find(c => c.id === inv.client_id);
      return c && !(c.notes || '').startsWith('[ARCHIVED]');
    }));
    setContracts(((contractsRes.data as Contract[]) || []).filter(con => {
      const c = allClients.find(c => c.id === con.client_id);
      return c && !(c.notes || '').startsWith('[ARCHIVED]');
    }));
    setActivities(dedupeActivityEvents(((activitiesRes.data as ActivityEvent[]) || []).filter(act => {
      // Organization-level events have no client_id. Any client-linked event must
      // belong to a current, non-archived client before it reaches the dashboard.
      return !act.client_id || activeClientIds.has(act.client_id);
    })));
    setDrafts(((draftsRes.data as EmailDraft[]) || []).filter(draft => {
      const c = allClients.find(c => c.id === draft.client_id);
      return c && !(c.notes || '').startsWith('[ARCHIVED]');
    }));
    setHighRiskFindings(((findingsRes.data as HighRiskFinding[]) || []).filter(finding => {
      // The finding query joins its real contract, rather than relying on the
      // five-item contract preview list used elsewhere on this page.
      return Boolean(finding.contract?.client_id && activeClientIds.has(finding.contract.client_id));
    }));
    setLastRefreshed(new Date());
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

  const riskChartData = useMemo(() => {
    let high = 0;
    let medium = 0;
    let low = 0;

    invoices.forEach(inv => {
      if (inv.payment_status !== 'paid') {
        const analysis = inv.invoice_analysis?.[0] ?? null;
        if (analysis?.risk_level === 'high') high += inv.amount;
        else if (analysis?.risk_level === 'medium') medium += inv.amount;
        else low += inv.amount;
      }
    });

    return [
      { name: 'High Risk', amount: high, color: '#e11d48' },
      { name: 'Medium Risk', amount: medium, color: '#f59e0b' },
      { name: 'Low Risk', amount: low, color: '#10b981' }
    ];
  }, [invoices]);

  const clientRisks = useMemo(() => {
    return clients.map(client => {
      const clientInvoices = invoices.filter(inv => inv.client_id === client.id);
      let totalDelay = 0;
      let counted = 0;
      
      clientInvoices.forEach(inv => {
        if (inv.due_date) {
          const due = new Date(inv.due_date).getTime();
          const end = inv.payment_status === 'paid' && inv.paid_date 
            ? new Date(inv.paid_date).getTime() 
            : new Date().getTime();
          
          if (end > due) {
            totalDelay += (end - due) / (1000 * 3600 * 24);
          }
          counted++;
        }
      });
      
      const avgDelay = counted > 0 ? Math.round(totalDelay / counted) : 0;
      return { client, avgDelay };
    }).sort((a, b) => b.avgDelay - a.avgDelay);
  }, [clients, invoices]);

  if (loading) return <PageLoadingState title="Loading your dashboard" message="Calculating receivables and risks..." />;

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

  const insightPage = INSIGHT_PAGES[insightIndex];

  const completedSteps = [
    { label: 'Create client', done: clients.length > 0 },
    { label: 'Upload contract', done: contracts.length > 0 },
    { label: 'Upload invoice', done: invoices.length > 0 },
    { label: 'Get advice', done: drafts.length > 0 || invoices.some((i) => i.status === 'analyzed') },
  ];
  const overdueTotal = overdueInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const outstandingTotal = invoices.filter((invoice) => invoice.payment_status !== 'paid').reduce((sum, invoice) => sum + invoice.amount, 0);
  const paidTotal = invoices.filter((invoice) => invoice.payment_status === 'paid').reduce((sum, invoice) => sum + invoice.amount, 0);

  return (
    <div className="app-page max-w-6xl">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-cadence-text tracking-tight">Command Center</h1>
          <p className="text-base text-cadence-secondary mt-1">Welcome back, {firstName}. Here's the latest on your receivables.</p>
          {lastRefreshed && <p className="mt-1 text-xs text-cadence-muted">Updated {formatRelativeTime(lastRefreshed.toISOString())}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button onClick={async () => { setRefreshing(true); await fetchData(); setRefreshing(false); }} disabled={refreshing} className="btn-secondary" title="Refresh dashboard">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button 
            onClick={async () => {
              try {
                showToast('Syncing to Google Sheets...', 'info');
                const { data: { session } } = await supabase.auth.getSession();
                const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-sheets`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    organizationId: organization?.id,
                    providerToken: session?.provider_token
                  }),
                });
                if (!res.ok) throw new Error('Failed to sync');
                const data = await res.json();
                window.open(data.spreadsheetUrl, '_blank');
                showToast('Successfully synced to Google Sheets!', 'success');
              } catch {
                showToast('Failed to sync. Please re-login with Google to grant Sheets permission.', 'error');
              }
            }}
            className="btn-secondary flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-[#0F9D58]" viewBox="0 0 24 24"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 14H7v-2h10v2zm0-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
            Sync to Sheets
          </button>
          <button 
            onClick={async () => {
              try {
                setIsTerminalOpen(true);
                setIsSimulating(true);
                const { data: { session } } = await supabase.auth.getSession();
                const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/daily-scan`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ 
                    organizationId: organization?.id,
                    slackWebhookUrl: localStorage.getItem('cadence_slack_webhook')
                  }),
                });
                if (!res.ok) throw new Error('Scan failed');
                const data = await res.json();
                
                // wait slightly so terminal finishes at least some animation
                setTimeout(() => {
                  showToast(data.draftsCreated > 0 ? `Autopilot generated ${data.draftsCreated} drafts!` : 'Scan complete. No action needed.', 'success');
                  fetchData();
                }, 12000); // 12 seconds aligns perfectly with the visual terminal simulation sequence
                
              } catch {
                showToast('Autopilot scan failed.', 'error');
                setIsSimulating(false);
              }
            }}
            className="btn-secondary flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-cadence-muted" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14h-2v-2h2zm0-4h-2V7h2z"/></svg>
            Run Autopilot
          </button>
        </div>
      </div>

      {dataError && (
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-cadence-danger/20 bg-cadence-dangerSoft p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-cadence-danger">Some dashboard data could not be refreshed.</p>
            <p className="mt-1 text-xs text-cadence-secondary">{dataError}</p>
          </div>
          <button onClick={fetchData} className="btn-secondary self-start sm:self-auto">Try again</button>
        </div>
      )}

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
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.1 } }
          }}
        >
          {/* Main Content Column */}
          <div className="lg:col-span-8 space-y-8">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="card p-4">
                <p className="text-xs font-mono uppercase tracking-wider text-cadence-muted">Outstanding</p>
                <p className="mt-2 break-words font-display text-xl font-semibold text-cadence-text">{formatCurrency(outstandingTotal)}</p>
              </div>
              <div className="card p-4">
                <p className="text-xs font-mono uppercase tracking-wider text-cadence-muted">Overdue</p>
                <p className="mt-2 break-words font-display text-xl font-semibold text-cadence-danger">{formatCurrency(overdueTotal)}</p>
              </div>
              <div className="card p-4">
                <p className="text-xs font-mono uppercase tracking-wider text-cadence-muted">Paid</p>
                <p className="mt-2 break-words font-display text-xl font-semibold text-cadence-success">{formatCurrency(paidTotal)}</p>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cash Flow Visualizer */}
              <motion.section variants={{hidden: {opacity:0, y:20}, show: {opacity:1, y:0, transition:{type:'spring',stiffness:300,damping:24}}}} className="card p-6 bg-gradient-to-br from-cadence-surface to-cadence-surface2 border-cadence-border/60 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="w-5 h-5 text-cadence-accent" />
                  <h2 className="font-display text-lg font-bold text-cadence-text">Invoices by Status</h2>
                </div>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(var(--color-border))" opacity={0.6} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgb(var(--color-muted))', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgb(var(--color-muted))', fontSize: 12 }} tickFormatter={(value) => `$${(value/1000)}k`} dx={-10} />
                      <Tooltip 
                        cursor={{ fill: 'transparent' }} 
                        contentStyle={{ backgroundColor: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))', borderRadius: '8px', color: 'rgb(var(--color-text))' }}
                        formatter={(value) => [formatCurrency(Number(Array.isArray(value) ? value[0] : value ?? 0)), 'Amount'] as [string, string]} 
                      />
                      <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={40}>
                        {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.section>

              {/* Financial Pulse (Risk Level) */}
              <motion.section variants={{hidden: {opacity:0, y:20}, show: {opacity:1, y:0, transition:{type:'spring',stiffness:300,damping:24}}}} className="card p-6 bg-gradient-to-br from-cadence-surface to-cadence-surface2 border-cadence-border/60 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <Activity className="w-5 h-5 text-[#f59e0b]" />
                  <h2 className="font-display text-lg font-bold text-cadence-text">Total Cash at Risk</h2>
                </div>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={riskChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(var(--color-border))" opacity={0.6} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgb(var(--color-muted))', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgb(var(--color-muted))', fontSize: 12 }} tickFormatter={(value) => `$${(value/1000)}k`} dx={-10} />
                      <Tooltip 
                        cursor={{ fill: 'transparent' }} 
                        contentStyle={{ backgroundColor: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))', borderRadius: '8px', color: 'rgb(var(--color-text))' }}
                        formatter={(value) => [formatCurrency(Number(Array.isArray(value) ? value[0] : value ?? 0)), 'Amount'] as [string, string]} 
                      />
                      <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={40}>
                        {riskChartData.map((entry, index) => <Cell key={`risk-cell-${index}`} fill={entry.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.section>
            </div>

            {/* Smart Alerts / Risk Dashboard */}
            <motion.section variants={{hidden: {opacity:0, y:20}, show: {opacity:1, y:0, transition:{type:'spring',stiffness:300,damping:24}}}}>
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
            </motion.section>

            <motion.section variants={{hidden: {opacity:0, y:20}, show: {opacity:1, y:0, transition:{type:'spring',stiffness:300,damping:24}}}} className="card p-6 bg-gradient-to-br from-cadence-surface to-cadence-surface2 border-cadence-border/60 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-6">
                <Activity className="w-5 h-5 text-cadence-accent" />
                <h2 className="font-display text-lg font-bold text-cadence-text">Client Risk Heatmap</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {clientRisks.map(({ client, avgDelay }) => {
                  let bgColor = 'bg-cadence-successSoft/30 border-cadence-success/20 text-cadence-success';
                  if (avgDelay > 14) {
                    bgColor = 'bg-cadence-dangerSoft/30 border-cadence-danger/20 text-cadence-danger';
                  } else if (avgDelay > 5) {
                    bgColor = 'bg-cadence-warningSoft/30 border-cadence-warning/20 text-cadence-warning';
                  }
                  
                  return (
                    <div key={client.id} className={`p-4 rounded-xl border ${bgColor} flex flex-col justify-between transition-all hover:scale-[1.02]`}>
                      <span className="font-semibold text-sm truncate mb-2">{client.name}</span>
                      <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold font-mono">{avgDelay}</span>
                        <span className="text-[10px] uppercase tracking-wider opacity-80 mb-1 font-bold">Days Late</span>
                      </div>
                    </div>
                  );
                })}
                {clientRisks.length === 0 && (
                   <div className="col-span-full text-center py-6 text-cadence-muted text-sm border border-dashed border-cadence-border rounded-xl">
                     No clients available to score.
                   </div>
                )}
              </div>
            </motion.section>
          </div>

          {/* Right Sidebar Column */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Quick stats */}
            <motion.section variants={{hidden: {opacity:0, y:20}, show: {opacity:1, y:0, transition:{type:'spring',stiffness:300,damping:24}}}} className="grid grid-cols-2 gap-3">
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
            </motion.section>

            {/* Needs attention (Due Today etc) */}
            {dueTodayInvoices.length > 0 && (
              <motion.section variants={{hidden: {opacity:0, y:20}, show: {opacity:1, y:0, transition:{type:'spring',stiffness:300,damping:24}}}}>
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
              </motion.section>
            )}

            {/* Drafts awaiting review */}
            {drafts.length > 0 && (
              <motion.section variants={{hidden: {opacity:0, y:20}, show: {opacity:1, y:0, transition:{type:'spring',stiffness:300,damping:24}}}}>
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
              </motion.section>
            )}

            {/* Rotates when the dashboard is mounted again. */}
            <motion.section variants={{hidden: {opacity:0, y:20}, show: {opacity:1, y:0, transition:{type:'spring',stiffness:300,damping:24}}}}>

              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-sm font-semibold text-cadence-text uppercase tracking-wider text-cadence-muted">Industry Insights</h3>
                <Globe className="w-4 h-4 text-cadence-muted" />
              </div>
              <div className="card p-4 space-y-4">
                <div>
                  <p className="text-sm font-medium text-cadence-text">{insightPage.title}</p>
                  <p className="mt-1 text-xs text-cadence-muted">{insightPage.description}</p>
                </div>
                {insightPage.entries.map((insight) => (
                  <div key={insight.label} className="flex items-center justify-between border-b border-cadence-border/50 last:border-0 pb-2 last:pb-0">
                    <span className="text-sm text-cadence-text font-medium">{insight.label}</span>
                    <span className="text-xs font-mono px-2 py-1 rounded bg-cadence-surface2 text-cadence-muted">
                      {insight.value}
                    </span>
                  </div>
                ))}
                {insightPage.source && (
                  <a
                    className="block pt-1 text-xs text-cadence-accent hover:underline"
                    href={insightPage.source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Official source: {insightPage.source.label}
                  </a>
                )}
              </div>
            </motion.section>

            {/* Recent activity */}
            <motion.section variants={{hidden: {opacity:0, y:20}, show: {opacity:1, y:0, transition:{type:'spring',stiffness:300,damping:24}}}}>
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
            </motion.section>
          </div>
        </motion.div>
      )}
      
      <AutopilotTerminal 
        isOpen={isTerminalOpen} 
        onClose={() => setIsTerminalOpen(false)} 
        isSimulating={isSimulating} 
      />
    </div>
  );
}

