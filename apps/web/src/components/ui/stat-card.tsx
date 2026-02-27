import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon | ReactNode;
  iconColor?: string;
  iconBg?: string;
  trend?: { value: number; label: string };
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconColor = 'text-indigo-600',
  iconBg = 'bg-indigo-50',
  trend,
  className,
}: StatCardProps) {
  // Determine if icon is a component (function or forwardRef object) or a rendered element
  const isComponent = typeof icon === 'function' || (typeof icon === 'object' && icon !== null && '$$typeof' in icon && 'render' in icon);
  const IconComponent = isComponent ? (icon as LucideIcon) : null;
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-200',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  'text-xs font-medium',
                  trend.value >= 0 ? 'text-emerald-600' : 'text-red-600',
                )}
              >
                {trend.value >= 0 ? '+' : ''}
                {trend.value}%
              </span>
              <span className="text-xs text-gray-500">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={cn('p-3 rounded-xl', iconBg)}>
          {IconComponent ? <IconComponent className={cn('w-6 h-6', iconColor)} /> : (icon as ReactNode)}
        </div>
      </div>
    </div>
  );
}
