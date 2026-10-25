import { Loader2, Mic, MicOff, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  mode: 'ready' | 'recording' | 'busy' | 'disabled';
  level: number;
  label: string;
  onPress: () => void;
}

/** 160px microphone control. State is shown by icon, colour, ring AND the text label. */
export function MicButton({ mode, level, label, onPress }: Props) {
  const ring = mode === 'recording' ? 8 + Math.round(level * 28) : 0;
  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={onPress}
        disabled={mode === 'busy' || mode === 'disabled'}
        aria-pressed={mode === 'recording'}
        aria-label={label}
        style={{ boxShadow: mode === 'recording' ? `0 0 0 ${ring}px hsl(var(--destructive) / 0.18)` : undefined }}
        className={cn(
          'flex size-36 items-center justify-center rounded-full text-white shadow-raised transition-[box-shadow,background-color] sm:size-40',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-4',
          mode === 'recording' ? 'bg-destructive' : mode === 'disabled' ? 'cursor-not-allowed bg-muted-foreground/40' : 'bg-primary hover:bg-primary/90',
          mode === 'busy' && 'bg-primary/70',
        )}
      >
        {mode === 'recording' ? <Square className="size-12 fill-current" aria-hidden />
          : mode === 'busy' ? <Loader2 className="size-14 animate-spin" aria-hidden />
          : mode === 'disabled' ? <MicOff className="size-14" aria-hidden />
          : <Mic className="size-16" aria-hidden />}
      </button>
      <span className="text-base font-semibold">{label}</span>
    </div>
  );
}

/** Simple five-bar level meter. */
export function LevelMeter({ level }: { level: number }) {
  return (
    <div className="flex h-8 items-end gap-1" aria-hidden>
      {[0.2, 0.45, 0.7, 0.45, 0.2].map((w, i) => (
        <span key={i} className="w-2 rounded-full bg-destructive transition-[height] duration-75" style={{ height: `${Math.max(12, Math.min(100, level * 100 * (0.6 + w)))}%` }} />
      ))}
    </div>
  );
}
