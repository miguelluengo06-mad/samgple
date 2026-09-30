import { cn } from '@/lib/utils';

/** Header bar shared by every admin section, so titles, height and actions line up. */
export default function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex-shrink-0 border-b border-gray-800 px-4 md:px-6 h-[64px] flex items-center justify-between gap-3 min-w-0', className)}>
      <div className="min-w-0">
        <h1 className="text-lg font-semibold text-white uppercase tracking-wide truncate">{title}</h1>
        {subtitle && <p className="text-xs text-white/40 truncate">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
