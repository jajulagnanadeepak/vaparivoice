import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Check, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { useI18n } from '@/features/i18n/i18n-provider';
import { useShop } from '@/features/shops/shop-provider';
import { onboardingSchema, STEP_FIELDS, type OnboardingValues } from '@/features/shops/onboarding-schema';
import { shopService } from '@/services/shop-service';
import { productService } from '@/services/product-service';
import { queryKeys } from '@/lib/query-client';
import { useApplyServerErrors } from '@/hooks/use-apply-server-errors';
import { useTranslateError } from '@/hooks/use-translate-error';
import { SUPPORTED_LANGUAGES } from '@/locales';
import { cn } from '@/lib/utils';
import type { LanguageCode } from '@/types';

export default function OnboardingPage() {
  const { t, lang, setLang } = useI18n();
  const te = useTranslateError();
  const applyServerErrors = useApplyServerErrors();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { selectShop } = useShop();
  const [step, setStep] = useState(0);
  const total = STEP_FIELDS.length;

  const units = useQuery({ queryKey: queryKeys.units, queryFn: productService.units, enabled: step === 2 });

  const form = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { name: '', owner_name: '', currency: 'INR', timezone: 'Asia/Kolkata', ui_language: lang, voice_language: lang, default_min_stock: '', default_unit_code: '' },
  });
  const { errors } = form.formState;

  const create = useMutation({
    mutationFn: (v: OnboardingValues) => shopService.create({
      ...v,
      owner_name: v.owner_name || undefined,
      default_min_stock: v.default_min_stock || undefined,
      default_unit_code: v.default_unit_code || undefined,
    }),
    onSuccess: async (shop) => {
      setLang(shop.ui_language);
      await qc.invalidateQueries({ queryKey: queryKeys.shops });
      await qc.invalidateQueries({ queryKey: queryKeys.me });
      selectShop(shop.id);
      toast.success(t('onboarding.done'));
      navigate('/', { replace: true });
    },
    onError: (e) => applyServerErrors(e, form.setError, ['name', 'owner_name', 'default_min_stock']),
  });

  const next = async () => {
    if (await form.trigger(STEP_FIELDS[step])) setStep((s) => s + 1);
  };
  const steps = [t('onboarding.shopDetails'), t('onboarding.languages'), t('onboarding.preferences')];

  return (
    <Card className="shadow-raised">
      <CardHeader className="p-6 pb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t('onboarding.step', { n: step + 1, total })}</p>
        <CardTitle className="text-xl">{t('onboarding.title')}</CardTitle>
        <CardDescription>{steps[step]}</CardDescription>
        <ol className="mt-3 flex gap-2" aria-label={t('onboarding.title')}>
          {steps.map((label, i) => (
            <li key={label} className="flex-1" aria-current={i === step ? 'step' : undefined}>
              <span className={cn('block h-1.5 rounded-full', i <= step ? 'bg-primary' : 'bg-muted')} />
              <span className="sr-only">{label}{i < step ? ' ✓' : ''}</span>
            </li>
          ))}
        </ol>
      </CardHeader>
      <CardContent className="p-6 pt-4">
        <form
          noValidate
          onSubmit={form.handleSubmit((v) => create.mutate(v))}
          onKeyDown={(e) => { if (e.key === 'Enter' && step < total - 1) { e.preventDefault(); void next(); } }}
          className="space-y-4"
        >
          {step === 0 && (
            <>
              <FormField id="name" label={t('onboarding.shopName')} error={te(errors.name?.message)}>
                {(a) => <Input {...a} autoFocus placeholder="Sri Venkateswara Kirana" {...form.register('name')} />}
              </FormField>
              <FormField id="owner_name" label={t('onboarding.ownerName')} optionalLabel={t('common.optional')} error={te(errors.owner_name?.message)}>
                {(a) => <Input {...a} autoComplete="name" {...form.register('owner_name')} />}
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField id="currency" label={t('onboarding.currency')}>
                  {(a) => <NativeSelect {...a} disabled {...form.register('currency')}><option value="INR">₹ INR</option></NativeSelect>}
                </FormField>
                <FormField id="timezone" label={t('onboarding.timezone')}>
                  {(a) => <NativeSelect {...a} {...form.register('timezone')}><option value="Asia/Kolkata">Asia/Kolkata (IST)</option></NativeSelect>}
                </FormField>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <LanguagePicker
                legend={t('onboarding.uiLanguage')} hint={t('onboarding.uiLanguageHint')} value={form.watch('ui_language')}
                onChange={(l) => { form.setValue('ui_language', l); setLang(l); }} label={(l) => t(`lang.${l}`)}
              />
              <LanguagePicker
                legend={t('onboarding.voiceLanguage')} hint={t('onboarding.voiceLanguageHint')} value={form.watch('voice_language')}
                onChange={(l) => form.setValue('voice_language', l)} label={(l) => t(`lang.${l}`)}
              />
            </>
          )}

          {step === 2 && (
            <>
              <FormField id="default_min_stock" label={t('onboarding.defaultMinStock')} optionalLabel={t('common.optional')} hint={t('onboarding.defaultMinStockHint')} error={te(errors.default_min_stock?.message)}>
                {(a) => <Input {...a} inputMode="decimal" placeholder="10" {...form.register('default_min_stock')} />}
              </FormField>
              <FormField id="default_unit_code" label={t('onboarding.defaultUnit')} optionalLabel={t('common.optional')}>
                {(a) => (
                  <NativeSelect {...a} disabled={units.isLoading} {...form.register('default_unit_code')}>
                    <option value="">{t('common.none')}</option>
                    {units.data?.map((u) => <option key={u.code} value={u.code}>{u.name}</option>)}
                  </NativeSelect>
                )}
              </FormField>
              <div className="flex gap-3 rounded-lg bg-primary-soft p-3 text-sm text-accent-foreground">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                <p><span className="font-semibold">{t('onboarding.openingStock')}:</span> {t('onboarding.openingStockHint')}</p>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-2">
            {step > 0 && <Button type="button" variant="outline" size="lg" onClick={() => setStep((s) => s - 1)}>{t('common.back')}</Button>}
            {step < total - 1 ? (
              <Button key="next" type="button" size="lg" className="flex-1" onClick={() => void next()}>{t('common.next')}</Button>
            ) : (
              <Button key="submit" type="submit" size="lg" className="flex-1" loading={create.isPending}>{create.isPending ? t('onboarding.creating') : t('onboarding.finish')}</Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function LanguagePicker({ legend, hint, value, onChange, label }: { legend: string; hint: string; value: LanguageCode; onChange: (l: LanguageCode) => void; label: (l: LanguageCode) => string }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{legend}</legend>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
        {SUPPORTED_LANGUAGES.map((l) => {
          const selected = value === l;
          return (
            <button
              key={l} type="button" role="radio" aria-checked={selected} onClick={() => onChange(l)}
              className={cn('flex h-12 items-center justify-between rounded-lg border px-3 text-left text-sm font-medium transition-colors', selected ? 'border-primary bg-primary-soft text-accent-foreground' : 'hover:bg-muted')}
            >
              {label(l)}
              {selected && <Check className="size-4" aria-hidden />}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
