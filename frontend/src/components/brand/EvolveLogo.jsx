import './evolve-logo.css';

/**
 * Evolve Gym wordmark.
 *
 * variant:
 *  - "full"    EVOLVE + GYM + tagline (marketing header, footer, auth pages)
 *  - "compact" EVOLVE + GYM only (dashboard shell header, tight spaces)
 *  - "mark"    just the circular swoosh emblem (favicon-style, loading states)
 *
 * tone: "light" (default, for dark backgrounds) | "dark" (for light/white backgrounds)
 */
export default function EvolveLogo({ variant = 'full', tone = 'light', className = '' }) {
  const wordColor = tone === 'dark' ? '#1A1A1A' : '#FFFFFF';

  if (variant === 'mark') {
    return (
      <svg
        className={`evolve-mark ${className}`}
        viewBox="0 0 64 64"
        role="img"
        aria-label="Evolve Gym"
      >
        <circle cx="32" cy="32" r="30" fill="none" stroke="#E60000" strokeWidth="2.5" opacity="0.5" />
        <path d="M32 10 C19.8 10 10 19.8 10 32 C10 44.2 19.8 54 32 54"
          fill="none" stroke="#E60000" strokeWidth="6.5" strokeLinecap="round" />
        <path d="M32 10 C44.2 10 54 19.8 54 32 C54 44.2 44.2 54 32 54"
          fill="none" stroke="#00A3E0" strokeWidth="6.5" strokeLinecap="round" />
        <path d="M20 39 L32 21 L44 39" fill="none" stroke={wordColor} strokeWidth="4.5"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <div className={`evolve-logo evolve-logo--${tone} ${className}`}>
      <svg className="evolve-wordmark" viewBox="0 0 360 74" role="img" aria-labelledby="evolveTitle">
        <title id="evolveTitle">Evolve Gym</title>
        <text x="0" y="52" className="evolve-wordmark-text">
          EV
          <tspan className="evolve-o-red">O</tspan>
          LVE
        </text>
        {/* Swoosh through the O, echoing the brand-sheet mark */}
        <path className="evolve-wordmark-swoosh" d="M96 14 C84 24 84 44 100 58"
          fill="none" strokeWidth="5" strokeLinecap="round" />
      </svg>

      {variant === 'full' && (
        <>
          <div className="evolve-sub">GYM</div>
          <div className="evolve-tagline">FITNESS &bull; PERFORMANCE &bull; RESULTS</div>
        </>
      )}
      {variant === 'compact' && <div className="evolve-sub evolve-sub--compact">GYM</div>}
    </div>
  );
}
