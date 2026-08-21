import SplitText from './SplitText.jsx';
import PixelateImage from './PixelateImage.jsx';
import { useParallax } from '../../utils/useParallax.js';
import './community-showcase.css';

// No photos yet — see the note at the top of pages/public/Home.jsx for how
// to wire real ones in later under src/assets/community-showcase/.
const MOMENTS = [
  { image: '', title: 'Birthday Celebrations', desc: 'Every member gets a shout-out and a cake-cutting moment on their special day.' },
  { image: '', title: 'Festivals & Pujas', desc: 'From Saraswati Puja to Diwali, we celebrate every festival together as one gym family.' },
  { image: '', title: 'Team Bonding', desc: 'Group challenges, weekend meetups, and friendly competitions that build real friendships.' },
  { image: '', title: 'Member Milestones', desc: 'We celebrate every PR, every weight goal hit, and every transformation story.' },
];

export default function CommunityShowcase() {
  const parallaxRef = useParallax(0.08);

  return (
    <section className="community-showcase" id="community-showcase">
      <div className="cs-parallax-glow" ref={parallaxRef} />
      <p className="cs-eyebrow">/ Our Community</p>
      <SplitText as="h2" text="More Than Just A Gym" className="cs-title" />
      <p className="cs-sub">
        Evolve Gym is built around its people. We don't just train together — we celebrate
        birthdays, festivals, and every milestone as one community.
      </p>

      <div className="cs-grid">
        {MOMENTS.map((m, i) => (
          <div className="cs-card reveal" style={{ transitionDelay: `${i * 80}ms` }} key={m.title}>
            <PixelateImage src={m.image} alt={m.title} className="cs-card-image" />
            <div className="cs-card-body">
              <h3>{m.title}</h3>
              <p>{m.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
