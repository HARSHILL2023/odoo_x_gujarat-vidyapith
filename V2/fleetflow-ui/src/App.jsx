import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { FleetProvider } from './context/FleetContext';
import { get, clearToken } from './api';
import WelcomeModal from './components/WelcomeModal';
import ToastContainer from './components/ToastContainer';
import CommandPalette from './components/CommandPalette';
import QuickActionFAB from './components/QuickActionFAB';

import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Drivers from './pages/Drivers';
import Trips from './pages/Trips';
import Maintenance from './pages/Maintenance';
import FuelLogs from './pages/FuelLogs';
import Analytics from './pages/Analytics';
import Help from './pages/Help';

const PAGE_TITLES = {
  '/dashboard': { title: 'Command Center', sub: 'Real-time fleet overview' },
  '/vehicles': { title: 'Vehicle Registry', sub: 'Manage your fleet assets' },
  '/drivers': { title: 'Driver Profiles', sub: 'Compliance & performance tracking' },
  '/trips': { title: 'Trip Dispatcher', sub: 'Manage deliveries and routes' },
  '/maintenance': { title: 'Maintenance Logs', sub: 'Service history and scheduling' },
  '/fuel': { title: 'Fuel & Expense Logs', sub: 'Operational cost tracking' },
  '/analytics': { title: 'Analytics & Reports', sub: 'Data-driven fleet insights' },
  '/help': { title: 'Help & Tips', sub: 'Guides, tips and FAQs' },
};

/* ─── AppShell uses location so header updates on navigation ─── */
function AppShell({ user, onLogout, theme, toggleTheme, onShowHelp }) {
  const location = useLocation();
  const meta = PAGE_TITLES[location.pathname] || {};

  return (
    <div className="app-shell">
      <Sidebar user={user} onLogout={onLogout} onShowHelp={onShowHelp} />
      <div className="app-main">
        <header className="header">
          <div>
            <div className="header-title">{meta.title}</div>
            <div className="header-subtitle">{meta.sub}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Ctrl+K hint chip */}
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                background: 'var(--bg-hover)',
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
              }}
              title="Open Command Palette (Ctrl+K)"
            >
              <span>⌘K</span>
            </span>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              style={{
                background: 'var(--bg-hover)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '5px 10px',
                fontSize: 16,
                cursor: 'pointer',
                color: 'var(--text-primary)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {theme === 'dark' ? 'Light' : 'Dark'}
              </span>
            </button>

            <span style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              background: 'var(--bg-hover)',
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid var(--border)',
            }}>
              {user?.role}
            </span>
          </div>
        </header>

        <main className="page-content fade-in">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/drivers" element={<Drivers />} />
            <Route path="/trips" element={<Trips />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/fuel" element={<FuelLogs />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/help" element={<Help user={user} />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </main>
      </div>

      {/* Global overlays rendered inside the router so useNavigate works */}
      <CommandPalette />
      <QuickActionFAB />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('ff-user');
    return saved ? JSON.parse(saved) : null;
  });
  const [showWelcome, setShowWelcome] = useState(false);
  const [theme, setTheme] = useState(
    () => localStorage.getItem('ff-theme') || 'dark'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ff-theme', theme);
  }, [theme]);

  // Verify session on mount
  useEffect(() => {
    const token = localStorage.getItem('ff-token');
    if (token) {
      get('/api/auth/me')
        .then(userData => {
          const payload = { id: userData._id, name: userData.name, email: userData.email, role: userData.role };
          setUser(payload);
          localStorage.setItem('ff-user', JSON.stringify(payload));
        })
        .catch(() => {
          clearToken();
          localStorage.removeItem('ff-user');
          setUser(null);
        });
    }
  }, []);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('ff-user', JSON.stringify(userData));
    const key = `ff-welcomed-${userData.email}`;
    if (!localStorage.getItem(key)) {
      setShowWelcome(true);
      localStorage.setItem(key, '1');
    }
  };

  const handleLogout = () => {
    clearToken();
    localStorage.removeItem('ff-user');
    setUser(null);
  };

  return (
    <FleetProvider>
      {/* ToastContainer lives outside BrowserRouter — no routing needed */}
      <ToastContainer />

      <BrowserRouter>
        {user ? (
          <>
            <AppShell
              user={user}
              onLogout={handleLogout}
              theme={theme}
              toggleTheme={toggleTheme}
              onShowHelp={() => setShowWelcome(true)}
            />
            {showWelcome && (
              <WelcomeModal user={user} onClose={() => setShowWelcome(false)} />
            )}
          </>
        ) : (
          <Routes>
            <Route path="*" element={<Login onLogin={handleLogin} />} />
          </Routes>
        )}
      </BrowserRouter>
    </FleetProvider>
  );
}
