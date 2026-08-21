import { useEffect, useState } from 'react';

export default function ScrollProgressBar() {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    function onScroll() {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setPercent(docHeight > 0 ? Math.min(100, Math.max(0, (window.scrollY / docHeight) * 100)) : 0);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div className="gl-scroll-progress-track">
      <div className="gl-scroll-progress-fill" style={{ width: `${percent}%` }} />
    </div>
  );
}
