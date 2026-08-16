import { supabase } from '@/lib/supabase';

export async function logActivity(
  organizationId: string,
  eventType: string,
  eventTitle: string,
  eventDescription: string = '',
  refs: { client_id?: string; contract_id?: string; invoice_id?: string } = {},
  metadata: Record<string, unknown> = {}
): Promise<void> {
  await supabase.from('activity_events').insert({
    organization_id: organizationId,
    event_type: eventType,
    event_title: eventTitle,
    event_description: eventDescription,
    ...refs,
    metadata,
  });
}

export async function createNotification(
  userId: string,
  organizationId: string,
  title: string,
  body: string,
  type: string = 'info',
  link: string = ''
): Promise<void> {
  await supabase.from('notifications').insert({
    user_id: userId,
    organization_id: organizationId,
    title,
    body,
    type,
    link,
  });
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(date: string): string {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getInvoiceAge(dueDate: string | null): number {
  if (!dueDate) return 0;
  const now = new Date();
  const due = new Date(dueDate);
  const diff = now.getTime() - due.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getInvoiceDueStatus(dueDate: string | null, paymentStatus: string): string {
  if (paymentStatus === 'paid') return 'paid';
  if (!dueDate) return 'no_due_date';
  const age = getInvoiceAge(dueDate);
  if (age === 0) return 'due_today';
  if (age > 0) return 'overdue';
  return 'upcoming';
}

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
