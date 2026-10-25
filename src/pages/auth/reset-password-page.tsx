import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { AuthCard } from '@/components/common/auth-card';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { PasswordInput } from '@/components/ui/password-input';
import { useI18n } from '@/features/i18n/i18n-provider';
import { resetSchema, type ResetValues } from '@/features/auth/schemas';
import { authService } from '@/services/auth-service';
import { useTranslateError } from '@/hooks/use-translate-error';
import { useApplyServerErrors } from '@/hooks/use-apply-server-errors';

export default function ResetPasswordPage() {
  const { t } = useI18n();
  const te = useTranslateError();
  const applyServerErrors = useApplyServerErrors();
  const token = useSearchParams()[0].get('token');
  const form = useForm<ResetValues>({ resolver: zodResolver(resetSchema), defaultValues: { password: '', confirm: '' } });
  const reset = useMutation({
    mutationFn: (v: ResetValues) => authService.resetPassword({ token: token ?? '', new_password: v.password }),
    onError: (e) => applyServerErrors(e, form.setError, ['password']),
  });
  const back = <Link to="/login" className="font-medium text-primary hover:underline">{t('auth.backToLogin')}</Link>;
  const pw = { showLabel: t('common.showPassword'), hideLabel: t('common.hidePassword') };

  if (!token) return <AuthCard title={t('auth.resetTitle')} footer={back}><p role="alert" className="text-sm text-destructive">{t('auth.resetInvalid')}</p></AuthCard>;
  if (reset.isSuccess) {
    return (
      <AuthCard title={t('auth.resetTitle')} footer={back}>
        <div role="status" className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle2 className="size-10 text-success" aria-hidden />
          <p className="text-sm">{t('auth.resetDone')}</p>
        </div>
      </AuthCard>
    );
  }
  return (
    <AuthCard title={t('auth.resetTitle')} footer={back}>
      <form noValidate onSubmit={form.handleSubmit((v) => reset.mutate(v))} className="space-y-4">
        <FormField id="password" label={t('auth.newPassword')} hint={t('validation.passwordStrength')} error={te(form.formState.errors.password?.message)}>
          {(a) => <PasswordInput {...a} autoComplete="new-password" {...pw} {...form.register('password')} />}
        </FormField>
        <FormField id="confirm" label={t('auth.confirmPassword')} error={te(form.formState.errors.confirm?.message)}>
          {(a) => <PasswordInput {...a} autoComplete="new-password" {...pw} {...form.register('confirm')} />}
        </FormField>
        <Button type="submit" size="lg" className="w-full" loading={reset.isPending}>{t('auth.resetSubmit')}</Button>
      </form>
    </AuthCard>
  );
}
