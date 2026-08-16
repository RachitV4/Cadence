import { useNotifications } from '@/hooks/useNotifications';
import { Breadcrumbs, LoadingState, EmptyState } from '@/components/ui/Primitives';
import { formatRelativeTime } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';

export function NotificationsPage() {
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();

  if (loading) return <LoadingState />;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Notifications' }]} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-cadence-text">Notifications</h1>
        {notifications.some((n) => !n.read) && (
          <button onClick={markAllAsRead} className="btn-ghost text-xs">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState icon={<Bell className="w-6 h-6" />} title="No notifications" description="You'll see invoice reminders, analysis updates, and other alerts here." />
      ) : (
        <div className="card divide-y divide-cadence-border">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`px-4 py-3 flex items-start gap-3 ${n.read ? '' : 'bg-cadence-accentSoft/20'}`}
            >
              <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${n.read ? 'bg-cadence-border' : 'bg-cadence-accent'}`} />
              <div className="flex-1 min-w-0" onClick={() => !n.read && markAsRead(n.id)}>
                <p className="text-sm font-medium text-cadence-text">{n.title}</p>
                {n.body && <p className="text-xs text-cadence-secondary mt-0.5">{n.body}</p>}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-cadence-muted">{formatRelativeTime(n.created_at)}</span>
                  {n.link && <Link to={n.link} className="text-xs text-cadence-accent hover:underline">View</Link>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
