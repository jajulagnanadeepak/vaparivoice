import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowDownToLine, ArrowLeft, ClipboardCheck, Info, PackageMinus, ShoppingCart, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/common/page-header';
import { ProductPicker } from '@/components/inventory/product-picker';
import { ProductName } from '@/components/inventory/product-name';
import { QuantityField } from '@/components/inventory/quantity-field';
import { SubmissionStatus } from '@/components/inventory/submission-status';
import { useI18n } from '@/features/i18n/i18n-provider';
import { useProductConversions } from '@/features/inventory/queries';
import { useStockSubmission } from '@/features/inventory/use-stock-submission';
import { emptyStockForm, OUT_REASONS, stockFormSchema, type StockFormValues, type StockMode } from '@/features/inventory/stock-form-schema';
import { useSuppliers } from '@/features/products/queries';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useTranslateError } from '@/hooks/use-translate-error';
import { formatQuantity } from '@/lib/format';
import { previewStock, toBase, withBaseUnit } from '@/lib/units';
import { cn } from '@/lib/utils';
import { inventoryService } from '@/services/inventory-service';
import { productService } from '@/services/product-service';
import type { Product, StockAdjustmentRequest, StockInRequest, StockOutRequest } from '@/types';
import type { TranslationKey } from '@/locales';

type Body = StockInRequest | StockOutRequest | StockAdjustmentRequest;

const MODE: Record<StockMode, { title: TranslationKey; subtitle: TranslationKey; confirm: TranslationKey; icon: LucideIcon; tone: string; direction: 'in' | 'out' | 'set' }> = {
  in: { title: 'stock.inTitle', subtitle: 'stock.inSubtitle', confirm: 'stock.confirmIn', icon: ArrowDownToLine, tone: 'text-success bg-success-soft', direction: 'in' },
  sale: { title: 'stock.saleTitle', subtitle: 'stock.saleSubtitle', confirm: 'stock.confirmSale', icon: ShoppingCart, tone: 'text-primary bg-primary-soft', direction: 'out' },
  out: { title: 'stock.outTitle', subtitle: 'stock.outSubtitle', confirm: 'stock.confirmOut', icon: PackageMinus, tone: 'text-primary bg-primary-soft', direction: 'out' },
  adjust: { title: 'stock.adjustTitle', subtitle: 'stock.adjustSubtitle', confirm: 'stock.confirmAdjust', icon: ClipboardCheck, tone: 'text-warning bg-warning-soft', direction: 'set' },
};

