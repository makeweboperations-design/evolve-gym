import { useEffect, useRef } from 'react';

export default function ChatPanel({
  open, onClose, messages, suggestions, onAskSuggestion,
  input, onInputChange, onSend, asking,
}) {
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, asking]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="chat-panel">
      <div className="chat-panel-head">
        <div className="chat-panel-avatar">🤖</div>
        <div className="chat-panel-title">
          <h3>Evo</h3>
          <span className="chat-panel-status"><span className="chat-status-dot" /> Online now</span>
        </div>
        <button className="chat-panel-close" onClick={onClose} aria-label="Close chat">×</button>
      </div>

      <div className="chat-messages" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`chat-row ${m.from}`}>
            {m.from === 'bot' && <span className="chat-avatar bot">🤖</span>}
            <div className={`chat-bubble ${m.from}`}>{m.text}</div>
          </div>
        ))}

        {asking && (
          <div className="chat-row bot">
            <span className="chat-avatar bot">🤖</span>
            <div className="chat-bubble bot chat-typing">
              <span /><span /><span />
            </div>
          </div>
        )}

        {suggestions.length > 0 && !asking && (
          <div className="chat-quick-questions">
            {suggestions.map((f) => (
              <button key={f.id} className="chat-quick-btn" onClick={() => onAskSuggestion(f)}>
                {f.question}
              </button>
            ))}
          </div>
        )}
      </div>

      <form className="chat-input-row" onSubmit={onSend}>
        <input
          ref={inputRef}
          value={input}
          onChange={onInputChange}
          placeholder="Type a question…"
          disabled={asking}
        />
        <button type="submit" disabled={asking || !input.trim()} aria-label="Send message">➤</button>
      </form>
    </div>
  );
}
