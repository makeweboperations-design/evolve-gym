import { useEffect, useState } from 'react';
import api from '../../services/api';
import ChatPanel from './ChatPanel.jsx';
import { sortFaqsSmart } from './faqOrder.js';
import './chatbot.css';

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [faqs, setFaqs] = useState([]);
  const [messages, setMessages] = useState([
    { from: 'bot', text: "Hi! I'm Evo, the Evolve Gym assistant. Pick a question below, or type your own." },
  ]);
  const [input, setInput] = useState('');
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    if (open && faqs.length === 0) {
      api.get('/chatbot/faqs').then(({ data }) => setFaqs(data)).catch(() => {});
    }
  }, [open]);

  function askFaq(faq) {
    setMessages((m) => [...m, { from: 'user', text: faq.question }, { from: 'bot', text: faq.answer }]);
  }

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [...m, { from: 'user', text }]);
    setInput('');
    setAsking(true);
    try {
      const { data } = await api.post('/chatbot/ask', { message: text });
      if (data.matches.length > 0) {
        setMessages((m) => [...m, { from: 'bot', text: data.matches[0].answer }]);
      } else {
        setMessages((m) => [
          ...m,
          {
            from: 'bot',
            text: "I don't have an answer for that yet — please contact support for more information (phone, email, or the front desk) and we'll help you out.",
          },
        ]);
      }
    } catch (err) {
      setMessages((m) => [...m, { from: 'bot', text: 'Something went wrong — try again in a moment.' }]);
    } finally {
      setAsking(false);
    }
  }

  // Show every predefined question that hasn't been asked yet, in a smart,
  // realistic order — not just a handful picked at random.
  const askedQuestions = new Set(messages.filter((m) => m.from === 'user').map((m) => m.text));
  const suggestions = sortFaqsSmart(faqs.filter((f) => !askedQuestions.has(f.question)));

  return (
    <>
      <ChatPanel
        open={open}
        onClose={() => setOpen(false)}
        messages={messages}
        suggestions={suggestions}
        onAskSuggestion={askFaq}
        input={input}
        onInputChange={(e) => setInput(e.target.value)}
        onSend={handleSend}
        asking={asking}
      />
      <button className={`chat-launcher ${open ? 'open' : ''}`} onClick={() => setOpen((o) => !o)} aria-label="Open chat assistant">
        <span className="chat-launcher-icon">{open ? '×' : '🤖'}</span>
        {!open && <span className="chat-launcher-pulse" />}
      </button>
    </>
  );
}
