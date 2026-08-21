import { useEffect } from 'react';

// Adds a "revealed" class to every element with class "reveal" once it
// scrolls into view. The actual hidden/shown styling (and the
// prefers-reduced-motion opt-out) lives in CSS — this hook only toggles
// the class, so motion-sensitive users see everything immediately.
export function useScrollReveal(deps = []) {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal:not(.revealed)');
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
