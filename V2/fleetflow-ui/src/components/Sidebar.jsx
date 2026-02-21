import { useLocation, useNavigate } from 'react-router-dom';

const NAV = [
    { label: 'Command Center', icon: '⚡', path: '/dashboard', section: 'OVERVIEW' },
    { label: 'Trips', icon: '🗺️', path: '/trips', section: 'OPERATIONS' },
    { label: 'Vehicles', icon: '🚛', path: '/vehicles', section: 'ASSETS' },
    { label: 'Fuel & Expenses', icon: '⛽', path: '/fuel', section: 'ASSETS' },
    { label: 'Service Logs', icon: '🔧', path: '/maintenance', section: 'MAINTENANCE' },
    { label: 'Drivers', icon: '👤', path: '/drivers', section: 'PEOPLE' },
    { label: 'Analytics', icon: '📊', path: '/analytics', section: 'REPORTS' },
    { label: 'Help & Tips', icon: '❓', path: '/help', section: 'SUPPORT' },
];

const ROLE_LABELS = {
    fleet_manager: 'Fleet Manager',
    dispatcher: 'Dispatcher',
    safety_officer: 'Safety Officer',
    financial_analyst: 'Financial Analyst',
};

export default function Sidebar({ user, onLogout, onShowHelp }) {
    const location = useLocation();
    const navigate = useNavigate();

    let currentSection = null;

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">🚚</div>
                <div>
                    <div className="sidebar-logo-text">FleetFlow</div>
                    <div className="sidebar-logo-sub">Fleet Management</div>
                </div>
            </div>

            <nav className="sidebar-nav">
                {NAV.map((item) => {
                    const showSection = item.section !== currentSection;
                    currentSection = item.section;
                    return (
                        <div key={item.path}>
                            {showSection && (
                                <div className="sidebar-section-label">{item.section}</div>
                            )}
                            <button
                                className={`sidebar-link${location.pathname === item.path ? ' active' : ''}`}
                                onClick={() => navigate(item.path)}
                            >
                                <span className="sidebar-link-icon">{item.icon}</span>
                                {item.label}
                            </button>
                        </div>
                    );
                })}
            </nav>

            <div className="sidebar-footer">
                {/* Help & Guide button */}
                {onShowHelp && (
                    <button
                        onClick={onShowHelp}
                        title="Open guide & tips"
                        style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            width: '100%', padding: '9px 12px', marginBottom: 8,
                            background: 'var(--bg-hover)', border: '1px solid var(--border)',
                            borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)',
                            fontSize: 12, fontWeight: 500, transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.borderColor = 'var(--accent)';
                            e.currentTarget.style.color = 'var(--accent)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.borderColor = 'var(--border)';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                        }}
                    >
                        <span style={{ fontSize: 16 }}>❓</span>
                        Help &amp; Feature Guide
                    </button>
                )}

                <div className="sidebar-user">
                    <div className="sidebar-avatar">
                        {user?.name?.[0] || 'A'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {user?.name}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            {ROLE_LABELS[user?.role] || user?.role}
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}
                        title="Logout"
                    >⎋</button>
                </div>
            </div>
        </aside>
    );
}
