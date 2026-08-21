// Orders FAQs the way a real visitor's questions tend to unfold: general
// orientation first, then "should I join," then what's actually included,
// then the practical booking/payment mechanics, and finally the
// day-to-day "how do I track this" and "who do I ask" questions once
// they're already a member. This keeps the chat's suggestion list reading
// like a natural conversation instead of a random/alphabetical dump.
//
// Matched by a short substring against the FAQ's question text (case-
// insensitive) — anything from the default seed set will match one of
// these; any gym-specific FAQ an admin adds later that doesn't match
// simply falls in after the recognized ones, in the order it came back
// from the API (stable, doesn't jump around between chat sessions).
const QUESTION_FLOW_HINTS = [
  'operating hours',
  'bring on my first visit',
  'trial or single-day pass',
  'sign up for a membership',
  'freeze or pause',
  'cancel my membership',
  'other gym locations',
  'personal training package',
  'diet or nutrition',
  'group classes',
  'trainers are on duty',
  'book a class or a trainer',
  'payment methods',
  'joining fee',
  'track my progress',
  'contact customer support',
];

export function sortFaqsSmart(faqs) {
  return [...faqs]
    .map((faq, originalIndex) => {
      const q = faq.question.toLowerCase();
      const hintIndex = QUESTION_FLOW_HINTS.findIndex((hint) => q.includes(hint));
      // Unmatched (gym-specific/custom) FAQs sort after every recognized
      // one, in their original order — never interleaved unpredictably.
      const rank = hintIndex === -1 ? QUESTION_FLOW_HINTS.length + originalIndex : hintIndex;
      return { faq, rank };
    })
    .sort((a, b) => a.rank - b.rank)
    .map((entry) => entry.faq);
}
