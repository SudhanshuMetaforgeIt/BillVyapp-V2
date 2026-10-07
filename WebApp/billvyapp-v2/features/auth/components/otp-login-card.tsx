'use client';
import { normalizePhone, type PhoneCountry } from '@/lib/phone';

import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound } from 'lucide-react';
import { PrefetchLink } from '@/components/ui/prefetch-link';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ROUTES } from '@/constants/routes';
import { AuthErrorBanner } from '@/features/auth/components/auth-error-banner';
import { useSendOtp, useVerifyOtp } from '@/features/auth/hooks/use-otp-login';
import {
  normalizeIndianPhone,
  sendOtpSchema,
  verifyOtpSchema,
  type SendOtpValues,
  type VerifyOtpValues,
} from '@/features/auth/schemas/auth.schema';
import type { OtpStep } from '@/features/auth/types/auth.types';
import { cn } from '@/lib/utils';

import { BrandLogo } from './brand-logo';

const INPUT_CLASS =
  'auth-form-input h-11 border-border pl-10 text-text placeholder:text-text-secondary/70 focus-visible:border-brand-orange focus-visible:ring-brand-orange/25';

/**
 * Customer sign-in with a one-time code: POST /auth/send-otp then
 * POST /auth/verify-otp. Only existing CUSTOMER accounts can complete it.
 */
export function OtpLoginCard() {
  const [phoneCountry, setPhoneCountry] = useState<PhoneCountry>('IN');
  const sendOtp = useSendOtp();
  const verifyOtp = useVerifyOtp();
  const [step, setStep] = useState<OtpStep>('request-code');
  const [phone, setPhone] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const phoneForm = useForm<SendOtpValues>({
    resolver: zodResolver(sendOtpSchema),
    defaultValues: { phone: '' },
  });

  const codeForm = useForm<VerifyOtpValues>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: { phone: '', code: '' },
  });

  const requestCode = phoneForm.handleSubmit((values) => {
    const normalized = normalizePhone(values.phone, phoneCountry);
    sendOtp.mutate(
      { phone: normalized },
      {
        onSuccess: (response) => {
          setPhone(normalized);
          setDevOtp(response.devOtp ?? null);
          codeForm.reset({ phone: normalized, code: '' });
          setStep('verify-code');
        },
      },
    );
  });

  const submitCode = codeForm.handleSubmit((values) => {
    verifyOtp.mutate({ phone: values.phone, otp: values.code });
  });

  const error = step === 'request-code' ? sendOtp.error : verifyOtp.error;

  return (
    <div data-auth-animate="card" className="auth-form-shell @container">
      <div className="auth-form-card w-full min-w-0 rounded-2xl px-5 py-7 sm:px-9 sm:py-11">
        <div className="mb-7 flex flex-col items-center text-center">
          <div data-auth-animate="card-logo" className="mb-3">
            <BrandLogo variant="light" size="compact" />
          </div>
          <h2
            data-auth-animate="card-title"
            className="text-[1.65rem] font-bold tracking-tight text-text"
          >
            Sign in with OTP
          </h2>
          <p
            data-auth-animate="card-subtitle"
            className="mt-2 text-sm leading-relaxed text-text-secondary"
          >
            {step === 'request-code'
              ? 'Enter your registered mobile number to receive a code'
              : `Enter the 6-digit code sent to ${phone}`}
          </p>
        </div>

        {step === 'request-code' ? (
          <form onSubmit={requestCode} className="space-y-4" noValidate>
            <Field
              id="otp-phone"
              label="Mobile Number"
              error={phoneForm.formState.errors.phone?.message}
            >
              <div className="relative">
                <Input
                  id="otp-phone"
                  type="tel"
                  phoneCountry={phoneCountry}
                  onPhoneCountryChange={setPhoneCountry}
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="9966996688"
                  aria-invalid={Boolean(phoneForm.formState.errors.phone)}
                  disabled={sendOtp.isPending}
                  className={INPUT_CLASS}
                  {...phoneForm.register('phone', {
                    setValueAs: (v: string) => normalizeIndianPhone(v ?? ''),
                  })}
                />
              </div>
            </Field>

            {error ? (
              <AuthErrorBanner className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
                {error.message}
              </AuthErrorBanner>
            ) : null}

            <Button
              type="submit"
              disabled={sendOtp.isPending}
              className={cn(
                'auth-cta h-11 w-full rounded-lg border-0 text-base font-semibold text-white',
                'disabled:opacity-70',
              )}
            >
              {sendOtp.isPending ? 'Sending code…' : 'Send Code'}
            </Button>
          </form>
        ) : (
          <form onSubmit={submitCode} className="space-y-4" noValidate>
            <Field
              id="otp-code"
              label="One-time Code"
              error={codeForm.formState.errors.code?.message}
            >
              <div className="relative">
                <KeyRound
                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-secondary"
                  aria-hidden
                />
                <Input
                  id="otp-code"
                  type="text"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6-digit code"
                  aria-invalid={Boolean(codeForm.formState.errors.code)}
                  disabled={verifyOtp.isPending}
                  className={INPUT_CLASS}
                  {...codeForm.register('code')}
                />
              </div>
            </Field>

            {devOtp ? (
              <p className="rounded-lg border border-border bg-ivory-soft px-3 py-2 text-xs text-text-secondary">
                Development code:{' '}
                <span className="font-mono font-semibold">{devOtp}</span>
              </p>
            ) : null}

            {error ? (
              <AuthErrorBanner className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
                {error.message}
              </AuthErrorBanner>
            ) : null}

            <Button
              type="submit"
              disabled={verifyOtp.isPending}
              className={cn(
                'auth-cta h-11 w-full rounded-lg border-0 text-base font-semibold text-white',
                'disabled:opacity-70',
              )}
            >
              {verifyOtp.isPending ? 'Verifying…' : 'Verify & Sign In'}
            </Button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                className="font-medium text-text-secondary hover:text-text"
                onClick={() => {
                  verifyOtp.reset();
                  setStep('request-code');
                }}
              >
                Change number
              </button>
              <button
                type="button"
                className="font-medium text-brand-orange hover:text-brand-orange-deep disabled:opacity-60"
                disabled={sendOtp.isPending}
                onClick={() =>
                  sendOtp.mutate(
                    { phone },
                    { onSuccess: (r) => setDevOtp(r.devOtp ?? null) },
                  )
                }
              >
                Resend code
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 h-px w-full bg-border" aria-hidden />

        <p className="mt-5 flex justify-center gap-4 text-center text-sm">
          <PrefetchLink
            href={ROUTES.auth.login}
            prefetchStrategy="intent"
            className="font-medium text-text-secondary transition-colors hover:text-text"
          >
            Sign in with password
          </PrefetchLink>
          <PrefetchLink
            href={ROUTES.auth.register}
            prefetchStrategy="intent"
            className="font-medium text-text-secondary transition-colors hover:text-text"
          >
            Create Account
          </PrefetchLink>
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
    <div data-auth-animate="field" className="min-w-0">
      <Label
        htmlFor={id}
        className="mb-2 text-[13px] font-medium text-charcoal"
      >
        {label}
      </Label>
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 text-xs text-danger"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
