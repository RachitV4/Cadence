import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDateTime } from '@/lib/utils';
import { LoadingState, EmptyState, Breadcrumbs } from '@/components/ui/Primitives';
import type { Client, ActivityEvent } from '@/types';
import { Activity as ActivityIcon } from 'lucide-react';

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

  const fetchData = useCallback(async () => {
    if (!clientId || !organization) return;
    const [clientRes, eventsRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).maybeSingle(),
      supabase.from('activity_events').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
    ]);
    setClient(clientRes.data as Client | null);
    setEvents((eventsRes.data as ActivityEvent[]) || []);
    setLoading(false);
  }, [clientId, organization]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <LoadingState />;
  if (!client) return <LoadingState />;

  const grouped = groupByDate(events);

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: client.name, href: `/dashboard/client/${client.id}` }, { label: 'Activity' }]} />
      <h1 className="font-display text-2xl font-semibold text-cadence-text mb-6">Activity</h1>

      {events.length === 0 ? (
        <EmptyState icon={<ActivityIcon className="w-6 h-6" />} title="No activity yet" description="Actions taken for this client will appear here in a timeline." />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dayEvents]) => (
            <div key={date}>
              <p className="text-xs font-mono uppercase tracking-wider text-cadence-muted mb-2">{date}</p>
              <div className="card divide-y divide-cadence-border">
                {dayEvents.map((event) => (
                  <div key={event.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-cadence-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-cadence-text">{event.event_title}</p>
                      {event.event_description && <p className="text-xs text-cadence-muted mt-0.5">{event.event_description}</p>}
                    </div>
                    <span className="text-xs font-mono text-cadence-muted shrink-0">{formatDateTime(event.created_at).split(', ').pop()}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
