import { useEffect } from 'react';

// Tracks the cursor position over each matched button and exposes it as
// CSS custom properties (--mx / --my), which the button's ::after
// pseudo-element uses to position a soft radial spotlight that follows
// the mouse. Respects prefers-reduced-motion by simply not attaching any
// listeners — the button still works and looks fine without the effect.
export function useMagneticGlow(selector = '.gl-btn-primary') {
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    const els = document.querySelectorAll(selector);
    if (els.length === 0) return undefined;

    function handleMove(e) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      e.currentTarget.style.setProperty('--mx', `${x}%`);
      e.currentTarget.style.setProperty('--my', `${y}%`);
    }
    function handleLeave(e) {
      e.currentTarget.style.removeProperty('--mx');
      e.currentTarget.style.removeProperty('--my');
    }

    els.forEach((el) => {
      el.addEventListener('mousemove', handleMove);
      el.addEventListener('mouseleave', handleLeave);
    });

    return () => {
      els.forEach((el) => {
        el.removeEventListener('mousemove', handleMove);
        el.removeEventListener('mouseleave', handleLeave);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selector]);
}
