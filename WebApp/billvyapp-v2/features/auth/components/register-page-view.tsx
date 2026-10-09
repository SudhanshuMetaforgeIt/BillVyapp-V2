import { AuthPageShell } from "@/features/auth/components/auth-page-shell";
import Link from "next/link";

export function RegisterPageView() {
  return (
    <AuthPageShell>
      <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold">
          Contact your salon to get started
        </h1>
        <p className="mt-4 text-muted-foreground">
          Self-registration will be available when account ownership
          verification is ready. Your salon can help you create a customer
          profile. If you already have an account, sign in below.
        </p>
        <Link
          href="/auth/login"
          className="mt-6 inline-block font-medium text-primary underline"
        >
          Back to sign in
        </Link>
      </div>
    </AuthPageShell>
  );
}
