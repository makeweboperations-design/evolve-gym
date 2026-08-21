import { useState } from 'react';

// items: [{ text, done }] — controlled by parent via onChange.
export default function Checklist({ items, onChange }) {
  const [draft, setDraft] = useState('');

  function addItem() {
    if (!draft.trim()) return;
    onChange([...items, { text: draft.trim(), done: false }]);
    setDraft('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault(); // stop it from bubbling up and submitting the outer entry form
      addItem();
    }
  }

  function toggleItem(index) {
    onChange(items.map((it, i) => (i === index ? { ...it, done: !it.done } : it)));
  }

  function removeItem(index) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="checklist">
      {items.length > 0 && (
        <ul className="checklist-items">
          {items.map((item, i) => (
            <li key={i} className={item.done ? 'done' : ''}>
              <label>
                <input type="checkbox" checked={item.done} onChange={() => toggleItem(i)} />
                <span>{item.text}</span>
              </label>
              <button type="button" onClick={() => removeItem(i)} aria-label="Remove item">×</button>
            </li>
          ))}
        </ul>
      )}
      {/* Deliberately a <div>, not a <form> — this sits inside the Progress
          Tracker's outer entry form, and nested <form> elements are invalid
          HTML. That was the bug: the browser ignored this inner form's
          boundary entirely and let "Add" submit the OUTER form instead,
          which is why the page reloaded and nothing saved. */}
      <div className="checklist-add">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add an item…"
        />
        <button type="button" onClick={addItem} disabled={!draft.trim()}>Add</button>
      </div>
    </div>
  );
}
