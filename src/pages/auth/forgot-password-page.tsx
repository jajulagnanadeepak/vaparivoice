import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { AuthCard } from '@/components/common/auth-card';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/features/i18n/i18n-provider';
import { forgotSchema, type ForgotValues } from '@/features/auth/schemas';
import { authService } from '@/services/auth-service';
import { useTranslateError } from '@/hooks/use-translate-error';
import { useApplyServerErrors } from '@/hooks/use-apply-server-errors';

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const te = useTranslateError();
  const applyServerErrors = useApplyServerErrors();
  const form = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema), defaultValues: { email: '' } });
  const send = useMutation({ mutationFn: authService.forgotPassword, onError: (e) => applyServerErrors(e, form.setError, ['email']) });
  const back = <Link to="/login" className="font-medium text-primary hover:underline">{t('auth.backToLogin')}</Link>;

  if (send.isSuccess) {
    return (
      <AuthCard title={t('auth.forgotTitle')} footer={back}>
        <div role="status" className="flex flex-col items-center gap-3 py-4 text-center">
          <MailCheck className="size-10 text-success" aria-hidden />
          {/* Same message whether or not the account exists — avoids account enumeration. */}
          <p className="text-sm">{t('auth.forgotSent')}</p>
        </div>
      </AuthCard>
    );
  }
  return (
    <AuthCard title={t('auth.forgotTitle')} subtitle={t('auth.forgotSubtitle')} footer={back}>
      <form noValidate onSubmit={form.handleSubmit((v) => send.mutate(v))} className="space-y-4">
        <FormField id="email" label={t('auth.email')} error={te(form.formState.errors.email?.message)}>
          {(a) => <Input {...a} type="email" autoComplete="email" {...form.register('email')} />}
        </FormField>
        <Button type="submit" size="lg" className="w-full" loading={send.isPending}>{t('auth.sendLink')}</Button>
      </form>
    </AuthCard>
  );
}
