import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FleetProvider } from '@/context/FleetContext';
import Sidebar from '@/components/Sidebar';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import Vehicles from '@/pages/Vehicles';
import Drivers from '@/pages/Drivers';
import Trips from '@/pages/Trips';
import Maintenance from '@/pages/Maintenance';
import FuelLogs from '@/pages/FuelLogs';
import Analytics from '@/pages/Analytics';
import authService from '@/services/authService';

const PAGE_TITLES = {
  '/dashboard': { title: 'Command Center', sub: 'Real-time fleet overview' },
  '/vehicles': { title: 'Vehicle Registry', sub: 'Manage your fleet assets' },
  '/drivers': { title: 'Driver Profiles', sub: 'Compliance & performance tracking' },
  '/trips': { title: 'Trip Dispatcher', sub: 'Manage deliveries and routes' },
  '/maintenance': { title: 'Maintenance Logs', sub: 'Service history and scheduling' },
  '/fuel': { title: 'Fuel & Expense Logs', sub: 'Operational cost tracking' },
  '/analytics': { title: 'Analytics & Reports', sub: 'Data-driven fleet insights' },
};

const ProtectedRoute = ({ children, allowedRoles, user }) => {
  if (!user) return <Navigate to="/" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" />;
  }
  return children;
};

function AppShell({ user, onLogout, theme, toggleTheme }) {
  const path = window.location.pathname;
  const meta = PAGE_TITLES[path] || {};

  const handleLogout = () => {
    authService.logout();
    onLogout();
  };

  return (
    <div className="app-shell">
      <Sidebar user={user} onLogout={handleLogout} />
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
              {user?.role || 'User'}
            </span>
          </div>
        </header>
        <main className="page-content">
          <div className="animate-in">
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/vehicles" element={<Vehicles />} />
              <Route path="/drivers" element={<Drivers />} />
              <Route path="/trips" element={<Trips />} />
              <Route path="/maintenance" element={<Maintenance />} />
              <Route path="/fuel" element={
                <ProtectedRoute allowedRoles={['Fleet Manager', 'Finance Admin', 'Dispatcher']} user={user}>
                  <FuelLogs />
                </ProtectedRoute>
              } />
              <Route path="/analytics" element={
                <ProtectedRoute allowedRoles={['Fleet Manager']} user={user}>
                  <Analytics />
                </ProtectedRoute>
              } />
              <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(
    () => localStorage.getItem('ff-theme') || 'dark'
  );

  // Check for existing session on app load
  useEffect(() => {
    const checkAuth = () => {
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Apply theme to <html> so all CSS variables switch automatically
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ff-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const handleLogin = (userData) => {
    setUser(userData);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2>FleetFlow</h2>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

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
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<Login onLogin={handleLogin} />} />
          </Routes>
        )}
      </BrowserRouter>
    </FleetProvider>
  );
}