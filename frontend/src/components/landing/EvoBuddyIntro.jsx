import './evo-buddy-intro.css';
import { useParallax } from '../../utils/useParallax.js';

export default function EvoBuddyIntro({ onTryClick }) {
  const parallaxRef = useParallax(0.12);

  return (
    <section className="evo-buddy-intro">
      <p className="evo-buddy-eyebrow">/ Introducing</p>
      <h2 className="evo-buddy-title">Evo</h2>
      <p className="evo-buddy-sub">Your AI gym assistant, here to help you navigate Evolve Gym anytime you need.</p>

      <div className="evo-buddy-howto">
        <div className="evo-buddy-howto-step">
          <span className="evo-buddy-howto-num">1</span>
          <p>Tap the <strong>chat bubble</strong> in the bottom-right corner of any page.</p>
        </div>
        <div className="evo-buddy-howto-step">
          <span className="evo-buddy-howto-num">2</span>
          <p>Ask anything — hours, plans, trainers, personal training, or pick a suggested question.</p>
        </div>
        <div className="evo-buddy-howto-step">
          <span className="evo-buddy-howto-num">3</span>
          <p>Get an instant answer, day or night — no waiting for the front desk to pick up.</p>
        </div>
      </div>

      <div className="evo-buddy-stage">
        <div className="evo-buddy-bubble left">
          <div className="evo-buddy-bubble-head">
            <span className="evo-buddy-avatar user">S</span>
            <strong>Sonia</strong>
          </div>
          <p>Hey Evo, what are your gym's operating hours?</p>
        </div>

        <div className="evo-buddy-mascot-parallax" ref={parallaxRef}>
          <div className="evo-buddy-mascot">
            <span className="evo-buddy-mascot-emoji">🤖</span>
          </div>
        </div>

        <div className="evo-buddy-bubble right">
          <div className="evo-buddy-bubble-head">
            <span className="evo-buddy-avatar bot">FF</span>
            <strong>Evo</strong>
          </div>
          <p>We're open 5AM–11PM daily! Want me to show you our membership plans too?</p>
        </div>

        <div className="evo-buddy-bubble left low">
          <div className="evo-buddy-bubble-head">
            <span className="evo-buddy-avatar user">A</span>
            <strong>Ankush</strong>
          </div>
          <p>Do you offer personal training?</p>
        </div>

        <div className="evo-buddy-bubble right low">
          <div className="evo-buddy-bubble-head">
            <span className="evo-buddy-avatar bot">FF</span>
            <strong>Evo</strong>
          </div>
          <p>Yes! One-on-one sessions with certified trainers, built around your goals.</p>
        </div>

        <span className="evo-buddy-floating-chat one">💬</span>
        <span className="evo-buddy-floating-chat two">💬</span>
      </div>

      <button type="button" className="evo-buddy-cta" onClick={onTryClick}>
        Try Evo — click here to start chatting
      </button>
    </section>
  );
}
