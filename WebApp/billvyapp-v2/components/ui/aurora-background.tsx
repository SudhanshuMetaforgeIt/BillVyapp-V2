/**
 * Soft Aurora glow layer for auth / branded surfaces.
 * Decorative only — no interaction, respects reduced motion via CSS.
 */
export function AuroraBackground({ className }: { className?: string }) {
  return (
    <div aria-hidden className={`aurora-glow-layer ${className ?? ''}`}>
      <div className="aurora-orb aurora-orb-a" />
      <div className="aurora-orb aurora-orb-b" />
      <div className="aurora-orb aurora-orb-c" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgb(11_15_20_/0.55)_100%)]" />
    </div>
  );
}
