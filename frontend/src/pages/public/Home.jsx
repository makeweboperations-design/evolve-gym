import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../../components/landing/landing.css';
import PlateDivider from '../../components/landing/PlateDivider.jsx';
import { useScrollReveal } from '../../utils/useScrollReveal.js';
import { useMagneticGlow } from '../../utils/useMagneticGlow.js';
import { useTiltEffect } from '../../utils/useTiltEffect.js';
import { useClickBurst } from '../../utils/useClickBurst.js';
import { useParallaxScroll } from '../../utils/useParallaxScroll.js';
import ScrollProgressBar from '../../components/landing/ScrollProgressBar.jsx';
import HeroCursorTrail from '../../components/landing/HeroCursorTrail.jsx';
import StatCounter from '../../components/landing/StatCounter.jsx';
import BMICalculator from '../../components/bmi/BMICalculator.jsx';
import Ticker from '../../components/landing/Ticker.jsx';
import PublicChatWidget from '../../components/chatbot/PublicChatWidget.jsx';
import EvoBuddyIntro from '../../components/landing/EvoBuddyIntro.jsx';
import CommunityShowcase from '../../components/landing/CommunityShowcase.jsx';
import SplitText from '../../components/landing/SplitText.jsx';
import PixelateImage from '../../components/landing/PixelateImage.jsx';
import EvolveLogo from '../../components/brand/EvolveLogo.jsx';

