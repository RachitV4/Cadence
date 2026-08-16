import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_MAP: Record<string, { label: string; variant: string }> = {
  uploaded: { label: 'Uploaded', variant: 'badge-muted' },
  processing: { label: 'Processing', variant: 'badge-accent' },
  validating: { label: 'Validating', variant: 'badge-accent' },
  reading: { label: 'Reading', variant: 'badge-accent' },
  extracting: { label: 'Extracting', variant: 'badge-accent' },
  analyzing: { label: 'Analyzing', variant: 'badge-accent' },
  saving: { label: 'Saving', variant: 'badge-accent' },
  complete: { label: 'Complete', variant: 'badge-success' },
  failed: { label: 'Failed', variant: 'badge-danger' },
  found: { label: 'Found', variant: 'badge-success' },
  not_found: { label: 'Not found', variant: 'badge-muted' },
  needs_review: { label: 'Needs review', variant: 'badge-warning' },
  confirmed: { label: 'Confirmed', variant: 'badge-success' },
  pending: { label: 'Pending', variant: 'badge-muted' },
  draft: { label: 'Draft', variant: 'badge-muted' },
  sent: { label: 'Sent', variant: 'badge-success' },
  paid: { label: 'Paid', variant: 'badge-success' },
  unpaid: { label: 'Unpaid', variant: 'badge-muted' },
  overdue: { label: 'Overdue', variant: 'badge-danger' },
  due_today: { label: 'Due today', variant: 'badge-warning' },
  upcoming: { label: 'Upcoming', variant: 'badge-muted' },
  fulfilled: { label: 'Fulfilled', variant: 'badge-success' },
  missed: { label: 'Missed', variant: 'badge-danger' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_MAP[status] || { label: status, variant: 'badge-muted' };
  return <span className={cn(config.variant, className)}>{config.label}</span>;
}

export function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    low: 'badge-success',
    medium: 'badge-warning',
    high: 'badge-danger',
  };
  const variant = map[severity] || 'badge-muted';
  return <span className={variant}>{severity.charAt(0).toUpperCase() + severity.slice(1)}</span>;
}

export function ConfidenceBadge({ confidence }: { confidence: string }) {
  const map: Record<string, { label: string; variant: string }> = {
    high: { label: 'High confidence', variant: 'badge-success' },
    medium: { label: 'Medium confidence', variant: 'badge-muted' },
    low: { label: 'Needs review', variant: 'badge-warning' },
  };
  const config = map[confidence] || { label: confidence, variant: 'badge-muted' };
  return <span className={config.variant}>{config.label}</span>;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-cadence-surface2 flex items-center justify-center text-cadence-muted mb-4">
        {icon}
      </div>
      <h3 className="text-base font-medium text-cadence-text mb-1">{title}</h3>
      <p className="text-sm text-cadence-secondary max-w-sm mb-4">{description}</p>
      {action}
    </div>
  );
}

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex items-center gap-3 text-cadence-muted">
        <div className="w-4 h-4 border-2 border-cadence-border border-t-cadence-accent rounded-full animate-spin" />
        <span className="text-sm">{message}</span>
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-cadence-dangerSoft flex items-center justify-center text-cadence-danger mb-4">
        <span className="text-lg font-medium">!</span>
      </div>
      <p className="text-sm text-cadence-secondary mb-3">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary">
          Retry
        </button>
      )}
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-cadence-muted mb-2">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-cadence-border">/</span>}
          {item.href ? (
            <a href={item.href} className="hover:text-cadence-secondary transition-colors">
              {item.label}
            </a>
          ) : (
            <span className={i === items.length - 1 ? 'text-cadence-secondary' : ''}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
