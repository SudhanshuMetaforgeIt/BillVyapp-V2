'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Lock, Mail, Phone } from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ROUTES } from '@/constants/routes';
import { AuthErrorBanner } from '@/features/auth/components/auth-error-banner';
import { useLogin } from '@/features/auth/hooks/use-login';
import {
  loginSchema,
  type LoginValues,
} from '@/features/auth/schemas/auth.schema';
import { cn } from '@/lib/utils';

import { BrandLogo } from './brand-logo';

export function LoginFormCard() {
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      phone: '',
      password: '',
    },
  });

  const onSubmit = handleSubmit((values) => {
    login.mutate({
      email: values.email.trim(),
      password: values.password,
    });
  });

  const isSubmitting = login.isPending;

  return (
    <div data-auth-animate="card" className="w-full max-w-[440px]">
      <div className="auth-form-card rounded-2xl px-6 py-8 sm:px-9 sm:py-11">
        <div className="mb-7 flex flex-col items-center text-center">
          <div data-auth-animate="card-logo" className="mb-3">
            <BrandLogo variant="light" size="compact" />
          </div>
          <h2
            data-auth-animate="card-title"
            className="text-[1.65rem] font-bold tracking-tight text-text"
          >
            Welcome Back!
          </h2>
          <p
            data-auth-animate="card-subtitle"
            className="mt-2 text-sm leading-relaxed text-text-secondary"
          >
            Sign in to your account to continue
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field
            id="email"
            label="Email Address"
            error={errors.email?.message}
          >
            <div className="relative">
              <Mail
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-secondary"
                aria-hidden
              />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="Enter your email"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'email-error' : undefined}
                disabled={isSubmitting}
                className="auth-form-input h-11 border-border pl-10 text-text placeholder:text-text-secondary/70 focus-visible:border-brand-orange focus-visible:ring-brand-orange/25"
                {...register('email')}
              />
            </div>
          </Field>

          <Field
            id="phone"
            label="Phone Number"
            error={errors.phone?.message}
          >
            <div className="relative">
              <Phone
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-secondary"
                aria-hidden
              />
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder="+91 9966996688"
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? 'phone-error' : undefined}
                disabled={isSubmitting}
                className="auth-form-input h-11 border-border pl-10 text-text placeholder:text-text-secondary/70 focus-visible:border-brand-orange focus-visible:ring-brand-orange/25"
                {...register('phone')}
              />
            </div>
          </Field>

          <Field
            id="password"
            label="Password"
            error={errors.password?.message}
          >
            <div className="relative">
              <Lock
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-secondary"
                aria-hidden
              />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password ? 'password-error' : undefined
                }
                disabled={isSubmitting}
                className="auth-form-input h-11 border-border pr-11 pl-10 text-text placeholder:text-text-secondary/70 focus-visible:border-brand-orange focus-visible:ring-brand-orange/25"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-text-secondary transition-[color,transform,opacity] duration-150 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40 active:scale-95"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                disabled={isSubmitting}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 transition-opacity duration-150" aria-hidden />
                ) : (
                  <Eye className="h-4 w-4 transition-opacity duration-150" aria-hidden />
                )}
              </button>
            </div>
          </Field>

          <div data-auth-animate="field" className="flex justify-end">
            <Link
              href={ROUTES.auth.forgotPassword}
              className="text-sm font-medium text-brand-orange transition-colors hover:text-brand-orange-deep focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40"
            >
              Forgot Password?
            </Link>
          </div>

          {login.isError ? (
            <AuthErrorBanner className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
              {login.error.message}
            </AuthErrorBanner>
          ) : null}

          <div data-auth-animate="cta">
            <Button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                'auth-cta h-11 w-full rounded-lg border-0 text-base font-semibold text-white',
                'focus-visible:ring-brand-orange/35',
                'disabled:opacity-70',
              )}
            >
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </Button>
          </div>
        </form>

        <div
          data-auth-animate="secondary"
          className="mt-6 h-px w-full bg-border"
          aria-hidden
        />

        <p data-auth-animate="secondary" className="mt-5 text-center">
          <Link
            href={ROUTES.auth.register}
            className="text-sm font-medium text-text-secondary transition-colors hover:text-text focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40"
          >
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div data-auth-animate="field">
      <Label htmlFor={id} className="mb-2 text-[13px] font-medium text-charcoal">
        {label}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
