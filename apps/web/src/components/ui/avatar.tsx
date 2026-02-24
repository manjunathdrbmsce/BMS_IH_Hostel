import { cn, getInitials } from '@/lib/utils';

export interface AvatarProps {
  /** Full name like "John Doe" — splits into first/last automatically */
  name?: string;
  firstName?: string;
  lastName?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

const colorMap = [
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-cyan-100 text-cyan-700',
  'bg-orange-100 text-orange-700',
];

function getColorIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % colorMap.length;
}

export function Avatar({ name, firstName, lastName, size = 'md', className }: AvatarProps) {
  const first = firstName || name?.split(' ')[0] || '?';
  const last = lastName || name?.split(' ').slice(1).join(' ') || '';
  const initials = getInitials(first, last || first);
  const color = colorMap[getColorIndex(first + last)];

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold shrink-0',
        sizeMap[size],
        color,
        className,
      )}
    >
      {initials}
    </div>
  );
}
