'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PrefetchLink } from '@/components/ui/prefetch-link';
import { ROUTES } from '@/constants/routes';
import { api } from '@/services/api-client';
import { cn } from '@/lib/utils';
import { BrandLogo } from './brand-logo';

type Challenge = { challengeId: string; message: string; expiresInSeconds: number; resendAfterSeconds: number };
type Step = 'email' | 'code' | 'password' | 'done';

export function ForgotPasswordCard() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [resetToken, setResetToken] = useState('');
  const [resendAt, setResendAt] = useState(0);
  const [expiresAt, setExpiresAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (step !== 'code' && step !== 'password') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [step]);
  const cooldown = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const remaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const titles = { email: 'Forgot your password?', code: 'Check your email', password: 'Choose a new password', done: 'Password reset complete' };
  const subtitles = { email: 'Enter your account email to receive a verification code.', code: `If an active account exists for ${email}, a code will arrive shortly.`, password: 'Create a strong, unique password for your account.', done: 'Your password has been updated and previous sessions have been signed out.' };

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError('');
    try { await action(); }
    catch (err) { setError(err && typeof err === 'object' && 'message' in err && typeof err.message === 'string' ? err.message : 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  }
  function requestCode() {
    return run(async () => {
      const normalized = email.trim().toLowerCase();
      const result = await api.post<Challenge>('/auth/forgot-password', { email: normalized });
      const time = Date.now(); setEmail(normalized); setChallenge(result); setCode(''); setResetToken(''); setNow(time);
      setResendAt(time + result.resendAfterSeconds * 1000); setExpiresAt(time + result.expiresInSeconds * 1000); setStep('code');
    });
  }
  function verifyCode() {
    return run(async () => {
      const result = await api.post<{ resetToken: string; expiresInSeconds: number }>('/auth/verify-password-reset-otp', { challengeId: challenge?.challengeId, code });
      setResetToken(result.resetToken); setExpiresAt(Date.now() + result.expiresInSeconds * 1000); setNow(Date.now()); setCode(''); setStep('password');
    });
  }
  function resetPassword() {
    return run(async () => {
      if (password !== confirm) throw new Error('Passwords do not match.');
      await api.post('/auth/reset-password', { challengeId: challenge?.challengeId, resetToken, newPassword: password });
      setPassword(''); setConfirm(''); setResetToken(''); setChallenge(null); setStep('done');
    });
  }
  function startAgain() { setStep('email'); setCode(''); setPassword(''); setConfirm(''); setResetToken(''); setChallenge(null); setError(''); }

  return <div data-auth-animate="card" className="auth-form-shell @container"><div className="auth-form-card w-full min-w-0 rounded-2xl px-5 py-7 sm:px-9 sm:py-10">
    <div className="mb-7 flex flex-col items-center text-center"><BrandLogo variant="light" size="compact" /><div className={cn('mb-4 mt-6 flex size-12 items-center justify-center rounded-2xl', step === 'done' ? 'bg-emerald-light text-emerald' : 'bg-champagne-light text-charcoal')}>{step === 'done' ? <CheckCircle2 className="size-6" /> : step === 'code' ? <Mail className="size-6" /> : <KeyRound className="size-6" />}</div><h1 className="text-2xl font-bold tracking-tight">{titles[step]}</h1><p className="mt-2 max-w-sm break-words text-sm leading-relaxed text-text-secondary">{subtitles[step]}</p></div>
    {step !== 'done' && <ol aria-label="Password reset progress" className="mb-7 flex gap-2">{['Email', 'Verify code', 'New password'].map((label, index) => { const active = ['email', 'code', 'password'].indexOf(step); return <li key={label} aria-current={index === active ? 'step' : undefined} className="flex-1 text-center"><span className={cn('mb-2 block h-1 rounded-full', index <= active ? 'bg-champagne' : 'bg-muted')} /><span className={cn('text-[11px]', index === active ? 'font-semibold text-text' : 'text-text-secondary')}>{label}</span></li>; })}</ol>}
    <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (step === 'email') void requestCode(); else if (step === 'code') void verifyCode(); else if (step === 'password') void resetPassword(); }}>
      {step === 'email' && <div className="space-y-2"><Label htmlFor="reset-email">Email address</Label><Input id="reset-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={event => setEmail(event.target.value)} required maxLength={191} disabled={busy} className="auth-form-input" /></div>}
      {step === 'code' && <><div className="space-y-2"><Label htmlFor="reset-code">Verification code</Label><Input id="reset-code" type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} pattern="[0-9]{6}" minLength={6} maxLength={6} required disabled={busy} className="auth-form-input text-center text-2xl tracking-[0.4em]" autoFocus /></div><div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-secondary"><span aria-live="polite">{remaining > 0 ? `Code expires in ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}` : 'Code expired. Request another code.'}</span><button type="button" onClick={() => void requestCode()} disabled={busy || cooldown > 0} className="font-semibold text-text underline underline-offset-4 disabled:opacity-40">{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}</button></div><p className="text-xs text-text-secondary">Check your spam folder too. Never share your verification code.</p></>}
      {step === 'password' && <><div className="space-y-2"><Label htmlFor="new-password">New password</Label><div className="relative"><Input id="new-password" type={visible ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} required minLength={6} maxLength={128} disabled={busy} className="auth-form-input pr-11" autoFocus /><button type="button" aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} onClick={() => setVisible(value => !value)} className="absolute right-3 top-3 text-text-secondary">{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div><div className="space-y-2"><Label htmlFor="confirm-password">Confirm new password</Label><Input id="confirm-password" type={visible ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} required minLength={6} maxLength={128} disabled={busy} aria-invalid={Boolean(confirm && password !== confirm)} className="auth-form-input" /></div>{confirm && password !== confirm && <p className="text-xs text-danger">Passwords do not match.</p>}<p className="flex items-start gap-2 text-xs text-text-secondary"><ShieldCheck className="mt-0.5 size-3.5 shrink-0" />Your organisation’s password rules apply. All existing sessions will be signed out.</p>{remaining === 0 && <p role="alert" className="text-sm text-danger">This reset session expired. Start again to request a new code.</p>}</>}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-danger">{error}</p>}
      {step !== 'done' && <Button type="submit" disabled={busy || (step === 'code' && (code.length !== 6 || remaining === 0)) || (step === 'password' && (!password || password !== confirm || remaining === 0))} className="h-11 w-full">{busy ? 'Please wait…' : step === 'email' ? 'Send verification code' : step === 'code' ? 'Verify code' : 'Reset password'}<ArrowRight className="size-4" /></Button>}
    </form>
    {(step === 'code' || step === 'password') && <button type="button" onClick={startAgain} disabled={busy} className="mt-5 block w-full text-center text-xs font-medium text-text-secondary underline underline-offset-4">{step === 'code' ? 'Use a different email' : 'Start again'}</button>}
    <PrefetchLink href={ROUTES.auth.login} className={cn('mt-6 flex items-center justify-center gap-2 text-sm font-medium', step === 'done' ? 'rounded-lg bg-primary px-4 py-3 text-primary-foreground' : 'text-text-secondary hover:text-text')}><ArrowLeft className="size-4" />Back to sign in</PrefetchLink>
  </div></div>;
}
