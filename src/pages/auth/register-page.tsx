import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { AuthCard } from '@/components/common/auth-card';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { useI18n } from '@/features/i18n/i18n-provider';
import { useAuth } from '@/features/auth/auth-provider';
import { registerSchema, type RegisterValues } from '@/features/auth/schemas';
import { authService } from '@/services/auth-service';
import { useTranslateError } from '@/hooks/use-translate-error';
import { useApplyServerErrors } from '@/hooks/use-apply-server-errors';

export default function RegisterPage() {
  const { t } = useI18n();
  const te = useTranslateError();
  const applyServerErrors = useApplyServerErrors();
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const form = useForm<RegisterValues>({ resolver: zodResolver(registerSchema), defaultValues: { full_name: '', email: '', phone: '', password: '', confirm: '' } });
  const register = useMutation({
    mutationFn: ({ confirm: _c, phone, ...rest }: RegisterValues) => authService.register({ ...rest, phone: phone || undefined }),
    onSuccess: (user) => { setUser(user); navigate('/onboarding', { replace: true }); },
    onError: (e) => applyServerErrors(e, form.setError, ['full_name', 'email', 'phone', 'password']),
  });
  const { errors } = form.formState;
  const pw = { showLabel: t('common.showPassword'), hideLabel: t('common.hidePassword') };

  return (
    <AuthCard
      title={t('auth.registerTitle')}
      subtitle={t('auth.registerSubtitle')}
      footer={<>{t('auth.haveAccount')} <Link to="/login" className="font-medium text-primary hover:underline">{t('auth.signIn')}</Link></>}
    >
      <form noValidate onSubmit={form.handleSubmit((v) => register.mutate(v))} className="space-y-4">
        <FormField id="full_name" label={t('auth.fullName')} error={te(errors.full_name?.message)}>
          {(a) => <Input {...a} autoComplete="name" {...form.register('full_name')} />}
        </FormField>
        <FormField id="email" label={t('auth.email')} error={te(errors.email?.message)}>
          {(a) => <Input {...a} type="email" autoComplete="email" {...form.register('email')} />}
        </FormField>
        <FormField id="phone" label={t('auth.phone')} optionalLabel={t('common.optional')} error={te(errors.phone?.message)}>
          {(a) => <Input {...a} type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" {...form.register('phone')} />}
        </FormField>
        <FormField id="password" label={t('auth.password')} hint={t('validation.passwordStrength')} error={te(errors.password?.message)}>
          {(a) => <PasswordInput {...a} autoComplete="new-password" {...pw} {...form.register('password')} />}
        </FormField>
        <FormField id="confirm" label={t('auth.confirmPassword')} error={te(errors.confirm?.message)}>
          {(a) => <PasswordInput {...a} autoComplete="new-password" {...pw} {...form.register('confirm')} />}
        </FormField>
        <Button type="submit" size="lg" className="w-full" loading={register.isPending}>{t('auth.register')}</Button>
      </form>
    </AuthCard>
  );
}
