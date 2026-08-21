import { useEffect } from 'react';

const COLORS = ['#c6ff2b', '#fff7b0', '#9ee620', '#ffffff'];

// A satisfying "confirmed" burst of particles from wherever the user
// clicked a primary CTA. Particles are appended straight to <body> (not
// part of React's tree) so they aren't affected by whatever happens to
// the button afterward (e.g. an immediate route change) — they just play
// their short animation and remove themselves via animationend, however
// the button's own life cycle unfolds. Skips entirely for
// prefers-reduced-motion.
export function useClickBurst(selector = '.gl-btn-primary') {
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    const els = document.querySelectorAll(selector);
    if (els.length === 0) return undefined;

    function handleClick(e) {
      const originX = e.clientX;
      const originY = e.clientY;
      const count = 14;

      for (let i = 0; i < count; i++) {
        const particle = document.createElement('span');
        particle.className = 'gl-click-particle';
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const distance = 40 + Math.random() * 50;
        particle.style.left = `${originX}px`;
        particle.style.top = `${originY}px`;
        particle.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
        particle.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
        particle.style.background = COLORS[i % COLORS.length];
        document.body.appendChild(particle);
        particle.addEventListener('animationend', () => particle.remove());
      }
    }

    els.forEach((el) => el.addEventListener('click', handleClick));
    return () => els.forEach((el) => el.removeEventListener('click', handleClick));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selector]);
}
