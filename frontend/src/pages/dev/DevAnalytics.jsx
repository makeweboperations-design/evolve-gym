import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import './dev-analytics.css';

const COLORS = ['#E60000', '#8a8f94', '#4a7c1f', '#d9ff6b', '#6b6b6b', '#a3d977'];

export default function DevAnalytics() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { data: res } = await api.get(`/analytics/summary?days=${days}`);
      setData(res);
    } catch (err) {
      setError('Could not load analytics — make sure you are logged in as admin.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  return (
    <div className="dev-analytics-page">
      <div className="dev-analytics-header">
        <div>
          <h1>Site Analytics</h1>
          <p>Internal traffic dashboard — not linked anywhere in the app. Google Analytics (GA4) has the full picture; this is a quick in-app glance.</p>
        </div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {error && <p className="dev-analytics-error">{error}</p>}

      {loading ? (
        <LoadingSpinner label="Loading analytics…" />
      ) : data && (
        <>
          <div className="dev-analytics-stats">
            <div className="dev-analytics-stat">
              <span className="value">{data.totals.total_views}</span>
              <span className="label">Total pageviews</span>
            </div>
            <div className="dev-analytics-stat">
              <span className="value">{data.totals.unique_sessions}</span>
              <span className="label">Unique visitors</span>
            </div>
          </div>

          <div className="dev-analytics-chart-card">
            <h2>Traffic over time</h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.daily.map((d) => ({ ...d, day: d.day.slice(5, 10) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="day" stroke="#8a8f94" fontSize={12} />
                <YAxis stroke="#8a8f94" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#171717', border: '1px solid #333', borderRadius: 8 }} />
                <Line type="monotone" dataKey="views" stroke="#E60000" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="dev-analytics-chart-row">
            <div className="dev-analytics-chart-card">
              <h2>Top pages</h2>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={data.topPages} dataKey="views" nameKey="path" outerRadius={90} label={({ path }) => path}>
                    {data.topPages.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#171717', border: '1px solid #333', borderRadius: 8 }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="dev-analytics-chart-card">
              <h2>Top referrers</h2>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={data.topReferrers} dataKey="views" nameKey="referrer" outerRadius={90} label={({ referrer }) => referrer}>
                    {data.topReferrers.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#171717', border: '1px solid #333', borderRadius: 8 }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
