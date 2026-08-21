import { useEffect, useRef } from 'react';

// Attach the returned ref to any element; it'll shift vertically as the
// page scrolls, at `speed` (negative = moves slower/opposite to scroll,
// creating classic parallax depth). speed of 0.15–0.3 reads as "subtle".
export function useParallax(speed = 0.2) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let ticking = false;

    function update() {
      const rect = el.getBoundingClientRect();
      const viewportCenter = window.innerHeight / 2;
      const elCenter = rect.top + rect.height / 2;
      const distanceFromCenter = elCenter - viewportCenter;
      el.style.transform = `translateY(${distanceFromCenter * -speed}px)`;
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [speed]);

  return ref;
}
