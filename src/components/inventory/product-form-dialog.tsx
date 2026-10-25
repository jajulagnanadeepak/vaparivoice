import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/features/i18n/i18n-provider';
import { emptyProductValues, formValuesToRequest, productSchema, productToFormValues, type ProductFormValues } from '@/features/products/product-schema';
import { useCategories, useCreateProduct, useSuppliers, useUnits, useUpdateProduct } from '@/features/products/queries';
import { useApplyServerErrors } from '@/hooks/use-apply-server-errors';
import { useTranslateError } from '@/hooks/use-translate-error';
import { toNumber } from '@/lib/format';
import type { Product } from '@/types';

const FIELDS = ['name', 'sku', 'barcode', 'category_id', 'description', 'base_unit_code', 'min_stock', 'purchase_cost', 'selling_price', 'preferred_supplier_id'] as const;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  product?: Product;
  onSaved?: (p: Product) => void;
}

export function ProductFormDialog({ open, onOpenChange, product, onSaved }: Props) {
  const { t } = useI18n();
  const te = useTranslateError();
  const applyServerErrors = useApplyServerErrors();
  const isEdit = !!product;
  const categories = useCategories();
  const units = useUnits();
  const suppliers = useSuppliers();
  const create = useCreateProduct();
  const update = useUpdateProduct(product?.id ?? '');
  const mutation = isEdit ? update : create;

  const form = useForm<ProductFormValues>({ resolver: zodResolver(productSchema), defaultValues: emptyProductValues });
  const { errors, isDirty } = form.formState;

  useEffect(() => {
    if (open) form.reset(product ? productToFormValues(product) : emptyProductValues);
  }, [open, product, form]);

  const [cost, price] = form.watch(['purchase_cost', 'selling_price']);
  const priceBelowCost = cost !== '' && price !== '' && toNumber(price) < toNumber(cost);

  const submit = form.handleSubmit((v) => {
    const body = formValuesToRequest(v);
    const opts = {
      onSuccess: (p: Product) => {
        toast.success(isEdit ? t('products.updated_ok') : t('products.created'));
        onOpenChange(false);
        onSaved?.(p);
      },
      onError: (e: unknown) => applyServerErrors(e, form.setError, FIELDS),
    };
    if (isEdit) {
      const { base_unit_code: _locked, ...editable } = body; // base unit is immutable after creation
      update.mutate(editable, opts);
    } else {
      create.mutate(body, opts);
    }
  });

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (mutation.isPending) return;
      // Confirm before throwing away typed changes.
      if (!o && isDirty && !window.confirm(`${t('products.discardTitle')}\n${t('products.discardBody')}`)) return;
      onOpenChange(o);
    }}>
      <DialogContent className="sm:max-w-2xl" closeLabel={t('common.close')}>
        <DialogHeader>
          <DialogTitle>{isEdit ? t('products.editTitle') : t('products.createTitle')}</DialogTitle>
          <DialogDescription className="flex gap-2"><Info className="mt-0.5 size-4 shrink-0" aria-hidden />{t('products.stockNote')}</DialogDescription>
        </DialogHeader>

        <form id="product-form" noValidate onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <FormField id="name" label={t('products.name')} hint={t('products.nameHint')} error={te(errors.name?.message)} className="sm:col-span-2">
            {(a) => <Input {...a} autoFocus dir="auto" translate="no" {...form.register('name')} />}
          </FormField>
          <FormField id="sku" label={t('products.sku')} error={te(errors.sku?.message)}>
            {(a) => <Input {...a} autoCapitalize="characters" {...form.register('sku')} />}
          </FormField>
          <FormField id="barcode" label={t('products.barcode')} optionalLabel={t('common.optional')} error={te(errors.barcode?.message)}>
            {(a) => <Input {...a} inputMode="numeric" {...form.register('barcode')} />}
          </FormField>
          <FormField id="category_id" label={t('products.category')} optionalLabel={t('common.optional')}>
            {(a) => (
              <NativeSelect {...a} {...form.register('category_id')} disabled={categories.isLoading}>
                <option value="">{t('common.none')}</option>
                {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </NativeSelect>
            )}
          </FormField>
          <FormField id="base_unit_code" label={t('products.baseUnit')} hint={t('products.baseUnitHint')} error={te(errors.base_unit_code?.message)}>
            {(a) => (
              // Changing the base unit would reinterpret historical quantities, so it is locked after creation.
              <NativeSelect {...a} {...form.register('base_unit_code')} disabled={isEdit || units.isLoading}>
                <option value="" disabled>—</option>
                {units.data?.filter((u) => u.dimension !== 'package').map((u) => <option key={u.code} value={u.code}>{u.name}</option>)}
              </NativeSelect>
            )}
          </FormField>
          <FormField id="min_stock" label={t('products.minStock')} error={te(errors.min_stock?.message)}>
            {(a) => <Input {...a} inputMode="decimal" {...form.register('min_stock')} />}
          </FormField>
          <FormField id="preferred_supplier_id" label={t('products.supplier')} optionalLabel={t('common.optional')}>
            {(a) => (
              <NativeSelect {...a} {...form.register('preferred_supplier_id')} disabled={suppliers.isLoading}>
                <option value="">{t('common.none')}</option>
                {suppliers.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </NativeSelect>
            )}
          </FormField>
          <FormField id="purchase_cost" label={t('products.purchaseCost')} optionalLabel={t('common.optional')} error={te(errors.purchase_cost?.message)}>
            {(a) => <Input {...a} inputMode="decimal" {...form.register('purchase_cost')} />}
          </FormField>
          <FormField id="selling_price" label={t('products.sellingPrice')} optionalLabel={t('common.optional')} error={te(errors.selling_price?.message)}>
            {(a) => <Input {...a} inputMode="decimal" {...form.register('selling_price')} />}
          </FormField>
          {priceBelowCost && (
            <p role="status" className="flex items-center gap-2 rounded-md bg-warning-soft px-3 py-2 text-sm text-warning sm:col-span-2">
              <AlertTriangle className="size-4" aria-hidden />{t('products.priceBelowCost')}
            </p>
          )}
          <FormField id="description" label={t('products.description')} optionalLabel={t('common.optional')} error={te(errors.description?.message)} className="sm:col-span-2">
            {(a) => <Textarea {...a} rows={3} {...form.register('description')} />}
          </FormField>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>{t('common.cancel')}</Button>
          <Button type="submit" form="product-form" loading={mutation.isPending} disabled={isEdit && !isDirty}>
            {mutation.isPending ? t('common.saving') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
