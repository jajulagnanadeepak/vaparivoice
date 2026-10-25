import { forwardRef } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toNumber } from '@/lib/format';
import { roundQty } from '@/lib/units';

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onValueChange: (v: string) => void;
  decreaseLabel: string;
  increaseLabel: string;
}

/** Big numeric field with − / + buttons, so a count can be set without the keyboard. */
export const QuantityField = forwardRef<HTMLInputElement, Props>(({ value, onValueChange, decreaseLabel, increaseLabel, ...props }, ref) => {
  const step = (d: number) => onValueChange(String(Math.max(0, roundQty(toNumber(value) + d))));
  const btn = 'flex size-14 shrink-0 items-center justify-center rounded-lg border bg-surface text-foreground hover:bg-muted active:bg-muted disabled:opacity-40';
  return (
    <div className="flex items-stretch gap-2">
      <button type="button" className={btn} onClick={() => step(-1)} aria-label={decreaseLabel} disabled={toNumber(value) <= 0}>
        <Minus className="size-6" aria-hidden />
      </button>
      <Input
        ref={ref} value={value} onChange={(e) => onValueChange(e.target.value.replace(',', '.'))} inputMode="decimal" autoComplete="off"
        enterKeyHint="next" className="h-14 text-center text-2xl font-semibold tabular sm:h-14" {...props}
      />
      <button type="button" className={btn} onClick={() => step(1)} aria-label={increaseLabel}>
        <Plus className="size-6" aria-hidden />
      </button>
    </div>
  );
});
QuantityField.displayName = 'QuantityField';
