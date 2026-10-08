import { RefreshCw, Shield, Sun } from 'lucide-react';

export function FeatureHighlights() {
  const features = [
    {
      title: 'Secure',
      description: 'Enterprise-grade security',
      icon: Shield,
    },
    {
      title: 'Fast',
      description: 'Optimized for performance',
      icon: RefreshCw,
    },
    {
      title: 'Reliable',
      description: 'Built for scale and reliability',
      icon: Sun,
    },
  ] as const;

  return (
    <div className="auth-feature-grid">
      <div className="auth-feature-grid-inner grid grid-cols-3 gap-3 @min-[24rem]:gap-6">
        {features.map(({ title, description, icon: Icon }) => (
          <div
            key={title}
            data-auth-animate="feature"
            className="min-w-0 text-center"
          >
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-[#FF7B00]/50 text-[#FF7B00] sm:h-11 sm:w-11">
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
            </div>
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-pretty text-white/45 sm:text-xs">
              {description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
