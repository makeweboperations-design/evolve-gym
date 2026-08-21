-- Seed: chatbot FAQs
-- Inserts a standard set of 15 FAQs for the gym named 'Evolve Gym' only.
-- If your gym's name differs, update the WHERE clause below to match.
-- Safe to re-run: it skips a question that already exists for that gym.
-- Anything beyond this starter set can be added manually from the admin tab.

DO $$
DECLARE
  g RECORD;
  faqs TEXT[][] := ARRAY[
    ARRAY['What are your gym''s operating hours?',
          'Most of our gyms are open from 5:00 AM to 11:00 PM, Monday through Sunday. Exact timings can vary slightly by location, so please check your home gym''s profile in the app or ask the front desk.',
          'general'],
    ARRAY['How do I sign up for a membership?',
          'You can sign up directly through this website or the mobile app. Pick a plan, fill in your details, and complete payment online — your membership activates immediately after checkout.',
          'membership'],
    ARRAY['Can I freeze or pause my membership?',
          'Yes. Members can request a freeze for medical reasons, travel, or other valid reasons from their dashboard under "Manage Membership." Freezes typically extend your membership end date by the paused duration.',
          'membership'],
    ARRAY['How do I cancel my membership?',
          'You can request cancellation from your account dashboard under "Manage Membership," or contact the front desk. Cancellation terms (notice period, refund eligibility) depend on the plan you purchased.',
          'membership'],
    ARRAY['Do you offer a trial or single-day pass?',
          'Yes, we offer a one-day trial pass so you can experience the gym, equipment, and a class before committing to a full membership. Book it from the homepage or ask at the front desk.',
          'membership'],
    ARRAY['What is included in a Personal Training package?',
          'Personal Training includes one-on-one sessions with a certified trainer, a custom workout plan built around your goals, form correction, and ongoing progress check-ins.',
          'services'],
    ARRAY['Do you provide diet or nutrition plans?',
          'Yes, our trainers offer personalized diet coaching alongside your training plan. Your nutrition plan is tracked and adjusted over time based on your progress and goals.',
          'services'],
    ARRAY['What group classes do you offer?',
          'We run HIIT, strength conditioning, mobility, and other group classes throughout the week. Class schedules are available in the app under "Classes" and can be booked in advance.',
          'services'],
    ARRAY['How many trainers are on duty each day?',
          'Trainer availability varies by shift and location. Check the Trainers section of the app or website for who''s currently on staff, or ask the front desk which trainers are on the floor at your preferred time.',
          'services'],
    ARRAY['Can I access other gym locations with my membership?',
          'It depends on your plan. A standard membership gives you access to your home gym only. If you''d like access across multiple locations, ask about upgrading to a multi-gym plan.',
          'membership'],
    ARRAY['How do I book a class or a trainer session?',
          'Open the app, go to "Book a Class" or "Book a Trainer," pick your preferred time slot, and confirm. You''ll get a reminder notification before your session.',
          'booking'],
    ARRAY['What payment methods do you accept?',
          'We accept credit/debit cards, UPI, and net banking through our secure online payment gateway. Recurring plans are billed automatically each cycle unless cancelled beforehand.',
          'billing'],
    ARRAY['Is there a joining fee in addition to the membership price?',
          'Some plans include a one-time joining or registration fee, which is clearly shown at checkout before you confirm payment — there are no hidden charges.',
          'billing'],
    ARRAY['What should I bring on my first visit?',
          'Bring a valid ID, comfortable workout clothes, a water bottle, and a towel. If you booked a trial, arrive 10–15 minutes early so the front desk can complete your check-in.',
          'general'],
    ARRAY['How can I track my progress?',
          'Your dashboard in the app shows your attendance, workout history, and any body composition or progress data logged by your trainer, so you can track improvement over time.',
          'general'],
    ARRAY['How do I contact customer support?',
          'You can chat with us right here using this assistant, message us through the app''s support option, or speak to the front desk staff at your gym directly.',
          'general']
  ];
  q TEXT;
  a TEXT;
  c TEXT;
  i INT;
BEGIN
  FOR g IN SELECT id FROM gyms WHERE name = 'Evolve Gym' LOOP
    FOR i IN 1..array_length(faqs, 1) LOOP
      q := faqs[i][1];
      a := faqs[i][2];
      c := faqs[i][3];

      IF NOT EXISTS (
        SELECT 1 FROM chatbot_faqs WHERE gym_id = g.id AND question = q
      ) THEN
        INSERT INTO chatbot_faqs (gym_id, question, answer, category)
        VALUES (g.id, q, a, c);
      END IF;
    END LOOP;
  END LOOP;
END $$;
