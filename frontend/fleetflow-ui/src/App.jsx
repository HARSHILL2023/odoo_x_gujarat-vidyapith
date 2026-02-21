import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FleetProvider } from './context/FleetContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Drivers from './pages/Drivers';
import Trips from './pages/Trips';
import Maintenance from './pages/Maintenance';
import FuelLogs from './pages/FuelLogs';
import Analytics from './pages/Analytics';

const PAGE_TITLES = {
  '/dashboard': { title: 'Command Center', sub: 'Real-time fleet overview' },
  '/vehicles': { title: 'Vehicle Registry', sub: 'Manage your fleet assets' },
  '/drivers': { title: 'Driver Profiles', sub: 'Compliance & performance tracking' },
  '/trips': { title: 'Trip Dispatcher', sub: 'Manage deliveries and routes' },
  '/maintenance': { title: 'Maintenance Logs', sub: 'Service history and scheduling' },
  '/fuel': { title: 'Fuel & Expense Logs', sub: 'Operational cost tracking' },
  '/analytics': { title: 'Analytics & Reports', sub: 'Data-driven fleet insights' },
};

function AppShell({ user, onLogout, theme, toggleTheme }) {
  const path = window.location.pathname;
  const meta = PAGE_TITLES[path] || {};
  return (
    <div className="app-shell">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="app-main">
        <header className="header">
          <div>
            <div className="header-title">{meta.title}</div>
            <div className="header-subtitle">{meta.sub}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(
    () => localStorage.getItem('ff-theme') || 'dark'
  );

  // Apply theme to <html> so all CSS variables switch automatically
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ff-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <FleetProvider>
      <BrowserRouter>
        {user ? (
          <AppShell
            user={user}
            onLogout={() => setUser(null)}
            theme={theme}
            toggleTheme={toggleTheme}
          />
        ) : (
          <Routes>
            <Route path="*" element={<Login onLogin={setUser} />} />
          </Routes>
        )}
      </BrowserRouter>
    </FleetProvider>
  );
}
