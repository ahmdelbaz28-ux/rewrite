import { useState, useEffect } from 'react';
import { useApi } from '../api/client.js';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Dashboard() {
  const api = useApi();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const d = await api.get('/admin/dashboard');
        if (mounted) {
          setData(d);
          setError('');
        }
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="spinner" />;
  if (error) return <div className="error-message">{error}</div>;
  if (!data) return null;

  const tierData = (data.licenses.by_tier || []).map(t => ({ name: t.tier, value: t.count }));
  const eventData = (data.events.top_events || []).map(e => ({ name: e.event, count: e.count }));

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <button className="btn-secondary" onClick={() => window.location.reload()}>↻ Refresh</button>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <div className="card stat-card">
          <div className="stat-value">{data.licenses.total}</div>
          <div className="stat-label">Total Licenses</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{data.licenses.active}</div>
          <div className="stat-label">Active Licenses</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{data.devices.active_7d}</div>
          <div className="stat-label">Active Devices (7d)</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{data.events.last_24h}</div>
          <div className="stat-label">Events (24h)</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: 16 }}>Licenses by Tier</h3>
          {tierData.length === 0 ? (
            <p style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={tierData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {tierData.map((entry, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: 16 }}>Top Events (7d)</h3>
          {eventData.length === 0 ? (
            <p style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>No events yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={eventData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 16, fontSize: 16 }}>System Overview</h3>
        <div className="grid grid-3">
          <div>
            <div className="stat-label">Total Devices</div>
            <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>{data.devices.total}</div>
          </div>
          <div>
            <div className="stat-label">Total Events</div>
            <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>{data.events.total}</div>
          </div>
          <div>
            <div className="stat-label">Active 7d Devices</div>
            <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>{data.devices.active_7d}</div>
          </div>
        </div>
      </div>
    </>
  );
}
