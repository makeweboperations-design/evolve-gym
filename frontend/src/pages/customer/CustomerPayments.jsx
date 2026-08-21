import { useEffect, useState } from 'react';
import api from '../../services/api';
import { loadRazorpayScript } from '../../utils/loadRazorpay';

export default function CustomerPayments() {
  const [plans, setPlans] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payingPlanId, setPayingPlanId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [plansRes, historyRes] = await Promise.all([
        api.get('/membership-plans'),
        api.get('/payments/me'),
      ]);
      setPlans(plansRes.data.filter((p) => p.is_active));
      setHistory(historyRes.data);
    } catch (err) {
      setError('Could not load payment information.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handlePay(plan) {
    setError('');
    setPayingPlanId(plan.id);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setError('Could not load the payment gateway. Check your connection and try again.');
        return;
      }

      const { data: order } = await api.post('/payments/create-order', { planId: plan.id });

      const razorpay = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: 'Evolve Gym',
        description: `${order.planName} membership`,
        theme: { color: '#FFE100' },
        handler: async (response) => {
          try {
            await api.post('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            await load();
          } catch (err) {
            setError('Payment succeeded but we could not confirm it — contact the front desk.');
          }
        },
        modal: {
          ondismiss: () => setPayingPlanId(null),
        },
      });

      razorpay.on('payment.failed', () => {
        setError('Payment failed or was cancelled.');
      });

      razorpay.open();
    } catch (err) {
      setError('Could not start the payment. Please try again.');
    } finally {
      setPayingPlanId(null);
    }
  }

  return (
    <>
      <div className="dash-header">
        <div>
          <h1>Membership & payments</h1>
          <p>Renew your membership or view your payment history.</p>
        </div>
      </div>

      {error && <p className="dash-error">{error}</p>}

      <div className="dash-panel">
        <div className="dash-panel-head">
          <h2>Choose a plan</h2>
        </div>
        {loading ? (
          <p className="dash-loading">Loading…</p>
        ) : plans.length === 0 ? (
          <p className="dash-empty">No plans available right now.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {plans.map((p) => (
              <div key={p.id} style={{ border: '1px solid #e4e2dc', borderRadius: 8, padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: '#6b7280', margin: '6px 0 14px' }}>{p.duration_days} days</div>
                <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 14 }}>
                  ₹{Number(p.price).toLocaleString('en-IN')}
                </div>
                <button
                  className="dash-btn dash-btn-primary"
                  disabled={payingPlanId === p.id}
                  onClick={() => handlePay(p)}
                  style={{ width: '100%' }}
                >
                  {payingPlanId === p.id ? 'Opening payment…' : 'Pay & renew'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dash-panel">
        <div className="dash-panel-head">
          <h2>Payment history</h2>
        </div>
        {loading ? (
          <p className="dash-loading">Loading…</p>
        ) : history.length === 0 ? (
          <p className="dash-empty">No payments yet.</p>
        ) : (
          <table className="dash-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Plan</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>{new Date(h.created_at).toLocaleDateString()}</td>
                  <td>{h.plan_name || '—'}</td>
                  <td>₹{Number(h.amount).toLocaleString('en-IN')}</td>
                  <td>
                    <span className={`dash-badge dash-badge-${h.status === 'success' ? 'active' : 'inactive'}`}>
                      {h.status}
                    </span>
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
