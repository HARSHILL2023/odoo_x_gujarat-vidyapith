import { lazy, Suspense, useState, useEffect, memo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { FleetProvider } from './context/FleetContext';
import { get, clearToken } from './api';
import WelcomeModal from './components/WelcomeModal';
import ToastContainer from './components/ToastContainer';
import CommandPalette from './components/CommandPalette';
import QuickActionFAB from './components/QuickActionFAB';
import ErrorBoundary from './components/ErrorBoundary';
import { Command, Moon, Sun, Loader2, Menu, X } from 'lucide-react';

import Sidebar from './components/Sidebar';

/* ─── Lazy load pages for performance (Code Splitting) ─────── */
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Vehicles = lazy(() => import('./pages/Vehicles'));
const Drivers = lazy(() => import('./pages/Drivers'));
const Trips = lazy(() => import('./pages/Trips'));
const Maintenance = lazy(() => import('./pages/Maintenance'));
const FuelLogs = lazy(() => import('./pages/FuelLogs'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Help = lazy(() => import('./pages/Help'));

/* ─── Generic Page Loading Wrapper ─────────────────────────── */
const PageLoading = memo(function PageLoading() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', width: '100%', minHeight: 'calc(100vh - 120px)', gap: 12, color: 'var(--text-muted)'
    }}>
      <div style={{ width: 32, height: 32 }}>
        <Loader2 className="spinning" size={32} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.5px' }}>Loading workspace...</span>
    </div>
  );
});


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
const AppShell = memo(function AppShell({ user, onLogout, theme, toggleTheme, onShowHelp }) {
  const location = useLocation();
  const meta = PAGE_TITLES[location.pathname] || {};
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  }, [location.pathname]);

  return (
    <>
      <div className="app-shell">
        <Sidebar
          user={user}
          onLogout={onLogout}
          onShowHelp={onShowHelp}
          isMobileOpen={mobileMenuOpen}
          setIsMobileOpen={setMobileMenuOpen}
        />
        <div className="app-main">
          <header className="header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                className="mobile-only"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle Menu"
                style={{
                  background: 'none', border: 'none', color: 'var(--text-primary)',
                  padding: 8, marginLeft: -8, cursor: 'pointer'
                }}
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div className="header-subtitle desktop-only" style={{ textTransform: 'uppercase', letterSpacing: '0.8px', fontSize: 10, fontWeight: 700 }}>
                  {meta.sub}
                </div>
                <h1 className="header-title" style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>
                  {meta.title}
                </h1>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Ctrl+K hint chip */}
              <span
                className="shortcut-chip desktop-only"
                aria-label="Open Command Palette (Ctrl+K)"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })); } }}
              >
                <Command size={12} strokeWidth={2.5} aria-hidden="true" />
                <span style={{ marginTop: 1 }}>K</span>
              </span>

              {/* Theme toggle */}
              <button
                className="theme-toggle-btn"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                <span className="theme-toggle-icon" key={theme}>
                  {theme === 'dark' ? <Sun size={14} strokeWidth={2.5} aria-hidden="true" /> : <Moon size={14} strokeWidth={2.5} aria-hidden="true" />}
                </span>
                <span className="desktop-only" style={{ fontSize: 11, fontWeight: 700, textAlign: 'left' }}>
                  {theme === 'dark' ? 'Light' : 'Dark'}
                </span>
              </button>

              <span className="role-badge desktop-only">
                {user?.role?.replace('_', ' ')}
              </span>
            </div>
          </header>

          <main className="page-content fade-in">
            <ErrorBoundary>
              <Suspense fallback={<PageLoading />}>
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
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>
      </div>

      <ErrorBoundary>
        <CommandPalette />
        <QuickActionFAB />
      </ErrorBoundary>
    </>
  );
});

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

  const toggleTheme = () => {
    // Suppress transitions during theme switch to prevent lag
    document.body.classList.add('no-transition');
    setTheme(t => t === 'dark' ? 'light' : 'dark');
    setTimeout(() => {
      document.body.classList.remove('no-transition');
    }, 120);
  };

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
        <Suspense fallback={<PageLoading />}>
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
        </Suspense>
      </BrowserRouter>
    </FleetProvider>
  );
}
