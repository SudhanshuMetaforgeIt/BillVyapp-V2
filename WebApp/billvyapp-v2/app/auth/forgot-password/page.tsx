import type { Metadata } from 'next';
import { AuthPageShell } from '@/features/auth/components/auth-page-shell';
import { ForgotPasswordCard } from '@/features/auth/components/forgot-password-card';

export const metadata: Metadata = {
  title: 'Forgot Password',
};

export default function ForgotPasswordPage() {
  return <AuthPageShell><ForgotPasswordCard /></AuthPageShell>;
}
