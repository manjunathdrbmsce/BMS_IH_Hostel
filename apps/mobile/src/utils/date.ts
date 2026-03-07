import { format, formatDistanceToNow, parseISO, isToday, isYesterday, differenceInDays } from 'date-fns';

/**
 * Formats an ISO date string to a readable date.
 * @example formatDate('2026-03-03T10:00:00Z') → 'Mar 3, 2026'
 */
export function formatDate(dateStr: string | null | undefined, pattern = 'MMM d, yyyy'): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), pattern);
  } catch {
    return dateStr;
  }
}

/**
 * Formats an ISO date string to a readable time.
 * @example formatTime('2026-03-03T10:30:00Z') → '10:30 AM'
 */
export function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'h:mm a');
  } catch {
    return dateStr;
  }
}

/**
 * Formats an ISO date string to a date + time.
 * @example formatDateTime('2026-03-03T10:30:00Z') → 'Mar 3, 2026 at 10:30 AM'
 */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), "MMM d, yyyy 'at' h:mm a");
  } catch {
    return dateStr;
  }
}

/**
 * Formats a relative time string.
 * @example formatRelative('2026-03-03T10:00:00Z') → '2 hours ago'
 */
export function formatRelative(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

/**
 * Returns a smart date label: "Today", "Yesterday", or the formatted date.
 */
export function smartDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

/**
 * Formats a date range.
 * @example formatDateRange('2026-03-03', '2026-03-07') → 'Mar 3 – 7, 2026'
 */
export function formatDateRange(from: string | null | undefined, to: string | null | undefined): string {
  if (!from || !to) return '—';
  try {
    const fromDate = parseISO(from);
    const toDate = parseISO(to);
    const days = differenceInDays(toDate, fromDate) + 1;

    if (format(fromDate, 'yyyy-MM') === format(toDate, 'yyyy-MM')) {
      // Same month
      return `${format(fromDate, 'MMM d')} – ${format(toDate, 'd, yyyy')} (${days}d)`;
    }
    return `${format(fromDate, 'MMM d')} – ${format(toDate, 'MMM d, yyyy')} (${days}d)`;
  } catch {
    return `${from} – ${to}`;
  }
}

/**
 * Returns the number of days between two dates (inclusive).
 */
export function daysBetween(from: string, to: string): number {
  try {
    return differenceInDays(parseISO(to), parseISO(from)) + 1;
  } catch {
    return 0;
  }
}
