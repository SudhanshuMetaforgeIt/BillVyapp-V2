'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Lock, Mail, Phone, User } from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ROUTES } from '@/constants/routes';
import { AuthErrorBanner } from '@/features/auth/components/auth-error-banner';
import { useRegister } from '@/features/auth/hooks/use-register';
import {
  normalizeIndianPhone,
  registerSchema,
  type RegisterValues,
} from '@/features/auth/schemas/auth.schema';
import { cn } from '@/lib/utils';

import { BrandLogo } from './brand-logo';

const inputClassName =
  'auth-form-input h-11 border-neutral-200 bg-neutral-50 pl-10 text-neutral-900 placeholder:text-neutral-400 focus-visible:border-[#FF6A00] focus-visible:ring-[#FF6A00]/25';

export function RegisterFormCard() {
  const registerMutation = useRegister();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = handleSubmit((values) => {
    registerMutation.mutate({
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
      phone: normalizeIndianPhone(values.phone),
      password: values.password,
    });
  });

  const isSubmitting = registerMutation.isPending;

  return (
    <div data-auth-animate="card" className="w-full max-w-[440px]">
      <div className="auth-form-card rounded-2xl px-6 py-8 sm:px-9 sm:py-11">
        <div className="mb-7 flex flex-col items-center text-center">
          <div data-auth-animate="card-logo" className="mb-3">
            <BrandLogo variant="light" size="compact" />
          </div>
          <h2
            data-auth-animate="card-title"
            className="text-[1.65rem] font-bold tracking-tight text-neutral-900"
          >
            Create Your Account
          </h2>
          <p
            data-auth-animate="card-subtitle"
            className="mt-2 text-sm leading-relaxed text-neutral-500"
          >
            Join BillVyApp and manage your business experience with ease.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3.5" noValidate>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field
              id="firstName"
              label="First Name"
              error={errors.firstName?.message}
            >
              <div className="relative">
                <User
                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden
                />
                <Input
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  placeholder="First name"
                  aria-invalid={Boolean(errors.firstName)}
                  aria-describedby={
                    errors.firstName ? 'firstName-error' : undefined
                  }
                  disabled={isSubmitting}
                  className={inputClassName}
                  {...register('firstName')}
                />
              </div>
            </Field>

            <Field
              id="lastName"
              label="Last Name"
              error={errors.lastName?.message}
            >
              <div className="relative">
                <User
                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden
                />
                <Input
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  placeholder="Last name"
                  aria-invalid={Boolean(errors.lastName)}
                  aria-describedby={
                    errors.lastName ? 'lastName-error' : undefined
                  }
                  disabled={isSubmitting}
                  className={inputClassName}
                  {...register('lastName')}
                />
              </div>
            </Field>
          </div>

          <Field
            id="email"
            label="Email Address"
            error={errors.email?.message}
          >
            <div className="relative">
              <Mail
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400"
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
                className={inputClassName}
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
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400"
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
                className={inputClassName}
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
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400"
                aria-hidden
              />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Create a password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password ? 'password-error' : undefined
                }
                disabled={isSubmitting}
                className={cn(inputClassName, 'pr-11')}
                {...register('password')}
              />
              <PasswordToggle
                show={showPassword}
                onToggle={() => setShowPassword((prev) => !prev)}
                disabled={isSubmitting}
              />
            </div>
          </Field>

          <Field
            id="confirmPassword"
            label="Confirm Password"
            error={errors.confirmPassword?.message}
          >
            <div className="relative">
              <Lock
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400"
                aria-hidden
              />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Confirm your password"
                aria-invalid={Boolean(errors.confirmPassword)}
                aria-describedby={
                  errors.confirmPassword ? 'confirmPassword-error' : undefined
                }
                disabled={isSubmitting}
                className={cn(inputClassName, 'pr-11')}
                {...register('confirmPassword')}
              />
              <PasswordToggle
                show={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((prev) => !prev)}
                disabled={isSubmitting}
              />
            </div>
          </Field>

          {registerMutation.isError ? (
            <AuthErrorBanner className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {registerMutation.error.message}
            </AuthErrorBanner>
          ) : null}

          <div data-auth-animate="cta">
            <Button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                'auth-cta mt-1 h-11 w-full rounded-lg border-0 bg-[#FF6A00] text-base font-semibold text-white shadow-none',
                'hover:bg-[#e65f00] focus-visible:ring-[#FF6A00]/35',
                'disabled:opacity-70',
              )}
            >
              {isSubmitting ? 'Creating account…' : 'Create Account'}
            </Button>
          </div>
        </form>

        <p
          data-auth-animate="secondary"
          className="mt-6 text-center text-sm text-neutral-500"
        >
          Already have an account?{' '}
          <Link
            href={ROUTES.auth.login}
            className="font-medium text-[#FF6A00] transition-colors hover:text-[#e65f00] focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/40"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

function PasswordToggle({
  show,
  onToggle,
  disabled,
}: {
  show: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-neutral-400 transition-[color,transform,opacity] duration-150 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/40 active:scale-95"
      aria-label={show ? 'Hide password' : 'Show password'}
      aria-pressed={show}
      disabled={disabled}
    >
      {show ? (
        <EyeOff className="h-4 w-4" aria-hidden />
      ) : (
        <Eye className="h-4 w-4" aria-hidden />
      )}
    </button>
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
      <Label htmlFor={id} className="mb-2 text-[13px] font-medium text-neutral-700">
        {label}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
