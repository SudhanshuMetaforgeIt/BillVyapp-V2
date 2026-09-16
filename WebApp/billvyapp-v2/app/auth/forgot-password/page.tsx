import type { Metadata } from 'next';
import Link from 'next/link';

import { ROUTES } from '@/constants/routes';

export const metadata: Metadata = {
  title: 'Forgot Password',
};

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#F7F7F7] px-4">
      <div className="w-full max-w-md rounded-2xl border border-black/5 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-neutral-900">
          Forgot Password
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Password reset is not available yet. Please contact your administrator
          if you need help signing in.
        </p>
        <Link
          href={ROUTES.auth.login}
          className="mt-6 inline-block text-sm font-medium text-[#FF6A00] hover:text-[#e65f00]"
        >
          Back to Sign In
        </Link>
      </div>
    </main>
  );
}