export default function StockActionPage({ mode }: { mode: StockMode }) {
  const { t, locale } = useI18n();
  const te = useTranslateError();
  const online = useOnlineStatus();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const cfg = MODE[mode];
  const Icon = cfg.icon;

  const [product, setProduct] = useState<Product | null>(null);
  const [productError, setProductError] = useState<string>();
  const [step, setStep] = useState<'form' | 'review'>('form');

  // Pre-select from ?product=<id> (links from product detail, low stock, history).
  const preselectId = params.get('product');
  const preselect = useQuery({ queryKey: ['products', 'detail', preselectId], queryFn: () => productService.get(preselectId!), enabled: !!preselectId });
  useEffect(() => { if (preselect.data && !product && preselect.data.status === 'active') setProduct(preselect.data); }, [preselect.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const conversions = useProductConversions(product?.id);
  const units = useMemo(() => (product ? withBaseUnit(product.base_unit, conversions.data) : []), [product, conversions.data]);
  const suppliers = useSuppliers();

  const form = useForm<StockFormValues>({ resolver: zodResolver(stockFormSchema(mode)), defaultValues: emptyStockForm });
  const { errors } = form.formState;
  useEffect(() => { form.setValue('unit_code', product?.base_unit.code ?? ''); }, [product, form]);

  const submitFn = useCallback((body: Body, key: string) => {
    if (mode === 'in') return inventoryService.stockIn(body as StockInRequest, key);
    if (mode === 'adjust') return inventoryService.adjust(body as StockAdjustmentRequest, key);
    return inventoryService.stockOut(body as StockOutRequest, key);
  }, [mode]);
  const submission = useStockSubmission<Body>(submitFn);

  const values = form.watch();
  const unit = units.find((u) => u.unit_code === values.unit_code);
  const preview = product && unit && values.quantity && !errors.quantity ? previewStock(product.current_stock, values.quantity, unit.factor_to_base, cfg.direction) : null;
  const baseCode = product?.base_unit.code ?? '';
  const blocked = !preview || (mode !== 'in' && mode !== 'adjust' && preview.insufficient) || (mode === 'adjust' && preview.delta === 0);

  const goReview = form.handleSubmit(() => {
    if (!product) { setProductError(t('validation.chooseProduct')); return; }
    setStep('review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, () => { if (!product) setProductError(t('validation.chooseProduct')); });

  const buildBody = (): Body => {
    const v = form.getValues();
    const opt = (s: string) => (s.trim() ? s.trim() : null);
    if (mode === 'adjust') return { product_id: product!.id, observed_quantity: v.quantity, unit_code: v.unit_code, reason: v.reason.trim() };
    if (mode === 'in') return { product_id: product!.id, quantity: v.quantity, unit_code: v.unit_code, unit_cost: opt(v.unit_cost), supplier_id: opt(v.supplier_id), reference: opt(v.reference), notes: opt(v.notes) };
    return { product_id: product!.id, quantity: v.quantity, unit_code: v.unit_code, reason: mode === 'sale' ? 'sold' : (v.reason as StockOutRequest['reason']), reference: opt(v.reference), notes: opt(v.notes) };
  };

  const startAgain = () => { submission.reset(); form.reset(emptyStockForm); setProduct(null); setStep('form'); };

  const header = (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2"><Link to="/"><ArrowLeft aria-hidden />{t('nav.home')}</Link></Button>
      <div className="mb-5 flex items-start gap-3">
        <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-xl', cfg.tone)}><Icon className="size-6" aria-hidden /></span>
        <PageHeader title={t(cfg.title)} description={t(cfg.subtitle)} />
      </div>
    </>
  );

  const successProductId = submission.state.status === 'success' ? submission.state.movement.product.id : null;

  if (submission.state.status !== 'idle') {
    return (
      <div className="mx-auto max-w-xl">
        {header}
        <SubmissionStatus
          state={submission.state}
          onRetry={submission.retry}
          onCheck={() => void submission.checkStatus()}
          onBackToEdit={() => { submission.reset(); setStep('form'); }}
          successActions={<>
            <Button size="lg" onClick={startAgain}>{t('stock.addAnother')}</Button>
            {successProductId && <Button size="lg" variant="outline" onClick={() => navigate(`/products/${successProductId}`)}>{t('stock.viewProduct')}</Button>}
            <Button size="lg" variant="ghost" asChild><Link to="/">{t('common.goHome')}</Link></Button>
          </>}
        />
      </div>
    );
  }

  if (step === 'review' && product && preview && unit) {
    const converted = unit.unit_code !== baseCode;
    return (
      <div className="mx-auto max-w-xl">
        {header}
        <Card className="p-5">
          <h2 className="text-lg font-semibold">{t('stock.reviewTitle')}</h2>
          <p className="mt-3 text-xl font-semibold"><ProductName name={product.name} /></p>
          {mode === 'out' && <p className="text-sm text-muted-foreground">{t('stock.reason')}: {t(`movement.reason_${values.reason}` as TranslationKey)}</p>}

          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-muted p-3"><dt className="text-xs text-muted-foreground">{t('stock.nowInStock')}</dt><dd className="mt-1 text-lg font-semibold tabular">{formatQuantity(preview.current, baseCode, locale)}</dd></div>
            <div className={cn('rounded-lg p-3', preview.delta >= 0 ? 'bg-success-soft' : 'bg-primary-soft')}>
              <dt className="text-xs text-muted-foreground">{t('stock.change')}</dt>
              <dd className="mt-1 text-lg font-semibold tabular">{preview.delta > 0 ? '+' : ''}{formatQuantity(preview.delta, baseCode, locale)}</dd>
            </div>
            <div className={cn('rounded-lg border-2 p-3', preview.insufficient ? 'border-destructive' : 'border-primary')}>
              <dt className="text-xs text-muted-foreground">{t('stock.afterSave')}</dt>
              <dd className="mt-1 text-lg font-bold tabular">{formatQuantity(preview.after, baseCode, locale)}</dd>
            </div>
          </dl>
          {converted && (
            <p className="mt-3 text-sm text-muted-foreground tabular">
              {t('stock.converted', { qty: values.quantity, unit: unit.unit_name, base: formatQuantity(toBase(values.quantity, unit.factor_to_base), undefined, locale), baseUnit: baseCode })}
            </p>
          )}
          <p className="mt-2 flex gap-2 text-xs text-muted-foreground"><Info className="size-4 shrink-0" aria-hidden />{t('stock.estimateNote')}</p>

          <div className="mt-4 space-y-2" aria-live="polite">
            {mode !== 'in' && mode !== 'adjust' && preview.insufficient && (
              <p role="alert" className="flex gap-2 rounded-md bg-destructive-soft p-3 text-sm font-medium text-destructive">
                <AlertTriangle className="size-4 shrink-0" aria-hidden />
                {t('stock.notEnough', { available: formatQuantity(preview.current, baseCode, locale), requested: formatQuantity(toBase(values.quantity, unit.factor_to_base), baseCode, locale) })}
              </p>
            )}
            {mode === 'adjust' && preview.delta === 0 && <p role="status" className="rounded-md bg-muted p-3 text-sm">{t('stock.noChange')}</p>}
            {preview.large && !preview.insufficient && (
              <p role="alert" className="flex gap-2 rounded-md bg-warning-soft p-3 text-sm font-medium text-warning"><AlertTriangle className="size-4 shrink-0" aria-hidden />{t('stock.bigChange')}</p>
            )}
            {!online && <p role="alert" className="rounded-md bg-destructive-soft p-3 text-sm text-destructive">{t('offline.cannotSave')}</p>}
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <Button size="xl" variant={mode === 'in' ? 'success' : 'default'} disabled={blocked || !online} onClick={() => void submission.submit(buildBody())}>
              {t(cfg.confirm)}
            </Button>
            <Button size="lg" variant="outline" onClick={() => setStep('form')}>{t('common.back')}</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      {header}
      <Card className="p-5">
        <form noValidate onSubmit={goReview} className="space-y-5">
          <ProductPicker label={t('stock.product')} value={product} onChange={(p) => { setProduct(p); setProductError(undefined); }} error={productError} autoFocus={!preselectId} />

          {product && (
            <>
              <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
                <FormField id="quantity" label={mode === 'adjust' ? t('stock.countedQty') : t('stock.quantity')} error={te(errors.quantity?.message)}>
                  {(a) => (
                    <Controller control={form.control} name="quantity" render={({ field }) => (
                      <QuantityField {...a} ref={field.ref} value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} decreaseLabel="−1" increaseLabel="+1" autoFocus />
                    )} />
                  )}
                </FormField>
                <FormField id="unit_code" label={t('stock.unit')} error={te(errors.unit_code?.message)}>
                  {(a) => (
                    <NativeSelect {...a} className="h-14 text-base sm:h-14" {...form.register('unit_code')}>
                      {units.map((u) => <option key={u.unit_code} value={u.unit_code}>{u.unit_name}</option>)}
                    </NativeSelect>
                  )}
                </FormField>
              </div>
              {conversions.isError && <p className="text-xs text-warning">{t('stock.unitsLoadFailed')}</p>}
              {unit && unit.unit_code !== baseCode && values.quantity && !errors.quantity && (
                <p className="-mt-2 text-sm text-muted-foreground tabular">
                  {t('stock.converted', { qty: values.quantity, unit: unit.unit_name, base: formatQuantity(toBase(values.quantity, unit.factor_to_base), undefined, locale), baseUnit: baseCode })}
                </p>
              )}

              {mode === 'out' && (
                <fieldset>
                  <legend className="mb-2 text-sm font-medium">{t('stock.reason')}</legend>
                  <div className="grid grid-cols-2 gap-2" role="radiogroup">
                    {OUT_REASONS.map((r) => (
                      <label key={r} className={cn('flex min-h-14 cursor-pointer items-center justify-center rounded-lg border px-3 text-center text-sm font-medium has-[:checked]:border-2 has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring')}>
                        <input type="radio" value={r} className="sr-only" {...form.register('reason')} />
                        {t(`movement.reason_${r}` as TranslationKey)}
                      </label>
                    ))}
                  </div>
                  {errors.reason && <p role="alert" className="mt-1 text-sm font-medium text-destructive">{te(errors.reason.message)}</p>}
                </fieldset>
              )}

              {mode === 'adjust' && (
                <FormField id="reason" label={t('stock.adjustReason')} error={te(errors.reason?.message)}>
                  {(a) => <Textarea {...a} rows={2} placeholder={t('stock.adjustReasonPlaceholder')} {...form.register('reason')} />}
                </FormField>
              )}

              {mode === 'in' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField id="unit_cost" label={t('stock.unitCost')} optionalLabel={t('common.optional')} error={te(errors.unit_cost?.message)}>
                    {(a) => <Input {...a} inputMode="decimal" {...form.register('unit_cost')} />}
                  </FormField>
                  <FormField id="supplier_id" label={t('stock.supplier')} optionalLabel={t('common.optional')}>
                    {(a) => (
                      <NativeSelect {...a} {...form.register('supplier_id')}>
                        <option value="">{t('common.none')}</option>
                        {suppliers.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </NativeSelect>
                    )}
                  </FormField>
                </div>
              )}

              {mode !== 'adjust' && (
                <details className="group rounded-lg border px-3 py-2">
                  <summary className="min-h-10 cursor-pointer py-2 text-sm font-medium text-muted-foreground">{t('common.reference')} / {t('common.notes')} ({t('common.optional')})</summary>
                  <div className="space-y-3 pb-2 pt-1">
                    <FormField id="reference" label={t('common.reference')} error={te(errors.reference?.message)}>{(a) => <Input {...a} {...form.register('reference')} />}</FormField>
                    <FormField id="notes" label={t('common.notes')} error={te(errors.notes?.message)}>{(a) => <Textarea {...a} rows={2} {...form.register('notes')} />}</FormField>
                  </div>
                </details>
              )}
            </>
          )}

          <Button type="submit" size="xl" className="w-full">{t('stock.review')}</Button>
          {mode !== 'adjust' && <p className="text-center text-xs text-muted-foreground">{t('stock.wrongEntry')}</p>}
        </form>
      </Card>
    </div>
  );
}
