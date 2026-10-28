import type { Metadata } from 'next';
import { BrandedAuthShell } from '@/features/auth/components/branded-auth-shell';
import { ForgotPasswordCard } from '@/features/auth/components/forgot-password-card';

export const metadata: Metadata = {
  title: 'Forgot Password',
};

export default function ForgotPasswordPage() {
  return <BrandedAuthShell><ForgotPasswordCard /></BrandedAuthShell>;
}
