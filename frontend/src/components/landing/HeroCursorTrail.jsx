import { useEffect, useRef } from 'react';

// A soft glowing trail of dots that follows the cursor while it's over the
// hero section — purely ambient, sits behind the hero text (see the CSS
// stacking notes in landing.css), and does nothing on touch devices or
// for prefers-reduced-motion.
export default function HeroCursorTrail({ targetSelector = '.gl-hero' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    if (window.matchMedia?.('(pointer: coarse)').matches) return undefined; // no real cursor on touch

    const canvas = canvasRef.current;
    const target = canvas?.closest(targetSelector);
    if (!canvas || !target) return undefined;

    const ctx = canvas.getContext('2d');
    let particles = [];
    let raf;

    function resize() {
      const rect = target.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
    resize();
    window.addEventListener('resize', resize);

    function handleMove(e) {
      const rect = target.getBoundingClientRect();
      particles.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, life: 1 });
      if (particles.length > 40) particles.shift();
    }
    target.addEventListener('mousemove', handleMove);

    function loop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.life -= 0.035;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0, 3 * p.life), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(198, 255, 43, ${Math.max(0, p.life) * 0.55})`;
        ctx.fill();
      });
      particles = particles.filter((p) => p.life > 0);
      raf = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      target.removeEventListener('mousemove', handleMove);
    };
  }, [targetSelector]);

  return <canvas ref={canvasRef} className="gl-hero-cursor-trail" aria-hidden="true" />;
}
