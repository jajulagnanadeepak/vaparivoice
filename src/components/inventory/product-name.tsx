import { cn } from '@/lib/utils';

/** User-entered product names: never machine-translated, rendered as plain text, direction auto-detected. */
export function ProductName({ name, className }: { name: string; className?: string }) {
  return <span translate="no" dir="auto" className={cn('notranslate', className)}>{name}</span>;
}
