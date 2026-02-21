import { useLocation, useNavigate } from 'react-router-dom';

const NAV = [
    { label: 'Command Center', icon: '⚡', path: '/dashboard', section: 'OVERVIEW' },
    { label: 'Trips', icon: '🗺️', path: '/trips', section: 'OPERATIONS' },
    { label: 'Vehicles', icon: '🚛', path: '/vehicles', section: 'ASSETS' },
    { label: 'Fuel & Expenses', icon: '⛽', path: '/fuel', section: 'ASSETS' },
    { label: 'Service Logs', icon: '🔧', path: '/maintenance', section: 'MAINTENANCE' },
    { label: 'Drivers', icon: '👤', path: '/drivers', section: 'PEOPLE' },
    { label: 'Analytics', icon: '📊', path: '/analytics', section: 'REPORTS' },
];

export default function Sidebar({ user, onLogout }) {
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
                <div className="sidebar-user">
                    <div className="sidebar-avatar">
                        {user?.name?.[0] || 'A'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user?.role}</div>
                    </div>
                    <button
                        onClick={onLogout}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: 14,
                            padding: '6px',
                            borderRadius: '8px',
                            transition: 'var(--transition)'
                        }}
                        className="btn-icon-hover"
                        title="Logout"
                    >⎋</button>
                </div>
            </div>
        </aside>
    );
}
