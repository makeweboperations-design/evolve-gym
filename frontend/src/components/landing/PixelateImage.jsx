import { useEffect, useRef, useState } from 'react';
import './pixelate-image.css';

// Draws an <img> onto a <canvas> that matches its actual rendered size
// (via ResizeObserver + devicePixelRatio, so it's always sharp — not a
// fixed low-res buffer stretched to fit), first as large blocky pixels,
// then animates the pixel size down to 1 (fully clear) once scrolled
// into view.
export default function PixelateImage({ src, alt = '', className = '' }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const [triggered, setTriggered] = useState(false);
  const currentPixelSize = useRef(24);
  const offscreenRef = useRef(null);

  // Keep the canvas's internal pixel buffer matched to its actual
  // displayed size, so drawImage isn't stretching a mismatched resolution.
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      const { width, height } = entry.contentRect;
      if (width === 0 || height === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      drawPixelated(currentPixelSize.current * dpr);
    });
    ro.observe(container);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTriggered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => {
      imgRef.current = img;
      drawPixelated(currentPixelSize.current); // start blocky even before triggered
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // No photo on hand yet — render the brand placeholder instead of a
  // canvas. Once a real file is dropped into the matching src/assets/
  // path and imported, this component switches back to the pixelate-in
  // photo effect automatically — no other code changes needed.
  if (!src) {
    return (
      <div className={`pixelate-wrap pixelate-placeholder ${className}`} ref={containerRef} role="img" aria-label={alt}>
        <span className="pixelate-placeholder-mark" aria-hidden="true">EG</span>
      </div>
    );
  }

  function drawPixelated(pixelSize) {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || canvas.width === 0 || canvas.height === 0) return;

    const w = canvas.width;
    const h = canvas.height;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Cover-fit the source image into the canvas's aspect ratio first,
    // so proportions stay correct regardless of the card's shape.
    const canvasRatio = w / h;
    const imgRatio = img.width / img.height;
    let sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (imgRatio > canvasRatio) {
      sw = img.height * canvasRatio;
      sx = (img.width - sw) / 2;
    } else {
      sh = img.width / canvasRatio;
      sy = (img.height - sh) / 2;
    }

    // Once the effect is essentially finished, draw the source straight
    // into the full-resolution canvas — no small intermediate buffer, no
    // rounding, no smoothing toggles. IMPORTANT: pixelSize here is already
    // in canvas-pixel space (i.e. pre-multiplied by devicePixelRatio by
    // the caller), so "finished" means pixelSize <= dpr, not <= 1 — on a
    // 2x/3x display, comparing against a flat 1 would never be true, and
    // the image would stay very slightly soft forever even after the
    // animation completes.
    if (pixelSize <= dpr) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
      return;
    }

    const scaledW = Math.max(1, Math.floor(w / pixelSize));
    const scaledH = Math.max(1, Math.floor(h / pixelSize));

    // Draw the downscaled version into a SEPARATE offscreen canvas first.
    // Drawing a canvas onto itself in one drawImage call (source and
    // destination sharing the same buffer) is undefined/inconsistent in
    // Canvas2D and is what caused the smeared/overlapping artifacts —
    // this two-buffer approach avoids that entirely.
    if (!offscreenRef.current) {
      offscreenRef.current = document.createElement('canvas');
    }
    const off = offscreenRef.current;
    off.width = scaledW;
    off.height = scaledH;
    const offCtx = off.getContext('2d');
    // Smoothing ON here: this step is a genuine resize (photo -> tiny
    // buffer), and we want each resulting "pixel" to be a proper area
    // average of the source, not an aliased nearest-neighbor sample —
    // that's what makes the blocky phase look like a clean pixelation
    // effect instead of visual noise.
    offCtx.imageSmoothingEnabled = true;
    offCtx.clearRect(0, 0, scaledW, scaledH);
    offCtx.drawImage(img, sx, sy, sw, sh, 0, 0, scaledW, scaledH);

    // Smoothing OFF here: this step blows the tiny buffer back up, and we
    // want that to look chunky/blocky (the actual pixelation look) rather
    // than blurred.
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(off, 0, 0, scaledW, scaledH, 0, 0, w, h);
  }

  useEffect(() => {
    if (!triggered) return;
    let frame;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const duration = 900;
    const start = performance.now();

    function animate(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const pixelSize = Math.max(1, 24 - eased * 23);
      currentPixelSize.current = pixelSize;
      drawPixelated(pixelSize * dpr);
      if (progress < 1) frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggered]);

  return (
    <div className={`pixelate-wrap ${className}`} ref={containerRef}>
      <canvas ref={canvasRef} role="img" aria-label={alt} />
    </div>
  );
}
