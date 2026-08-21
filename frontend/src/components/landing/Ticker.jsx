import './ticker.css';

const ITEMS = [
  { icon: '🏋️', label: 'Certified Strength Trainers' },
  { icon: '📋', label: 'Personalized Diet Plans' },
  { icon: '📈', label: 'Real-Time Progress Tracking' },
  { icon: '🎯', label: 'Goal-Based Workouts' },
  { icon: '🤝', label: 'Live Gym Community' },
  { icon: '🕐', label: 'Open 6AM – 11PM Daily' },
  { icon: '💳', label: 'Flexible Membership Plans' },
  { icon: '⭐', label: '4.8/5 Member Rating' },
];

export default function Ticker() {
  // Rendered twice back-to-back so the CSS animation can loop seamlessly
  // (shifting exactly -50% always lines the second copy up with the first).
  const track = [...ITEMS, ...ITEMS];

  return (
    <div className="gl-ticker" role="marquee" aria-label="Gym highlights">
      <div className="gl-ticker-track">
        {track.map((item, i) => (
          <span className="gl-ticker-item" key={i}>
            <span className="gl-ticker-icon">{item.icon}</span>
            {item.label}
            <span className="gl-ticker-dot">•</span>
          </span>
        ))}
      </div>
    </div>
  );
}
