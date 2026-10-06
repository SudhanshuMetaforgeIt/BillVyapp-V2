import { AuthPageShell } from '@/features/auth/components/auth-page-shell';
import { RegisterFormCard } from '@/features/auth/components/register-form-card';

export function RegisterPageView() {
  return (
    <AuthPageShell>
      <RegisterFormCard />
    </AuthPageShell>
  );
}
