import type { Metadata } from 'next';

import { RegisterPageView } from '@/features/auth/components/register-page-view';

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create your BillVyApp customer account',
};

export default function RegisterPage() {
  return <RegisterPageView />;
}
