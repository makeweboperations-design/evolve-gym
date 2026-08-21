import { useState } from 'react';
import api from '../../services/api';
import './bmi.css';

export default function BMICalculator() {
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isLoggedIn = Boolean(localStorage.getItem('accessToken'));

  async function handleCalculate(e) {
    e.preventDefault();
    setError('');

    const h = Number(heightCm);
    const w = Number(weightKg);
    if (!h || !w) {
      setError('Enter both height and weight to calculate.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/bmi/calculate', { heightCm: h, weightKg: w });
      setResult(data);
    } catch (err) {
      setError('Something went wrong — please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bmi-calc" id="bmi-calculator">
      <div className="bmi-calc-inner">
        <p className="bmi-eyebrow">Free tool</p>
        <h2>Check your BMI</h2>
        <p className="bmi-sub">
          Open to everyone — visitors and members. {isLoggedIn ? "Since you're logged in, your result is saved to your profile." : 'Log in to save your results and track them over time.'}
        </p>

        <form className="bmi-form" onSubmit={handleCalculate}>
          <div className="bmi-field">
            <label htmlFor="bmi-height">Height (cm)</label>
            <input
              id="bmi-height"
              type="number"
              min="50"
              max="300"
              placeholder="e.g. 170"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              required
            />
          </div>

          <div className="bmi-field">
            <label htmlFor="bmi-weight">Weight (kg)</label>
            <input
              id="bmi-weight"
              type="number"
              min="10"
              max="400"
              placeholder="e.g. 65"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="bmi-submit" disabled={loading}>
            {loading ? 'Calculating…' : 'Calculate BMI'}
          </button>
        </form>

        {error && <p className="bmi-error" role="alert">{error}</p>}

        {result && (
          <div className="bmi-result">
            <span className="bmi-result-value">{result.bmi}</span>
            <span className="bmi-result-category">{result.category}</span>
            {result.saved && <span className="bmi-result-saved">Saved to your profile ✓</span>}
          </div>
        )}
      </div>
    </section>
  );
}
