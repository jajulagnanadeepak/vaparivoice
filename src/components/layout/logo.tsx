import { AudioLines } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ collapsed, className }: { collapsed?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <AudioLines className="size-5" aria-hidden />
      </span>
      {!collapsed && <span className="text-base font-semibold tracking-tight">VoiceStock <span className="text-primary">AI</span></span>}
    </div>
  );
}
