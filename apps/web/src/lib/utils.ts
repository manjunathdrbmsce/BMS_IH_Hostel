import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(date);
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '...';
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-700',
    INACTIVE: 'bg-gray-100 text-gray-600',
    SUSPENDED: 'bg-red-100 text-red-700',
    PENDING_VERIFICATION: 'bg-amber-100 text-amber-700',
    AVAILABLE: 'bg-emerald-100 text-emerald-700',
    FULL: 'bg-blue-100 text-blue-700',
    UNDER_MAINTENANCE: 'bg-amber-100 text-amber-700',
    CLOSED: 'bg-gray-100 text-gray-600',
    VACANT: 'bg-emerald-100 text-emerald-700',
    OCCUPIED: 'bg-blue-100 text-blue-700',
    RESERVED: 'bg-purple-100 text-purple-700',
  };
  return map[status] || 'bg-gray-100 text-gray-600';
}

export function roleColor(role: string): string {
  const map: Record<string, string> = {
    SUPER_ADMIN: 'bg-red-100 text-red-700 border-red-200',
    HOSTEL_ADMIN: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    WARDEN: 'bg-blue-100 text-blue-700 border-blue-200',
    DEPUTY_WARDEN: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    ACCOUNTS_OFFICER: 'bg-amber-100 text-amber-700 border-amber-200',
    MESS_MANAGER: 'bg-orange-100 text-orange-700 border-orange-200',
    MESS_STAFF: 'bg-lime-100 text-lime-700 border-lime-200',
    SECURITY_GUARD: 'bg-slate-100 text-slate-700 border-slate-200',
    MAINTENANCE_STAFF: 'bg-stone-100 text-stone-700 border-stone-200',
    STUDENT: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    PARENT: 'bg-violet-100 text-violet-700 border-violet-200',
  };
  return map[role] || 'bg-gray-100 text-gray-600 border-gray-200';
}
