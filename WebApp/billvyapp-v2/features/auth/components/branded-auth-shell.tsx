import { ChartNoAxesCombined, Check, ReceiptText, ShieldCheck, UsersRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { AuthEntranceWrapper } from './auth-entrance-wrapper';
import { BrandLogo } from './brand-logo';

const description = 'From your first appointment to your last payment. Bring your team, customers, and business together in one place.';
const descriptionWords = description.split(' ');

export function BrandedAuthShell({ children, animate = true, storyMotion = false }: { children: ReactNode; animate?: boolean; storyMotion?: boolean }) {
  const content = <>
      <div className="auth-scene" aria-hidden><div data-auth-scene className="auth-scene-image" /></div>
      <aside className="login-story" aria-label="About BillVyApp">
        <div data-auth-animate="logo" className="login-story-logo">
          <BrandLogo variant="dark" size="compact" priority />
          <span>YOUR BUSINESS, CONNECTED</span>
        </div>
        <div className="login-story-content">
          <p data-auth-animate={storyMotion ? undefined : 'copy'} className="login-eyebrow"><span data-auth-story-dot aria-hidden /> <span data-auth-story-eyebrow>A smarter way to work</span></p>
          <h1 data-auth-animate={storyMotion ? undefined : 'headline'} aria-label="Smarter billing. Stronger business.">
            {storyMotion ? <><span className="login-headline-mask"><span data-auth-story-line>Smarter billing.</span></span>{' '}<span className="login-headline-mask"><span data-auth-story-line>Stronger <span className="login-headline-accent">business.</span></span></span></> : <>Smarter billing.<br />Stronger <span className="login-headline-accent">business.</span></>}
          </h1>
          <p data-auth-animate={storyMotion ? undefined : 'copy'} className="login-story-description">{storyMotion ? descriptionWords.map((word, index) => <span key={index}><span data-auth-story-word>{word}</span>{index < descriptionWords.length - 1 ? ' ' : ''}</span>) : description}</p>
          <div data-auth-animate="feature" className="login-workspace-preview" aria-hidden>
            <div className="login-preview-heading"><span className="login-preview-mark"><ReceiptText size={19} /></span><div><strong>Everything in sync</strong><span>Your daily business, simplified</span></div><span className="login-preview-check"><Check size={15} /></span></div>
            <div className="login-preview-tools">
              {[{ icon: ReceiptText, label: 'Billing' }, { icon: UsersRound, label: 'Customers' }, { icon: ChartNoAxesCombined, label: 'Insights' }].map(({ icon: Icon, label }) => <span key={label}><Icon size={18} />{label}</span>)}
            </div>
          </div>
        </div>
        <div data-auth-animate={storyMotion ? undefined : 'feature'} className="login-story-footer"><ShieldCheck data-auth-story-seal size={18} /><span data-auth-story-closing>One workspace. Every part of your business.</span></div>
      </aside>

      <main className="login-main">
        <div className="login-mobile-brand" data-auth-animate="logo"><BrandLogo variant="dark" size="compact" priority /></div>
        <div className="login-form-position">{children}</div>
        <footer data-auth-animate="footer" className="login-page-footer">© 2026 BillVyApp <span aria-hidden>·</span> Metaforgeit Solutions</footer>
      </main>
    </>;
  return animate ? <AuthEntranceWrapper className={`login-page-shell${storyMotion ? ' auth-story-motion' : ''}`}>{content}</AuthEntranceWrapper> : <div className="auth-page-shell login-page-shell relative flex-1">{content}</div>;
}
