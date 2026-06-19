import { useState, useEffect } from 'react';
import { useApi } from '../api/client.js';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Telemetry() {
  const api = useApi();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [since, setSince] = useState(7 * 24 * 60 * 60 * 1000); // 7 days

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        // Note: telemetry stats endpoint requires API key, not admin JWT
        // For demo we use admin dashboard data
        const data = await api.get('/admin/dashboard');
        if (mounted) {
          setStats(data);
          setError('');
        }
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [since]);

  if (loading) return <div className="spinner" />;
  if (error) return <div className="error-message">{error}</div>;
  if (!stats) return null;

  const eventData = (stats.events.top_events || []).map(e => ({
    name: e.event.replace(/_/g, ' '),
    count: e.count
  }));

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Telemetry</h1>
        <select className="input" style={{ width: 'auto' }} value={since} onChange={(e) => setSince(parseInt(e.target.value))}>
          <option value={24 * 60 * 60 * 1000}>Last 24 hours</option>
          <option value={7 * 24 * 60 * 60 * 1000}>Last 7 days</option>
          <option value={30 * 24 * 60 * 60 * 1000}>Last 30 days</option>
        </select>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <div className="card stat-card">
          <div className="stat-value">{stats.events.total.toLocaleString()}</div>
          <div className="stat-label">Total Events</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{stats.events.last_24h.toLocaleString()}</div>
          <div className="stat-label">Events (24h)</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{stats.devices.active_7d}</div>
          <div className="stat-label">Active Devices (7d)</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16, fontSize: 16 }}>Top Events</h3>
        {eventData.length === 0 ? (
          <p style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>No events yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={eventData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={140} />
              <Tooltip />
              <Bar dataKey="count" fill="#7c3aed" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 16, fontSize: 16 }}>Event Breakdown</h3>
        <table>
          <thead>
            <tr>
              <th>Event Name</th>
              <th>Count</th>
              <th>% of Total</th>
            </tr>
          </thead>
          <tbody>
            {eventData.map(e => (
              <tr key={e.name}>
                <td><code>{e.name}</code></td>
                <td>{e.count.toLocaleString()}</td>
                <td>{((e.count / stats.events.total) * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
