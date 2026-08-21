import { useEffect, useRef, useState } from 'react';
import './split-text.css';

// Wraps each word in a masked span and reveals them in a staggered wave when
// the element scrolls into view. as="h2" etc. controls the wrapper tag.
export default function SplitText({ text, as: Tag = 'span', className = '' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const words = text.split(' ');

  return (
    <Tag ref={ref} className={`split-text ${className}`}>
      {words.map((word, i) => (
        <span className="split-text-mask" key={i}>
          <span
            className={`split-text-word ${visible ? 'in' : ''}`}
            style={{ transitionDelay: `${i * 60}ms` }}
          >
            {word}
            {i < words.length - 1 ? '\u00A0' : ''}
          </span>
        </span>
      ))}
    </Tag>
  );
}
