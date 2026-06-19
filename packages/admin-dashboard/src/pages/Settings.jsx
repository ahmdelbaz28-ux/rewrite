import { useState } from 'react';
import { useApi } from '../api/client.js';

export default function Settings() {
  const api = useApi();
  const [apiKeyName, setApiKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateKey = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api.post('/admin/api-keys', { name: apiKeyName, scopes: ['analytics'] });
      setCreatedKey(data);
      setApiKeyName('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16, fontSize: 16 }}>API Keys</h3>
        <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
          Create API keys for external services (analytics dashboards, integrations).
          Keys have scoped permissions.
        </p>
        
        {createdKey && (
          <div className="success-message" style={{ marginBottom: 16 }}>
            <strong>API Key Created!</strong><br />
            <code style={{ fontSize: 11, wordBreak: 'break-all' }}>{createdKey.key}</code><br />
            <small>Save this key now - it won't be shown again.</small>
          </div>
        )}
        
        <form onSubmit={handleCreateKey} style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            type="text"
            value={apiKeyName}
            onChange={(e) => setApiKeyName(e.target.value)}
            placeholder="Key name (e.g. Analytics Dashboard)"
            required
          />
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Key'}
          </button>
        </form>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16, fontSize: 16 }}>System Information</h3>
        <table>
          <tbody>
            <tr><td><strong>Backend URL</strong></td><td><code>/v1</code> (proxied to localhost:4000)</td></tr>
            <tr><td><strong>API Version</strong></td><td>0.1.0</td></tr>
            <tr><td><strong>Default Admin</strong></td><td>admin</td></tr>
            <tr><td><strong>License Tiers</strong></td><td>Free, Pro ($5/mo), Team ($49/mo), Enterprise ($499/mo)</td></tr>
            <tr><td><strong>Rate Limit</strong></td><td>100 requests / 15 min / IP</td></tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16, fontSize: 16 }}>Documentation</h3>
        <ul style={{ paddingLeft: 20, lineHeight: 2 }}>
          <li><a href="https://github.com/ahmdelbaz28-ux/rewrite/blob/main/docs/API.md" target="_blank" rel="noopener">API Reference</a></li>
          <li><a href="https://github.com/ahmdelbaz28-ux/rewrite/blob/main/docs/ARCHITECTURE.md" target="_blank" rel="noopener">Architecture</a></li>
          <li><a href="https://github.com/ahmdelbaz28-ux/rewrite/blob/main/docs/INSTALL.md" target="_blank" rel="noopener">Installation Guide</a></li>
          <li><a href="https://github.com/ahmdelbaz28-ux/rewrite/blob/main/docs/BETA.md" target="_blank" rel="noopener">Beta Program</a></li>
        </ul>
      </div>
    </>
  );
}
