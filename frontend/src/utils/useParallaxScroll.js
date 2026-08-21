import { useEffect } from 'react';

// Moves matched elements at a fraction of scroll speed for a simple depth
// effect — background elements drift slower than the page scrolls past
// them. Skips entirely for prefers-reduced-motion.
export function useParallaxScroll(selector, speed = 0.15) {
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    const els = document.querySelectorAll(selector);
    if (els.length === 0) return undefined;

    let raf = null;
    function handleScroll() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const offset = window.scrollY * speed;
        els.forEach((el) => {
          el.style.transform = `translateY(${offset}px)`;
        });
        raf = null;
      });
    }

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (raf) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selector, speed]);
}
