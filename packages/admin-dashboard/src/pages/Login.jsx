import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginApi } from '../api/client.js';
import { useAuth } from '../api/auth.jsx';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await loginApi(username, password);
      login(data.token, { username: data.username, role: data.role });
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container card">
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>SmartLangGuard</h1>
      <p style={{ color: '#64748b', marginBottom: 24 }}>Admin Dashboard Login</p>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Username</label>
          <input
            type="text"
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            required
            autoFocus
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Password</label>
          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>
        <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
      
      <p style={{ marginTop: 16, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
        Default credentials: admin / admin123
      </p>
    </div>
  );
}
