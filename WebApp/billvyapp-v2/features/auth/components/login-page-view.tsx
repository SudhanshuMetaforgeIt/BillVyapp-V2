import { BrandedAuthShell } from './branded-auth-shell';
import { LoginFormCard } from './login-form-card';

export function LoginPageView() {
  return <BrandedAuthShell storyMotion><LoginFormCard /></BrandedAuthShell>;
}
