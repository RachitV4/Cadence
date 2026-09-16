import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { dedupeActivityEvents, formatDateTime } from '@/lib/utils';
import { PageLoadingState, EmptyState, Breadcrumbs } from '@/components/ui/Primitives';
import type { Client, ActivityEvent } from '@/types';
import { Activity as ActivityIcon, AlertTriangle, CheckCircle2, FileText, Mail, Receipt, RefreshCw } from 'lucide-react';

function eventPresentation(type: string) {
  if (type.includes('contract')) return { icon: FileText, className: 'bg-cadence-accentSoft text-cadence-accent' };
  if (type.includes('invoice')) return { icon: Receipt, className: 'bg-cadence-warningSoft text-cadence-warning' };
  if (type.includes('email') || type.includes('tone')) return { icon: Mail, className: 'bg-cadence-surface2 text-cadence-secondary' };
  if (type.includes('failed') || type.includes('missed')) return { icon: AlertTriangle, className: 'bg-cadence-dangerSoft text-cadence-danger' };
  return { icon: CheckCircle2, className: 'bg-cadence-successSoft text-cadence-success' };
}

function groupByDate(events: ActivityEvent[]): Record<string, ActivityEvent[]> {
  const groups: Record<string, ActivityEvent[]> = {};
  for (const event of events) {
    const date = new Date(event.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
    if (!groups[date]) groups[date] = [];
    groups[date].push(event);
  }
  return groups;
}

export function ClientActivity() {
  const { clientId } = useParams();
  const { organization } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(16);

  const fetchData = useCallback(async () => {
    if (!clientId || !organization) return;
    const [clientRes, eventsRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).maybeSingle(),
      supabase.from('activity_events').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
    ]);
    setClient(clientRes.data as Client | null);
    setEvents(dedupeActivityEvents((eventsRes.data as ActivityEvent[]) || []));
    setLoading(false);
  }, [clientId, organization]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading || !client) return <PageLoadingState title="Loading activity" message="Building the client timeline..." />;

  const grouped = groupByDate(events.slice(0, visibleCount));

  return (
    <div className="app-page max-w-5xl pb-10">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: client.name, href: `/dashboard/client/${client.id}` }, { label: 'Activity' }]} />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-cadence-text">Activity</h1>
          {events[0] && <p className="mt-1 text-xs text-cadence-muted">Last updated {formatDateTime(events[0].created_at)}</p>}
        </div>
        <button onClick={async () => { setRefreshing(true); await fetchData(); setRefreshing(false); }} disabled={refreshing} className="btn-secondary self-start sm:self-auto">
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {events.length === 0 ? (
        <EmptyState icon={<ActivityIcon className="w-6 h-6" />} title="No activity yet" description="Actions taken for this client will appear here in a timeline." />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dayEvents]) => (
            <div key={date}>
              <p className="text-xs font-mono uppercase tracking-wider text-cadence-muted mb-2">{date}</p>
              <div className="card divide-y divide-cadence-border">
                {dayEvents.map((event) => {
                  const presentation = eventPresentation(event.event_type);
                  const EventIcon = presentation.icon;
                  return (
                  <div key={event.id} className="flex items-start gap-3 px-4 py-3">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${presentation.className}`} title={event.event_type.replace(/_/g, ' ')}>
                      <EventIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-cadence-text">{event.event_title}</p>
                      {event.event_description && <p className="mt-0.5 break-words text-xs leading-relaxed text-cadence-muted">{event.event_description}</p>}
                    </div>
                    <span className="shrink-0 text-xs font-mono text-cadence-muted">{formatDateTime(event.created_at).split(', ').pop()}</span>
                  </div>
                )})}
              </div>
            </div>
          ))}
          {events.length > visibleCount && (
            <button onClick={() => setVisibleCount((count) => count + 16)} className="btn-secondary mx-auto block">Load more activity</button>
          )}
        </div>
      )}
    </div>
  );
}
