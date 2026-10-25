import { useMemo, useState } from 'react';
import { AlertTriangle, HelpCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductPicker } from '@/components/inventory/product-picker';
import { ProductName } from '@/components/inventory/product-name';
import { QuantityField } from '@/components/inventory/quantity-field';
import { useI18n } from '@/features/i18n/i18n-provider';
import { useProductConversions } from '@/features/inventory/queries';
import { useProduct } from '@/features/products/queries';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { formatQuantity, toNumber } from '@/lib/format';
import { previewStock, withBaseUnit } from '@/lib/units';
import { cn } from '@/lib/utils';
import type { ConfirmCommandRequest, InterpretedCommand } from '@/types';

type Action = 'stock_in' | 'stock_out';

interface Props {
  transcript: string;
  command: InterpretedCommand;
  onConfirm: (body: ConfirmCommandRequest) => void;
  onCancel: () => void;
}

/** Editable review of an interpreted stock command. Nothing is saved until the user presses confirm. */
export function CommandReview({ transcript, command, onConfirm, onCancel }: Props) {
  const { t, locale } = useI18n();
  const online = useOnlineStatus();
  const initialAction: Action | null = command.action === 'stock_in' || command.action === 'stock_out' ? command.action : null;
  const [action, setAction] = useState<Action | null>(initialAction);
  // Ambiguous match (0 or 2+ candidates): never auto-pick.
  const [productId, setProductId] = useState<string | null>(command.product_candidates.length === 1 ? command.product_candidates[0]!.id : null);
  const [quantity, setQuantity] = useState(command.quantity ?? '');
  const [unitCode, setUnitCode] = useState(command.unit_code ?? '');
  const [searching, setSearching] = useState(false);

  const product = useProduct(productId ?? '');
  const conversions = useProductConversions(productId ?? undefined);
  const p = productId ? product.data : undefined;
  const units = useMemo(() => (p ? withBaseUnit(p.base_unit, conversions.data) : []), [p, conversions.data]);
  const unit = units.find((u) => u.unit_code === unitCode) ?? (p && !unitCode ? units[0] : undefined);
  const effectiveUnit = unit?.unit_code ?? '';

  const edited = action !== initialAction || productId !== (command.product_candidates.length === 1 ? command.product_candidates[0]!.id : null)
    || quantity !== (command.quantity ?? '') || effectiveUnit !== (command.unit_code ?? '');
  const qtyValid = /^\d+(\.\d{1,3})?$/.test(quantity) && toNumber(quantity) > 0;
  const preview = p && unit && action && qtyValid ? previewStock(p.current_stock, quantity, unit.factor_to_base, action === 'stock_in' ? 'in' : 'out') : null;
  // Prefer the server's numbers when the user changed nothing.
  const current = !edited && command.current_stock !== null ? toNumber(command.current_stock) : preview?.current;
  const proposed = !edited && command.proposed_stock !== null ? toNumber(command.proposed_stock) : preview?.after;
  const insufficient = action === 'stock_out' && proposed !== undefined && proposed < 0;
  const canConfirm = !!(action && p && unit && qtyValid && !insufficient && online);
  const baseCode = p?.base_unit.code ?? '';

  return (
    <Card className="space-y-5 p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('voice.heard')}</p>
        <p className="mt-1 text-lg" dir="auto">“{transcript}”</p>
      </div>

      {command.clarification_question && (
        <p role="alert" className="flex gap-2 rounded-lg bg-primary-soft p-3 text-base font-medium text-accent-foreground" dir="auto">
          <HelpCircle className="mt-0.5 size-5 shrink-0" aria-hidden />{command.clarification_question}
        </p>
      )}

      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t('voice.action')}</legend>
        <div className="grid grid-cols-2 gap-2">
          {(['stock_in', 'stock_out'] as const).map((a) => (
            <button key={a} type="button" aria-pressed={action === a} onClick={() => setAction(a)}
              className={cn('min-h-14 rounded-lg border px-3 text-base font-medium', action === a ? (a === 'stock_in' ? 'border-2 border-success bg-success-soft text-success' : 'border-2 border-primary bg-primary-soft text-accent-foreground') : 'hover:bg-muted')}>
              {t(a === 'stock_in' ? 'voice.actionIn' : 'voice.actionOut')}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        {!productId || searching ? (
          <>
            {command.product_candidates.length > 1 && !searching && (
              <fieldset className="mb-3">
                <legend className="mb-2 text-sm font-medium">{t('voice.chooseProduct')}</legend>
                <div className="grid gap-2">
                  {command.product_candidates.map((c) => (
                    <button key={c.id} type="button" onClick={() => setProductId(c.id)} className="min-h-14 rounded-lg border px-3 text-left text-base font-medium hover:bg-muted">
                      <ProductName name={c.name} />
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            <ProductPicker label={t('stock.product')} value={null} onChange={(np) => { if (np) { setProductId(np.id); setUnitCode(np.base_unit.code); setSearching(false); } }} />
          </>
        ) : product.isLoading ? <Skeleton className="h-20" /> : p ? (
          <ProductPicker label={t('stock.product')} value={p} onChange={() => { setSearching(true); }} />
        ) : null}
      </div>

      {p && (
        <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
          <div className="space-y-1.5">
            <Label htmlFor="v-qty">{t('voice.quantity')}</Label>
            <QuantityField id="v-qty" value={quantity} onValueChange={setQuantity} decreaseLabel="−1" increaseLabel="+1" aria-invalid={!!quantity && !qtyValid} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="v-unit">{t('voice.unit')}</Label>
            <NativeSelect id="v-unit" className="h-14 sm:h-14" value={effectiveUnit} onChange={(e) => setUnitCode(e.target.value)}>
              {units.map((u) => <option key={u.unit_code} value={u.unit_code}>{u.unit_name}</option>)}
            </NativeSelect>
          </div>
        </div>
      )}

      {current !== undefined && proposed !== undefined && (
        <div>
          <dl className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-muted p-3"><dt className="text-xs text-muted-foreground">{t('voice.current')}</dt><dd className="mt-1 text-xl font-semibold tabular">{formatQuantity(current, baseCode, locale)}</dd></div>
            <div className={cn('rounded-lg border-2 p-3', insufficient ? 'border-destructive' : 'border-primary')}><dt className="text-xs text-muted-foreground">{t('voice.proposed')}</dt><dd className="mt-1 text-xl font-bold tabular">{formatQuantity(proposed, baseCode, locale)}</dd></div>
          </dl>
          <p className="mt-2 flex gap-2 text-xs text-muted-foreground"><Info className="size-4 shrink-0" aria-hidden />{edited ? t('voice.edited') : t('stock.estimateNote')}</p>
        </div>
      )}

      {(command.warnings.length > 0 || insufficient || preview?.large) && (
        <div role="alert" className="space-y-1 rounded-lg bg-warning-soft p-3 text-sm text-warning">
          <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-4" aria-hidden />{t('voice.warnings')}</p>
          {command.warnings.map((w) => <p key={w} dir="auto">{w}</p>)}
          {insufficient && current !== undefined && <p>{t('stock.notEnough', { available: formatQuantity(current, baseCode, locale), requested: `${quantity} ${unit?.unit_name ?? ''}` })}</p>}
          {preview?.large && <p>{t('stock.bigChange')}</p>}
        </div>
      )}
      {!online && <p role="alert" className="rounded-md bg-destructive-soft p-3 text-sm text-destructive">{t('offline.cannotSave')}</p>}

      <div className="flex flex-col gap-2">
        <Button size="xl" variant={action === 'stock_in' ? 'success' : 'default'} disabled={!canConfirm}
          onClick={() => canConfirm && onConfirm({ command_id: command.command_id, product_id: p!.id, action: action!, quantity, unit_code: unit!.unit_code })}>
          {t('voice.confirm')}
        </Button>
        <Button size="lg" variant="outline" onClick={onCancel}>{t('voice.cancel')}</Button>
      </div>
    </Card>
  );
}
