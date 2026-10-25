import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthCard } from '@/components/common/auth-card';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { useI18n } from '@/features/i18n/i18n-provider';
import { useAuth } from '@/features/auth/auth-provider';
import { loginSchema, type LoginValues } from '@/features/auth/schemas';
import { authService } from '@/services/auth-service';
import { useTranslateError } from '@/hooks/use-translate-error';
import { useApplyServerErrors } from '@/hooks/use-apply-server-errors';

export default function LoginPage() {
  const { t } = useI18n();
  const te = useTranslateError();
  const applyServerErrors = useApplyServerErrors();
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';

  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  const login = useMutation({
    mutationFn: authService.login,
    onSuccess: (user) => { setUser(user); navigate(from, { replace: true }); },
    onError: (e) => { form.resetField('password'); applyServerErrors(e, form.setError, ['email', 'password']); },
  });
  const { errors } = form.formState;

  return (
    <AuthCard
      title={t('auth.loginTitle')}
      subtitle={t('auth.loginSubtitle')}
      footer={<>{t('auth.noAccount')} <Link to="/register" className="font-medium text-primary hover:underline">{t('auth.createAccount')}</Link></>}
    >
      <form noValidate onSubmit={form.handleSubmit((v) => login.mutate(v))} className="space-y-4">
        <FormField id="email" label={t('auth.email')} error={te(errors.email?.message)}>
          {(a) => <Input {...a} type="email" autoComplete="email" inputMode="email" {...form.register('email')} />}
        </FormField>
        <FormField id="password" label={t('auth.password')} error={te(errors.password?.message)}>
          {(a) => <PasswordInput {...a} autoComplete="current-password" showLabel={t('common.showPassword')} hideLabel={t('common.hidePassword')} {...form.register('password')} />}
        </FormField>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">{t('auth.forgot')}</Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={login.isPending}>
          {login.isPending ? t('auth.signingIn') : t('auth.signIn')}
        </Button>
      </form>
    </AuthCard>
  );
}
