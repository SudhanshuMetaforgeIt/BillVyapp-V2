import type { ReactNode } from 'react';
import '@/app/login-page.css';

/** The dark surface is server-rendered, before route content or GSAP hydrates. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-route-surface" style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', backgroundColor: '#141311', colorScheme: 'dark' }}>
      {children}
    </div>
  );
}