function slugify(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// No photo files yet on any of these — every image prop is left empty on
// purpose. PixelateImage and the trainer cards both render a brand-styled
// placeholder automatically when `image`/`photoUrl` is ''. To bring real
// photos in later: drop the file into src/assets/<services|gallery|trainers>/,
// import it at the top of this file, and set the matching `image`/`photoUrl`
// field below — no other code changes needed, the pixelate-in effect will
// just start working on that card.
//
// Pull services/plans from the backend (/api/membership-plans) instead of
// hardcoding once that endpoint is wired up on the frontend.

const SERVICES = [
  {
    icon: '🏋️',
    title: 'Strength Floor',
    desc: 'Full free-weight rack setup, modern fitness equipment, competition platforms, and machine circuits for every muscle group.',
    image: '',
  },
  {
    icon: '🤝',
    title: 'Personal Training',
    desc: 'One-on-one coaching with certified trainers who build your plan around your actual goals.',
    image: '',
  },
  {
    icon: '🥗',
    title: 'Diet Coaching',
    desc: 'Personalized nutrition plans tracked alongside your training — assigned and adjusted by your trainer.',
    image: '',
  },
  {
    icon: '🔥',
    title: 'Cardio Zone',
    desc: 'HIIT, mobility, ABS, and conditioning sessions run through the week for members.',
    image: '',
  },
  {
    icon: '💬',
    title: 'Member Community',
    desc: 'A live feed to share progress, celebrate birthdays, and chat with everyone at your gym in real time.',
    image: '',
  },
  {
    icon: '📊',
    title: 'BMI & Body Tracking',
    desc: 'A free BMI calculator for anyone, with results saved automatically to your profile once you\'re a member.',
    image: '',
  },
  {
    icon: '🔐',
    title: 'Locker System & Changing Rooms',
    desc: 'Secure lockers and private changing rooms for separate male and female members, with convenient access throughout the gym.',
    image: '',
  },
  {
    icon: '🛜',
    title: 'Wi-Fi Access & CCTV Security',
    desc: 'Complimentary high-speed Wi-Fi throughout the gym, with CCTV monitoring for member safety.',
    image: '',
  },
];

const GALLERY_ITEMS = [
  { title: 'Free-weight floor', image: '', size: 'wide tall' },
  { title: 'Squat racks', image: '', size: '' },
  { title: 'Cardio bay', image: '', size: '' },
  { title: 'Machine circuit', image: '', size: 'tall' },
  { title: 'Group class studio', image: '', size: 'wide' },
];

const TRAINERS = [
  { name: 'Trainer 1', role: 'Head Coach', bio: 'Brings 15 years of experience in strength training and rehabilitation.', photoUrl: '' },
  { name: 'Trainer 2', role: 'Head Strength Coach', bio: '10 years coaching powerlifting and general strength — specializes in injury-safe programming.', photoUrl: '' },
  { name: 'Trainer 3', role: 'Group Fitness Lead', bio: 'Runs HIIT and conditioning classes built around measurable weekly progress.', photoUrl: '' },
  { name: 'Trainer 4', role: 'Nutrition & Diet Coach', bio: 'Certified sports nutritionist focused on sustainable, culturally realistic meal plans.', photoUrl: '' },
];

const PLANS = [
  { name: 'Monthly', price: '1,300', period: '/mo', features: ['Full gym access', 'Attendance tracking', 'Basic diet template'], featured: false },
  { name: 'Quarterly', price: '3,600', period: '/3 mo', features: ['Full gym access', '1 trainer check-in/month', 'Custom diet plan', 'Priority booking'], featured: true },
  { name: 'Annual', price: '15,000', period: '/yr', features: ['Full gym access', 'Weekly trainer check-ins', 'Custom diet plan', '2 free PT sessions/month'], featured: false },
];

export default function Home() {
  const [navScrolled, setNavScrolled] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  useScrollReveal();
  useMagneticGlow('.gl-btn-primary');
  useTiltEffect('.gl-trainer-card', 5);
  useTiltEffect('.gl-price-card', 4);
  useClickBurst('.gl-btn-primary');
  useParallaxScroll('.gl-hero-parallax', 0.18);
  useMagneticGlow('.gl-service-card, .gl-trainer-card, .gl-price-card');

  useEffect(() => {
    function onScroll() {
      setNavScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="gym-landing">
      <ScrollProgressBar />

      <nav className={`gl-nav${navScrolled ? ' gl-nav-scrolled' : ''}`}>
        <Link to="/" className="gl-logo"><EvolveLogo variant="compact" /></Link>
        <ul className="gl-nav-links">
          <li><a href="#services">Services</a></li>
          <li><a href="#gallery">Gallery</a></li>
          <li><a href="#trainers">Trainers</a></li>
          <li><a href="#community-showcase">Community</a></li>
          <li><a href="#bmi-calculator">BMI Calculator</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
        <div className="gl-nav-cta">
          <Link to="/login" className="gl-btn gl-btn-ghost">Log in</Link>
          <Link to="/register" className="gl-btn gl-btn-primary">Join now</Link>
        </div>
      </nav>

      <section className="gl-hero">
        <div className="gl-hero-parallax">
          <div className="gl-hero-orb gl-hero-orb-2" aria-hidden="true" />
          <div className="gl-hero-orb gl-hero-orb-3" aria-hidden="true" />
        </div>
        <HeroCursorTrail />
        <p className="gl-hero-eyebrow">Real training. Real strength. Real results.</p>
        <h1>
          <span style={{ display: 'block' }}>Transform.</span>
          <span style={{ display: 'block' }}>Empower. <em className="gl-hero-shimmer">Evolve.</em></span>
        </h1>
        <p className="gl-hero-sub">
          Evolve Gym combines expert guidance, modern equipment, and relentless motivation
          to help you become your strongest self — with certified trainers, personalized diet
          plans, and a membership system that keeps you on track. No spreadsheets, no guesswork.
        </p>
        <div className="gl-hero-actions">
          <Link to="/register" className="gl-btn gl-btn-primary gl-btn-pulse">Start your membership</Link>
          <a href="#contact" className="gl-btn gl-btn-ghost">Visit the gym</a>
        </div>

        <div className="gl-stats">
          <div className="gl-stat">
            <span className="gl-stat-num"><StatCounter value={100} suffix="+" /></span>
            <span className="gl-stat-label">Active members</span>
          </div>
          <div className="gl-stat">
            <span className="gl-stat-num"><StatCounter value={4} /></span>
            <span className="gl-stat-label">Certified trainers</span>
          </div>
          <div className="gl-stat">
            <span className="gl-stat-num">6AM–11PM</span>
            <span className="gl-stat-label">Open daily</span>
          </div>
          <div className="gl-stat">
            <span className="gl-stat-num">4.8/5</span>
            <span className="gl-stat-label">Member rating</span>
          </div>
        </div>
      </section>

      <Ticker />

      <PlateDivider />

      <section className="gl-section" id="services">
        <div className="gl-section-head reveal">
          <div>
            <p className="gl-section-eyebrow">What's included</p>
            <SplitText as="h2" text="Services" />
          </div>
          <p className="gl-section-note">
            Every membership includes full floor access — these are the programs
            built on top of it.
          </p>
        </div>
        <div className="gl-services-grid">
          {SERVICES.map((s, i) => (
            <div
              className="gl-service-card reveal"
              style={{ transitionDelay: `${i * 70}ms` }}
              key={s.title}
              id={`service-${slugify(s.title)}`}
            >
              <PixelateImage className="gl-service-image" src={s.image} alt={s.title} />
              <span className="gl-service-icon">{s.icon}</span>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <EvoBuddyIntro onTryClick={() => setChatOpen(true)} />

      <section className="gl-section" id="gallery">
        <div className="gl-section-head reveal">
          <div>
            <p className="gl-section-eyebrow">Inside the gym</p>
            <h2>The floor</h2>
          </div>
          <p className="gl-section-note">
            Photos and walkthrough videos of the equipment and facility —
            swap these placeholders for real shots once available.
          </p>
        </div>
        <div className="gl-gallery-grid">
          {GALLERY_ITEMS.map((g, i) => (
            <div
              key={g.title}
              className={`gl-gallery-item ${g.size} reveal`}
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <PixelateImage className="gl-gallery-image" src={g.image} alt={g.title} />
              <span className="gl-gallery-label">{g.title}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="gl-section" id="trainers">
        <div className="gl-section-head reveal">
          <div>
            <p className="gl-section-eyebrow">Who you'll train with</p>
            <SplitText as="h2" text="Trainers" />
          </div>
        </div>
        <div className="gl-trainers-grid">
          {TRAINERS.map((t, i) => (
            <div
              className="gl-trainer-card reveal"
              style={{ transitionDelay: `${i * 90}ms` }}
              key={t.name}
              id={`trainer-${slugify(t.name)}`}
            >
              {t.photoUrl ? (
                <img
                  className="gl-trainer-photo"
                  src={t.photoUrl}
                  alt={t.name}
                  style={t.photoPosition ? { objectPosition: t.photoPosition } : undefined}
                />
              ) : (
                <div className="gl-trainer-photo" />
              )}
              <div className="gl-trainer-info">
                <h3>{t.name}</h3>
                <p className="gl-trainer-role">{t.role}</p>
                <p>{t.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <PlateDivider />

      <CommunityShowcase />

      <section className="gl-section" id="pricing">
        <div className="gl-section-head reveal">
          <div>
            <p className="gl-section-eyebrow">Membership plans</p>
            <SplitText as="h2" text="Pricing" />
          </div>
          <p className="gl-section-note">
            Prices in ₹. Freeze or cancel anytime from your account once you're a member.
          </p>
        </div>
        <div className="gl-pricing-grid">
          {PLANS.map((p, i) => (
            <div className={`gl-price-card reveal${p.featured ? ' featured' : ''}`} style={{ transitionDelay: `${i * 90}ms` }} key={p.name}>
              {p.featured && <span className="gl-price-tag">Most popular</span>}
              <h3>{p.name}</h3>
              <div className="gl-price-amount">
                ₹{p.price}<span>{p.period}</span>
              </div>
              <ul className="gl-price-features">
                {p.features.map((f) => <li key={f}>{f}</li>)}
              </ul>
              <Link to="/register" className="gl-btn gl-btn-primary">Choose {p.name}</Link>
            </div>
          ))}
        </div>
      </section>

      <BMICalculator />

      <section className="gl-section" id="contact">
        <div className="gl-section-head reveal">
          <div>
            <p className="gl-section-eyebrow">Find us</p>
            <h2>Location & contact</h2>
          </div>
        </div>
        <div className="gl-contact-grid reveal">
          <iframe
            className="gl-map-embed"
            title="Evolve Gym locations"
            src="https://www.google.com/maps?q=Chiriamore,+Baranagar,+Kolkata,+West+Bengal&output=embed"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
          <dl className="gl-contact-details">
            <div className="gl-contact-row">
              <dt>Locations</dt>
              <dd>Chiriamore &bull; Baranagar &bull; Belgharia &bull; Ariadaha &bull; Dakshineswar</dd>
            </div>
            <div className="gl-contact-row">
              <dt>Phone</dt>
              <dd>82401 22675 &bull; 79809 70816 &bull; 83359 50652</dd>
            </div>
            <div className="gl-contact-row">
              <dt>Email</dt>
              <dd>hello@evolvegym.example</dd>
            </div>
            <div className="gl-contact-row">
              <dt>Hours</dt>
              <dd>Mon–Sat, 6:00 AM – 10:30 PM & Sun, 6:00 AM – 12:00 PM</dd>
            </div>
            <div className="gl-social-row">
              <a href="#">Instagram</a>
              <a href="#">Facebook</a>
              <a href="#">WhatsApp</a>
            </div>
          </dl>
        </div>
      </section>

      <footer className="gl-footer">
        <span>© {new Date().getFullYear()} Evolve Gym. All rights reserved.</span>
        <span>Train. Transform. Evolve.</span>
      </footer>

      <PublicChatWidget open={chatOpen} onOpenChange={setChatOpen} />
    </div>
  );
}
