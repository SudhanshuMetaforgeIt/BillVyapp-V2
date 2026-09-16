import {
  gsap,
  isCompactViewport,
  prefersReducedMotion,
} from './gsap-client';

/**
 * Shared GSAP timing / easing for BillVyApp.
 * Keep values restrained — premium SaaS, not a marketing splash.
 */

export const AUTH_EASE = 'power3.out' as const;

export const AUTH_DURATION = {
  micro: 0.16,
  short: 0.32,
  medium: 0.48,
  page: 0.58,
} as const;

export const AUTH_STAGGER = {
  tight: 0.045,
  normal: 0.065,
  loose: 0.09,
} as const;

export type AuthEntranceScope = {
  /** Page root — branding + form column. */
  root: HTMLElement;
};

/**
 * Orchestrates the auth page entrance timeline.
 * Returns null when reduced motion is preferred (caller leaves content visible).
 */
export function playAuthPageEntrance({ root }: AuthEntranceScope): gsap.core.Timeline | null {
  if (prefersReducedMotion()) return null;

  const compact = isCompactViewport();
  const y = compact ? 10 : 16;
  const brandingY = compact ? 8 : 14;

  const branding = root.querySelectorAll<HTMLElement>('[data-auth-animate="branding"]');
  const logo = root.querySelectorAll<HTMLElement>('[data-auth-animate="logo"]');
  const headline = root.querySelectorAll<HTMLElement>('[data-auth-animate="headline"]');
  const copy = root.querySelectorAll<HTMLElement>('[data-auth-animate="copy"]');
  const preview = root.querySelectorAll<HTMLElement>('[data-auth-animate="preview"]');
  const features = root.querySelectorAll<HTMLElement>('[data-auth-animate="feature"]');
  const decor = root.querySelectorAll<HTMLElement>('[data-auth-animate="decor"]');
  const card = root.querySelectorAll<HTMLElement>('[data-auth-animate="card"]');
  const cardLogo = root.querySelectorAll<HTMLElement>('[data-auth-animate="card-logo"]');
  const cardTitle = root.querySelectorAll<HTMLElement>('[data-auth-animate="card-title"]');
  const cardSubtitle = root.querySelectorAll<HTMLElement>(
    '[data-auth-animate="card-subtitle"]',
  );
  const fields = root.querySelectorAll<HTMLElement>('[data-auth-animate="field"]');
  const cta = root.querySelectorAll<HTMLElement>('[data-auth-animate="cta"]');
  const secondary = root.querySelectorAll<HTMLElement>('[data-auth-animate="secondary"]');
  const footer = root.querySelectorAll<HTMLElement>('[data-auth-animate="footer"]');

  const tl = gsap.timeline({
    defaults: { ease: AUTH_EASE, duration: AUTH_DURATION.medium },
  });

  if (branding.length) {
    gsap.set(branding, { opacity: 0, x: compact ? 0 : -18 });
    tl.to(branding, { opacity: 1, x: 0, duration: AUTH_DURATION.page }, 0);
  }

  if (logo.length) {
    gsap.set(logo, { opacity: 0, y: 8, scale: 0.96 });
    tl.to(
      logo,
      { opacity: 1, y: 0, scale: 1, duration: AUTH_DURATION.short },
      0.08,
    );
  }

  if (headline.length) {
    gsap.set(headline, { opacity: 0, y: brandingY });
    tl.to(headline, { opacity: 1, y: 0 }, 0.14);
  }

  if (copy.length) {
    gsap.set(copy, { opacity: 0, y: brandingY * 0.75 });
    tl.to(copy, { opacity: 1, y: 0, duration: AUTH_DURATION.short }, 0.2);
  }

  if (preview.length) {
    gsap.set(preview, { opacity: 0, y: brandingY });
    tl.to(preview, { opacity: 1, y: 0, duration: AUTH_DURATION.page }, 0.28);
  }

  if (features.length) {
    gsap.set(features, { opacity: 0, y: 10 });
    tl.to(
      features,
      {
        opacity: 1,
        y: 0,
        duration: AUTH_DURATION.short,
        stagger: AUTH_STAGGER.normal,
      },
      0.4,
    );
  }

  if (decor.length) {
    gsap.set(decor, { opacity: 0, scale: 0.92 });
    tl.to(
      decor,
      {
        opacity: 1,
        scale: 1,
        duration: AUTH_DURATION.page,
        stagger: AUTH_STAGGER.tight,
      },
      0.12,
    );
  }

  if (card.length) {
    gsap.set(card, { opacity: 0, y, scale: 0.985 });
    tl.to(
      card,
      { opacity: 1, y: 0, scale: 1, duration: AUTH_DURATION.page },
      0.16,
    );
  }

  if (cardLogo.length) {
    gsap.set(cardLogo, { opacity: 0, y: 6, scale: 0.97 });
    tl.to(
      cardLogo,
      { opacity: 1, y: 0, scale: 1, duration: AUTH_DURATION.short },
      0.28,
    );
  }

  if (cardTitle.length) {
    gsap.set(cardTitle, { opacity: 0, y: 8 });
    tl.to(cardTitle, { opacity: 1, y: 0, duration: AUTH_DURATION.short }, 0.34);
  }

  if (cardSubtitle.length) {
    gsap.set(cardSubtitle, { opacity: 0, y: 6 });
    tl.to(
      cardSubtitle,
      { opacity: 1, y: 0, duration: AUTH_DURATION.short },
      0.38,
    );
  }

  if (fields.length) {
    gsap.set(fields, { opacity: 0, y: 8 });
    tl.to(
      fields,
      {
        opacity: 1,
        y: 0,
        duration: AUTH_DURATION.short,
        stagger: AUTH_STAGGER.tight,
      },
      0.42,
    );
  }

  if (cta.length) {
    gsap.set(cta, { opacity: 0, y: 8 });
    tl.to(cta, { opacity: 1, y: 0, duration: AUTH_DURATION.short }, 0.52);
  }

  if (secondary.length) {
    gsap.set(secondary, { opacity: 0, y: 6 });
    tl.to(
      secondary,
      { opacity: 1, y: 0, duration: AUTH_DURATION.short },
      0.58,
    );
  }

  if (footer.length) {
    gsap.set(footer, { opacity: 0 });
    tl.to(footer, { opacity: 1, duration: AUTH_DURATION.short }, 0.62);
  }

  return tl;
}

/** Subtle reveal for validation / API error banners. */
export function playErrorReveal(el: HTMLElement | null): void {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(
    el,
    { opacity: 0, y: 6 },
    { opacity: 1, y: 0, duration: AUTH_DURATION.short, ease: AUTH_EASE },
  );
}
