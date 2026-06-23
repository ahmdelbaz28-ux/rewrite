import { useState, useEffect } from 'react';
import { useApi } from '../api/client.js';

export default function Licenses() {
  const api = useApi();
  const [licenses, setLicenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({ tier: '', status: '', limit: 50, offset: 0 });
  const [showCreate, setShowCreate] = useState(false);
  const [newLicense, setNewLicense] = useState({ tier: 'pro', email: '', max_devices: 3, expires_in_days: 30 });
  const [createdLicense, setCreatedLicense] = useState(null);

  async function loadLicenses() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.tier) params.set('tier', filter.tier);
      if (filter.status) params.set('status', filter.status);
      params.set('limit', filter.limit);
      params.set('offset', filter.offset);
      const data = await api.get(`/admin/licenses?${params}`);
      setLicenses(data.licenses);
      setTotal(data.total);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadLicenses(); }, [filter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const data = await api.post('/admin/licenses', newLicense);
      setCreatedLicense(data);
      setShowCreate(false);
      loadLicenses();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRevoke = async (token) => {
    if (!confirm('Revoke this license? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/licenses/${token}`);
      loadLicenses();
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (ts) => ts ? new Date(ts).toLocaleDateString() : '—';
  const formatStatus = (l) => {
    if (l.revoked) return <span className="badge badge-revoked">Revoked</span>;
    if (l.expires_at && Date.now() > l.expires_at) return <span className="badge badge-expired">Expired</span>;
    return <span className="badge badge-active">Active</span>;
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Licenses</h1>
        <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? '× Cancel' : '+ Create License'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {createdLicense && (
        <div className="success-message">
          <strong>License created!</strong><br />
          Token: <code>{createdLicense.token}</code><br />
          Tier: {createdLicense.tier} | Expires: {formatDate(createdLicense.expires_at)}
        </div>
      )}

      {showCreate && (
        <form className="card" onSubmit={handleCreate} style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Create New License</h3>
          <div className="grid grid-4">
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Tier</label>
              <select className="input" value={newLicense.tier} onChange={(e) => setNewLicense({ ...newLicense, tier: e.target.value })}>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="team">Team</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Email (optional)</label>
              <input className="input" type="email" value={newLicense.email} onChange={(e) => setNewLicense({ ...newLicense, email: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Max Devices</label>
              <input className="input" type="number" min="1" value={newLicense.max_devices} onChange={(e) => setNewLicense({ ...newLicense, max_devices: parseInt(e.target.value) })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Expires in (days)</label>
              <input className="input" type="number" min="1" value={newLicense.expires_in_days} onChange={(e) => setNewLicense({ ...newLicense, expires_in_days: parseInt(e.target.value) })} />
            </div>
          </div>
          <button type="submit" className="btn-primary" style={{ marginTop: 16 }}>Create License</button>
        </form>
      )}

      <div className="card">
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <select className="input" style={{ width: 'auto' }} value={filter.tier} onChange={(e) => setFilter({ ...filter, tier: e.target.value })}>
            <option value="">All Tiers</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="team">Team</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <select className="input" style={{ width: 'auto' }} value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="revoked">Revoked</option>
          </select>
          <button className="btn-secondary" onClick={loadLicenses}>↻ Refresh</button>
        </div>

        {loading ? (
          <div className="spinner" />
        ) : licenses.length === 0 ? (
          <p style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No licenses found</p>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Tier</th>
                  <th>Email</th>
                  <th>Devices</th>
                  <th>Expires</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {licenses.map(l => (
                  <tr key={l.id}>
                    <td><code style={{ fontSize: 11 }}>{l.token.slice(0, 20)}...</code></td>
                    <td><span className={`badge badge-${l.tier}`}>{l.tier}</span></td>
                    <td>{l.email || '—'}</td>
                    <td>{l.max_devices}</td>
                    <td>{formatDate(l.expires_at)}</td>
                    <td>{formatDate(l.created_at)}</td>
                    <td>{formatStatus(l)}</td>
                    <td>
                      {!l.revoked && (
                        <button className="btn-ghost" style={{ color: '#dc2626' }} onClick={() => handleRevoke(l.token)}>
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 16, fontSize: 13, color: '#64748b' }}>
              Showing {licenses.length} of {total} licenses
              {filter.offset > 0 && (
                <button className="btn-ghost" style={{ marginLeft: 12 }} onClick={() => setFilter({ ...filter, offset: Math.max(0, filter.offset - filter.limit) })}>
                  ← Previous
                </button>
              )}
              {filter.offset + filter.limit < total && (
                <button className="btn-ghost" style={{ marginLeft: 4 }} onClick={() => setFilter({ ...filter, offset: filter.offset + filter.limit })}>
                  Next →
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
