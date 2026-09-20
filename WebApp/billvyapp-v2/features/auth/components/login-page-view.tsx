'use client';

import { AuthPageShell } from '@/features/auth/components/auth-page-shell';
import { LoginFormCard } from '@/features/auth/components/login-form-card';

export function LoginPageView() {
  return (
    <AuthPageShell>
      <LoginFormCard />
    </AuthPageShell>
  );
}
