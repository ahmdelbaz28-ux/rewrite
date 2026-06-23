import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from './api/auth.jsx';

export default function App() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">SmartLangGuard</div>
        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
            📊 Dashboard
          </NavLink>
          <NavLink to="/licenses" className={({ isActive }) => isActive ? 'active' : ''}>
            🔑 Licenses
          </NavLink>
          <NavLink to="/telemetry" className={({ isActive }) => isActive ? 'active' : ''}>
            📈 Telemetry
          </NavLink>
          <NavLink to="/billing" className={({ isActive }) => isActive ? 'active' : ''}>
            💳 Billing
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''}>
            ⚙️ Settings
          </NavLink>
        </nav>
        <div style={{ position: 'absolute', bottom: 20, width: 240, padding: '0 20px' }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
            Logged in as <strong style={{ color: 'white' }}>{user?.username}</strong>
          </div>
          <button className="btn-secondary" onClick={handleLogout} style={{ width: '100%' }}>
            Logout
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
