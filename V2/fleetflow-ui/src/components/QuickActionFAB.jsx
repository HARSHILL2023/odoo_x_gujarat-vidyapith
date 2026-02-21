import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/* ─── CSS ─────────────────────────────────────────────────── */
const CSS = `
.fab-root {
    position: fixed;
    bottom: 28px;
    right: 28px;
    z-index: 1200;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 10px;
}

.fab-btn {
    width: 52px; height: 52px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--accent), #6366f1);
    color: #fff;
    border: none;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px;
    box-shadow: 0 6px 20px rgba(14,165,233,0.45), 0 0 0 4px rgba(14,165,233,0.1);
    transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease;
    flex-shrink: 0;
}
.fab-btn:hover {
    transform: scale(1.12);
    box-shadow: 0 8px 28px rgba(14,165,233,0.55), 0 0 0 6px rgba(14,165,233,0.15);
}
.fab-btn.open {
    transform: rotate(45deg);
    background: linear-gradient(135deg, #6366f1, var(--accent));
}

.fab-menu {
    display: flex; flex-direction: column; align-items: flex-end; gap: 8px;
    overflow: hidden;
}
.fab-menu.visible {}

.fab-item {
    display: flex; align-items: center; gap: 9px;
    animation: fadeInScale 0.25s ease both;
    cursor: pointer;
}
.fab-item-label {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 6px 12px;
    font-size: 12px; font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    box-shadow: var(--shadow-card);
    transition: background 0.15s;
}
.fab-item:hover .fab-item-label { background: var(--bg-hover); }
.fab-item-circle {
    width: 38px; height: 38px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 17px;
    border: none;
    cursor: pointer;
    box-shadow: var(--shadow-card);
    transition: transform 0.2s ease;
    flex-shrink: 0;
}
.fab-item-circle:hover { transform: scale(1.1); }
`;

function injectCSS(id, css) {
    if (typeof document === 'undefined' || document.getElementById(id)) return;
    const el = document.createElement('style');
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
}

const ACTIONS = [
    { icon: '🔍', label: 'Command Palette', color: '#0EA5E9', action: () => window.__ffOpenCommandPalette?.() },
    { icon: '🚛', label: 'New Trip', color: '#22C55E', route: '/trips', state: { openCreate: true } },
    { icon: '🚗', label: 'Add Vehicle', color: '#F59E0B', route: '/vehicles', state: { openCreate: true } },
    { icon: '👤', label: 'Add Driver', color: '#8B5CF6', route: '/drivers', state: { openCreate: true } },
    { icon: '❓', label: 'Help & Tips', color: '#64748B', route: '/help' },
];

export default function QuickActionFAB() {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);
    const navigate = useNavigate();

    injectCSS('ff-fab-styles', CSS);

    /* Close on click outside */
    useEffect(() => {
        if (!open) return;
        const handler = e => {
            if (!rootRef.current?.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const exec = item => {
        setOpen(false);
        if (item.route) navigate(item.route, { state: item.state });
        else item.action && item.action();
    };

    return (
        <div className="fab-root" ref={rootRef}>
            {/* Menu items */}
            {open && (
                <div className="fab-menu visible">
                    {ACTIONS.map((item, i) => (
                        <div
                            key={item.label}
                            className="fab-item"
                            onClick={() => exec(item)}
                            style={{ animationDelay: `${i * 40}ms` }}
                        >
                            <span className="fab-item-label">{item.label}</span>
                            <button
                                className="fab-item-circle"
                                style={{ background: item.color }}
                                title={item.label}
                            >
                                {item.icon}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Main FAB */}
            <button
                className={`fab-btn ${open ? 'open' : ''}`}
                onClick={() => setOpen(o => !o)}
                title={open ? 'Close' : 'Quick actions'}
                aria-label="Quick actions menu"
            >
                +
            </button>
        </div>
    );
}
