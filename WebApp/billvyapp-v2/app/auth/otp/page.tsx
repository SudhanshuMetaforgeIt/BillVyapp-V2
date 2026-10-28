import type { Metadata } from 'next';

import { BrandedAuthShell } from '@/features/auth/components/branded-auth-shell';
import { OtpLoginCard } from '@/features/auth/components/otp-login-card';

export const metadata: Metadata = {
  title: 'Sign In with OTP',
  description: 'Sign in to your BillVyApp customer account with a one-time code',
};

export default function OtpLoginPage() {
  return (
    <BrandedAuthShell>
      <OtpLoginCard />
    </BrandedAuthShell>
  );
}
