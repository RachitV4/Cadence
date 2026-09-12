import type { Invoice, PaymentEvent, PaymentPromise } from '@/types';

export interface SmartAlert {
  severity: 'medium' | 'high';
  title: string;
  message: string;
  recommendedAction: string;
}

const PRE_OVERDUE_WINDOW_DAYS = 3;
const PAYMENT_DELAY_RISK_THRESHOLD_DAYS = 3;

export function getSmartAlerts(
  invoice: Invoice,
  paymentHistory: PaymentEvent[],
  paymentPromise?: PaymentPromise | null,
  today = new Date(),
): SmartAlert[] {
  if (invoice.payment_status === 'paid' || !invoice.due_date) return [];

  const alerts: SmartAlert[] = [];
  const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (paymentPromise?.status === 'pending') {
    const promisedDate = new Date(`${paymentPromise.promised_date}T00:00:00`);
    if (!Number.isNaN(promisedDate.getTime())) {
      const daysUntilPromise = Math.round((promisedDate.getTime() - currentDate.getTime()) / 86_400_000);
      if (daysUntilPromise < 0) {
        alerts.push({
          severity: 'high',
          title: 'Payment promise missed',
          message: `The client promised payment by ${paymentPromise.promised_date}, but no payment has been recorded.`,
          recommendedAction: 'Follow up with the client regarding the missed payment promise.',
        });
      } else if (daysUntilPromise === 0) {
        alerts.push({
          severity: 'medium',
          title: 'Payment promise due today',
          message: 'The client’s promised payment date is today and payment has not yet been recorded.',
          recommendedAction: 'Monitor the invoice and be prepared to follow up.',
        });
      }
    }
  }

  const paymentEvents = paymentHistory.filter((event) => event.event_type === 'payment_received' || event.event_type === 'invoice_paid');
  if (!paymentEvents.length) return alerts;

  const averageDelay = paymentEvents.reduce((total, event) => total + event.days_late, 0) / paymentEvents.length;
  if (averageDelay < PAYMENT_DELAY_RISK_THRESHOLD_DAYS) return alerts;

  const dueDate = new Date(`${invoice.due_date}T00:00:00`);
  const daysUntilDue = Math.round((dueDate.getTime() - currentDate.getTime()) / 86_400_000);
  if (daysUntilDue < 0 || daysUntilDue > PRE_OVERDUE_WINDOW_DAYS) return alerts;

  const timing = daysUntilDue === 0
    ? 'The invoice is due today.'
    : daysUntilDue === 1
      ? 'The invoice is due tomorrow.'
      : `The invoice is due in ${daysUntilDue} days.`;

  alerts.push({
    severity: 'medium',
    title: 'Payment risk detected',
    message: `This client typically pays ${averageDelay % 1 ? averageDelay.toFixed(1) : averageDelay} days late. ${timing}`,
    recommendedAction: 'Consider sending a friendly pre-emptive payment check-in.',
  });

  return alerts;
}
