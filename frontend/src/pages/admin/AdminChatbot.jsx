import { useEffect, useState } from 'react';
import api from '../../services/api';

const EMPTY_FORM = { question: '', answer: '', category: '' };

export default function AdminChatbot() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/chatbot/faqs');
      setFaqs(data);
    } catch (err) {
      setError('Could not load FAQs.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    if (!form.question || !form.answer) {
      setError('Question and answer are both required.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/chatbot/faqs', {
        question: form.question,
        answer: form.answer,
        category: form.category || undefined,
      });
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setError('Could not save the FAQ.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(faq) {
    if (!window.confirm('Delete this FAQ?')) return;
    try {
      await api.delete(`/chatbot/faqs/${faq.id}`);
      await load();
    } catch (err) {
      setError('Could not delete the FAQ.');
    }
  }

  return (
    <>
      <div className="dash-header">
        <div>
          <h1>Chatbot FAQs</h1>
          <p>These are the questions and answers the member-facing chatbot can respond with.</p>
        </div>
      </div>

      {error && <p className="dash-error">{error}</p>}

      <div className="dash-panel">
        <div className="dash-panel-head">
          <h2>Add a question</h2>
        </div>
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: '#4b5563' }}>
            Question
            <input
              value={form.question}
              onChange={update('question')}
              placeholder="What are your gym hours?"
              style={{ padding: '10px 12px', borderRadius: 4, border: '1px solid #d8d5cd', fontSize: 14 }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: '#4b5563' }}>
            Answer
            <textarea
              value={form.answer}
              onChange={update('answer')}
              rows={3}
              placeholder="We're open 6 AM to 11 PM every day."
              style={{ padding: '10px 12px', borderRadius: 4, border: '1px solid #d8d5cd', fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: '#4b5563' }}>
            Category (optional)
            <input
              value={form.category}
              onChange={update('category')}
              placeholder="Hours, Billing, Membership…"
              style={{ padding: '10px 12px', borderRadius: 4, border: '1px solid #d8d5cd', fontSize: 14 }}
            />
          </label>
          <button type="submit" className="dash-btn dash-btn-primary" disabled={submitting} style={{ alignSelf: 'flex-start' }}>
            {submitting ? 'Adding…' : 'Add FAQ'}
          </button>
        </form>
      </div>

      <div className="dash-panel">
        <div className="dash-panel-head">
          <h2>All FAQs ({faqs.length})</h2>
        </div>
        {loading ? (
          <p className="dash-loading">Loading…</p>
        ) : faqs.length === 0 ? (
          <p className="dash-empty">No FAQs yet — the chatbot has nothing to answer with. Add some above.</p>
        ) : (
          <table className="dash-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Answer</th>
                <th>Category</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {faqs.map((f) => (
                <tr key={f.id}>
                  <td style={{ maxWidth: 220 }}>{f.question}</td>
                  <td style={{ maxWidth: 320, color: '#4b5563' }}>{f.answer}</td>
                  <td>{f.category || '—'}</td>
                  <td>
                    <button className="dash-btn dash-btn-danger" onClick={() => handleDelete(f)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
