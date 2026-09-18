import type { Metadata } from 'next';

import { LoginPageView } from '@/features/auth/components/login-page-view';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your BillVyApp account',
};

export default function LoginPage() {
  return <LoginPageView />;
}
