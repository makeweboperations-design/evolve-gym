import { useEffect } from 'react';

// Adds a subtle 3D tilt that follows the cursor to each matched element —
// the card leans slightly toward wherever the mouse is over it, on top of
// its existing hover lift. Sets the transform directly (rather than via a
// CSS class) so it layers cleanly with each card's existing :hover rules;
// clearing the inline style on mouseleave hands control straight back to
// CSS, no flicker. Skips entirely for prefers-reduced-motion.
export function useTiltEffect(selector, maxTiltDeg = 6) {
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    const els = document.querySelectorAll(selector);
    if (els.length === 0) return undefined;

    function handleMove(e) {
      const card = e.currentTarget;
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width; // 0..1
      const py = (e.clientY - rect.top) / rect.height; // 0..1
      const rotateY = (px - 0.5) * maxTiltDeg * 2;
      const rotateX = (0.5 - py) * maxTiltDeg * 2;
      card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    }
    function handleLeave(e) {
      e.currentTarget.style.transform = '';
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
  }, [selector, maxTiltDeg]);
}
