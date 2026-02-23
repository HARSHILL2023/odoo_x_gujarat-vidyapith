import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    BarChart3, ChevronDown, Gauge, HelpCircle,
    LayoutDashboard, LogOut, PanelLeftClose, PanelLeftOpen,
    Route, Truck, Users, Wrench,
} from 'lucide-react';

/* ─── Constants ───────────────────────────────────────────── */
const STYLE_ID = 'ff-sb-styles';
const COLLAPSE_KEY = 'ff-sb-collapsed';

/* ─── Static nav data ─────────────────────────────────────── */
const NAV = [
    { Icon: LayoutDashboard, color: '#3b82f6', label: 'Command Center', path: '/dashboard', section: 'OVERVIEW' },
    { Icon: Route, color: '#38bdf8', label: 'Trips', path: '/trips', section: 'OPERATIONS' },
    { Icon: Truck, color: '#22c55e', label: 'Vehicles', path: '/vehicles', section: 'ASSETS' },
    { Icon: Gauge, color: '#f97316', label: 'Fuel & Expenses', path: '/fuel', section: 'ASSETS' },
    { Icon: Wrench, color: '#f59e0b', label: 'Service Logs', path: '/maintenance', section: 'MAINTENANCE' },
    { Icon: Users, color: '#8b5cf6', label: 'Drivers', path: '/drivers', section: 'PEOPLE' },
    { Icon: BarChart3, color: '#a855f7', label: 'Analytics', path: '/analytics', section: 'REPORTS' },
    { Icon: HelpCircle, color: '#64748b', label: 'Help & Tips', path: '/help', section: 'SUPPORT' },
];

const SECTIONS = [...new Map(NAV.map(n => [n.section, n.section])).keys()];
const NAV_BY_SECTION = SECTIONS.map(section => ({
    section,
    items: NAV.filter(n => n.section === section),
}));

/* ─── Role metadata ───────────────────────────────────────── */
const ROLE_META = {
    fleet_manager: { label: 'Fleet Manager', color: '#3b82f6' },
    dispatcher: { label: 'Dispatcher', color: '#22c55e' },
    safety_officer: { label: 'Safety Officer', color: '#f59e0b' },
    financial_analyst: { label: 'Financial Analyst', color: '#a855f7' },
};

/* ─── Helpers ─────────────────────────────────────────────── */
const AVATAR_PALETTES = [
    ['#3b82f6', '#6366f1'],
    ['#22c55e', '#16a34a'],
    ['#f59e0b', '#f97316'],
    ['#8b5cf6', '#a855f7'],
    ['#ef4444', '#dc2626'],
    ['#06b6d4', '#0ea5e9'],
];
function avatarGradient(name) {
    const idx = Math.abs((name?.charCodeAt(0) ?? 65) - 65) % AVATAR_PALETTES.length;
    const [a, b] = AVATAR_PALETTES[idx];
    return `linear-gradient(135deg, ${a}, ${b})`;
}

/* ─── FIX #2 helper — safe active check ──────────────────── */
function isRouteActive(pathname, itemPath) {
    return pathname === itemPath || pathname.startsWith(itemPath + '/');
}

/* ─── FleetFlow SVG mark ──────────────────────────────────── */
function FleetFlowMark() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="1" y="5" width="9" height="6" rx="1.5" fill="white" fillOpacity="0.9" />
            <path d="M10 7h3l2 3H10V7z" fill="white" fillOpacity="0.9" />
            <circle cx="4" cy="11.5" r="1.5" fill="white" fillOpacity="0.95" />
            <circle cx="12" cy="11.5" r="1.5" fill="white" fillOpacity="0.95" />
        </svg>
    );
}

/* ─── CSS ─────────────────────────────────────────────────── */
const CSS = `
@keyframes ff-sb-tip-in {
    from { opacity: 0; transform: translateY(-50%) translateX(-8px); }
    to   { opacity: 1; transform: translateY(-50%) translateX(0); }
}
@keyframes ff-sb-badge-pop {
    0%   { transform: scale(0);   opacity: 0; }
    65%  { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(1);   opacity: 1; }
}
@keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(59,130,246,0.6); }
    70% { box-shadow: 0 0 0 15px rgba(59,130,246,0); }
    100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
}
@keyframes soft-neon-pulse {
    0%, 100% { box-shadow: 0 0 20px rgba(59,130,246,0.4), 0 0 40px rgba(139,92,246,0.2); }
    50% { box-shadow: 0 0 30px rgba(59,130,246,0.6), 0 0 60px rgba(139,92,246,0.4); }
}
@keyframes ff-sb-stagger-in {
    from { opacity: 0; transform: translateX(-12px); }
    to   { opacity: 1; transform: translateX(0); }
}
@keyframes ff-sb-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
}
@keyframes breathe-glow {
    0%, 100% { box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3); }
    50% { box-shadow: 0 4px 28px rgba(59, 130, 246, 0.55), 0 0 40px rgba(139, 92, 246, 0.2); }
}
.ff-sb {
    position: relative; height: 100%;
    display: flex; flex-direction: column;
    background: var(--bg-sidebar, var(--bg-card));
    border-right: 1px solid var(--glass-border);
    width: var(--sidebar-w, 240px);
    transition: width 0.45s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink: 0; user-select: none;
    z-index: 100;
    animation: ff-sb-fade-in 0.5s ease-out;
}
.ff-sb.ff-sb-collapsed { width: 64px; }

@media (max-width: 768px) {
    .ff-sb {
        position: fixed;
        left: 0; top: 0; bottom: 0;
        width: 260px !important;
        transform: translateX(-100%) !important;
        box-shadow: 20px 0 50px rgba(0,0,0,0.5);
    }
    .ff-sb.ff-sb-mobile-open {
        transform: translateX(0) !important;
    }
    /* Hide the desktop collapse toggle in mobile */
    .ff-sb-toggle {
        display: none !important;
    }
}

.ff-sb-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.4);
    backdrop-filter: blur(4px);
    z-index: 90;
    opacity: 0; pointer-events: none;
    transition: opacity 0.3s ease;
}
.ff-sb-overlay.ff-sb-overlay-open {
    opacity: 1; pointer-events: auto;
}
.ff-sb-logo {
    display: flex; align-items: center; gap: 12px;
    padding: 20px 18px 18px;
    border-bottom: 1px solid var(--glass-border);
    flex-shrink: 0; overflow: hidden;
}
.ff-sb-logo-mark {
    width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 18px rgba(59,130,246,0.42), 0 0 0 1px rgba(99,102,241,0.2);
    transition: box-shadow 0.3s ease, transform 0.3s var(--bounce, cubic-bezier(0.34, 1.56, 0.64, 1));
    animation: breathe-glow 3s ease-in-out infinite, pulse 2s infinite;
}
.ff-sb-logo-mark:hover {
    box-shadow: 0 0 28px rgba(59,130,246,0.65), 0 0 0 1px rgba(99,102,241,0.35);
    transform: scale(1.08);
    animation: soft-neon-pulse 2s ease-in-out infinite;
}
.ff-sb-logo-words {
    overflow: hidden; flex: 1; min-width: 0;
    transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1); white-space: nowrap;
}
.ff-sb-collapsed .ff-sb-logo-words { opacity: 0; pointer-events: none; }
.ff-sb-logo-name {
    font-size: 15px; font-weight: 800; letter-spacing: -0.02em;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    font-family: var(--font-heading); line-height: 1.2;
}
.ff-sb-logo-sub { font-size: 10px; color: var(--text-muted); font-weight: 500; }
.ff-sb-toggle {
    position: absolute; top: 19px; right: -13px; z-index: 20;
    width: 26px; height: 26px; border-radius: 50%;
    background: var(--bg-card); border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--text-muted);
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    transition: color 0.2s var(--spring), background 0.2s var(--spring), transform 0.2s var(--spring), box-shadow 0.2s var(--spring);
}
.ff-sb-toggle:hover { color: var(--accent); background: var(--bg-hover); transform: scale(1.1); }
.ff-sb-toggle:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.ff-sb-nav {
    flex: 1; overflow-y: auto; overflow-x: hidden; padding: 8px;
    scrollbar-width: thin; scrollbar-color: var(--border) transparent;
}
.ff-sb-nav::-webkit-scrollbar { width: 3px; }
.ff-sb-nav::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
.ff-sb-divider {
    height: 1px; background: var(--glass-border);
    margin: 6px 12px; opacity: 0; transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.ff-sb-collapsed .ff-sb-divider { opacity: 1; }
.ff-sb-section-hd {
    display: flex; align-items: center;
    padding: 10px 8px 3px; margin-bottom: 1px;
    cursor: pointer; border-radius: 6px; overflow: hidden; height: 30px;
    transition: background 0.12s ease, height 0.22s ease,
                padding-top 0.22s ease, padding-bottom 0.22s ease, opacity 0.18s ease;
}
.ff-sb-section-hd:hover { background: var(--bg-hover); }
.ff-sb-collapsed .ff-sb-section-hd {
    height: 0; padding-top: 0; padding-bottom: 0; opacity: 0; pointer-events: none;
}
.ff-sb-section-lbl {
    font-size: 9.5px; font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.9px; color: var(--text-muted); flex: 1; white-space: nowrap;
}
.ff-sb-section-caret {
    color: var(--text-muted); flex-shrink: 0;
    transition: transform 0.2s cubic-bezier(0.4,0,0.2,1), color 0.15s ease;
}
.ff-sb-section-hd:hover .ff-sb-section-caret { color: var(--text-secondary); }
.ff-sb-section-caret.open   { transform: rotate(0deg); }
.ff-sb-section-caret.closed { transform: rotate(-90deg); }

/* ── FIX #4: overflow:hidden clips content during animation ── */
.ff-sb-section-items {
    display: grid; grid-template-rows: 1fr;
    overflow: hidden; /* ← ADDED: prevents content bleed in Safari/Firefox */
    transition: grid-template-rows 0.24s cubic-bezier(0.4,0,0.2,1);
}
.ff-sb-section-items.ff-sec-closed { grid-template-rows: 0fr; }
.ff-sb-section-items-inner { min-height: 0; overflow: hidden; }

.ff-sb-link {
    position: relative; width: 100%;
    display: flex; align-items: center; gap: 10px;
    padding: 8px 9px; border-radius: 9px; border: none;
    background: transparent; cursor: pointer; text-align: left;
    color: var(--text-muted); font-size: 13px; font-weight: 500;
    font-family: var(--font-body);
    transition: background 0.15s ease, color 0.1s ease, transform 0.2s var(--spring);
    white-space: nowrap; overflow: hidden;
}
.ff-sb-link:hover { 
    background: linear-gradient(90deg, var(--bg-hover) 0%, transparent 100%); 
    color: var(--text-primary); 
    transform: translateX(4px);
}
.ff-sb-link:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.ff-sb-link.active {
    background: var(--accent-glow); color: var(--text-primary); font-weight: 700;
}
.ff-sb-link::before {
    content: ''; position: absolute;
    left: 0; top: 22%; bottom: 22%; width: 3px;
    border-radius: 0 2px 2px 0; background: transparent;
    transition: background 0.18s ease, top 0.18s ease, bottom 0.18s ease;
}
.ff-sb-link.active::before { 
    background: var(--accent); 
    width: 3px;
    height: 18px;
    top: 50%;
    transform: translateY(-50%);
}
.ff-sb-icon {
    width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.1s ease, box-shadow 0.1s ease;
}
.ff-sb-link.active .ff-sb-icon {
    background: var(--ff-sb-icon-bg);
    box-shadow: 0 0 0 1px var(--ff-sb-icon-border);
}
.ff-sb-link-label { flex: 1; transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1); overflow: hidden; text-overflow: ellipsis; }
.ff-sb-collapsed .ff-sb-link-label { opacity: 0; }
.ff-sb-link-badge {
    min-width: 18px; height: 18px; border-radius: 9px; flex-shrink: 0;
    background: rgba(239,68,68,0.12); color: #ef4444;
    border: 1px solid rgba(239,68,68,0.22);
    font-size: 9px; font-weight: 800;
    display: flex; align-items: center; justify-content: center;
    padding: 0 5px; line-height: 1; font-variant-numeric: tabular-nums;
    animation: ff-sb-badge-pop 0.3s cubic-bezier(0.16,1,0.3,1) both;
    transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.ff-sb-collapsed .ff-sb-link-badge { opacity: 0; }
.ff-sb-tip {
    position: fixed; transform: translateY(-50%);
    background: var(--bg-card); border: 1px solid var(--glass-border);
    border-radius: 9px; padding: 7px 13px;
    font-size: 12px; font-weight: 600; color: var(--text-primary);
    white-space: nowrap; pointer-events: none; z-index: 9999;
    box-shadow: 0 8px 26px rgba(0,0,0,0.42);
    animation: ff-sb-tip-in 0.14s ease both;
}
.ff-sb-footer { padding: 8px; border-top: 1px solid var(--glass-border); flex-shrink: 0; }
.ff-sb-help-btn {
    display: flex; align-items: center; gap: 9px;
    width: 100%; padding: 8px 9px; margin-bottom: 5px;
    background: transparent; border: 1px solid transparent;
    border-radius: 9px; cursor: pointer;
    color: var(--text-muted); font-size: 12.5px; font-weight: 500;
    font-family: var(--font-body); text-align: left; white-space: nowrap; overflow: hidden;
    transition: background 0.1s ease, color 0.1s ease, border-color 0.12s ease;
}
.ff-sb-help-btn:hover {
    background: var(--bg-hover); color: var(--accent);
    border-color: rgba(59,130,246,0.2);
}
.ff-sb-help-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.ff-sb-help-icon {
    width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: var(--bg-hover); transition: background 0.1s ease;
}
.ff-sb-help-btn:hover .ff-sb-help-icon { background: rgba(59,130,246,0.12); }
.ff-sb-help-text { transition: opacity 0.18s ease; }
.ff-sb-collapsed .ff-sb-help-text { opacity: 0; }
.ff-sb-user {
    display: flex; align-items: center; gap: 9px;
    padding: 8px; border-radius: 10px; cursor: default;
    transition: background 0.1s ease; overflow: hidden;
}
.ff-sb-user:hover { background: var(--bg-hover); }
.ff-sb-avatar {
    position: relative; width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 700; color: #fff;
    box-shadow: 0 0 0 2px var(--bg-card), 0 0 0 3px rgba(255,255,255,0.12);
}
.ff-sb-avatar-dot {
    position: absolute; bottom: 0; right: 0;
    width: 9px; height: 9px; border-radius: 50%;
    background: #22c55e; border: 2px solid var(--bg-card);
    box-shadow: 0 0 6px rgba(34,197,94,0.55);
}
.ff-sb-user-info { flex: 1; min-width: 0; transition: opacity 0.18s ease; }
.ff-sb-collapsed .ff-sb-user-info { opacity: 0; width: 0; overflow: hidden; }
.ff-sb-user-name {
    font-size: 12.5px; font-weight: 600; color: var(--text-primary);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.ff-sb-role-chip {
    display: inline-flex; align-items: center;
    margin-top: 3px; padding: 1px 7px; border-radius: 99px;
    font-size: 9.5px; font-weight: 700; white-space: nowrap; line-height: 1.6;
}
.ff-sb-logout {
    width: 28px; height: 28px; border-radius: 7px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: none; border: none; cursor: pointer; color: var(--text-muted);
    transition: background 0.15s ease, color 0.15s ease, opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.ff-sb-logout:hover { background: rgba(239,68,68,0.1); color: #ef4444; }
.ff-sb-logout:focus-visible { outline: 2px solid #ef4444; outline-offset: 2px; }
.ff-sb-collapsed .ff-sb-logout { opacity: 0; pointer-events: none; }
@media (prefers-reduced-motion: reduce) {
    .ff-sb, .ff-sb-section-items, .ff-sb-section-hd,
    .ff-sb-logo-words, .ff-sb-link, .ff-sb-link-label,
    .ff-sb-link-badge, .ff-sb-help-text, .ff-sb-user-info,
    .ff-sb-logout, .ff-sb-section-caret, .ff-sb-divider { transition: none !important; }
    .ff-sb-tip { animation: none; }
}
`;

/* ─── Style injection ─────────────────────────────────────── */
function injectStyles() {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
}

/* ─── Main component ──────────────────────────────────────── */
export default function Sidebar({ user, onLogout, onShowHelp, badges = {}, isMobileOpen, setIsMobileOpen }) {
    const [collapsed, setCollapsed] = useState(() => {
        try { return localStorage.getItem(COLLAPSE_KEY) === 'true'; }
        catch { return false; }
    });
    const [collapsedSections, setCollapsedSections] = useState(() => new Set());
    const [tooltip, setTooltip] = useState(null);

    const navRef = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(injectStyles, []);

    /* ── FIX #1: side effects moved OUT of state updater ─────
       Previously setCollapsedSections was called inside
       setCollapsed's updater — a side effect in a "pure"
       function, double-invoked in React 18 Strict Mode.     */
    const toggleCollapse = useCallback(() => {
        setCollapsed(prev => {
            const next = !prev;
            try { localStorage.setItem(COLLAPSE_KEY, String(next)); } catch { }
            return next;
        });
    }, []);

    /* ── Re-open all sections when sidebar expands ─────────── */
    useEffect(() => {
        if (!collapsed) setCollapsedSections(new Set());
    }, [collapsed]);

    /* ── Also clear tooltip when expanding ───────────────────── */
    useEffect(() => {
        if (!collapsed) setTooltip(null);
    }, [collapsed]);

    /* ── Ctrl+B ───────────────────────────────────────────── */
    useEffect(() => {
        const handler = e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                e.preventDefault();
                toggleCollapse();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [toggleCollapse]);

    /* ── Section collapse ─────────────────────────────────── */
    const toggleSection = useCallback(section => {
        if (collapsed) return;
        setCollapsedSections(prev => {
            const next = new Set(prev);
            next.has(section) ? next.delete(section) : next.add(section);
            return next;
        });
    }, [collapsed]);

    /* ── Tooltip ──────────────────────────────────────────── */
    const showTooltip = useCallback((e, label) => {
        if (!collapsed) return;
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltip({ label, x: rect.right + 10, y: rect.top + rect.height / 2 });
    }, [collapsed]);

    const hideTooltip = useCallback(() => setTooltip(null), []);

    /* ── Arrow key navigation ─────────────────────────────── */
    const handleNavKey = useCallback((e, path) => {
        const links = [...(navRef.current?.querySelectorAll('.ff-sb-link') ?? [])];
        const idx = links.findIndex(l => l.dataset.path === path);
        if (idx === -1) return;
        switch (e.key) {
            case 'ArrowDown': e.preventDefault(); links[(idx + 1) % links.length]?.focus(); break;
            case 'ArrowUp': e.preventDefault(); links[(idx - 1 + links.length) % links.length]?.focus(); break;
            case 'Home': e.preventDefault(); links[0]?.focus(); break;
            case 'End': e.preventDefault(); links.at(-1)?.focus(); break;
        }
    }, []);

    const role = ROLE_META[user?.role];

    return (
        <>
            {/* Mobile Backdrop */}
            <div
                className={`ff-sb-overlay ${isMobileOpen ? 'ff-sb-overlay-open' : ''}`}
                onClick={() => setIsMobileOpen?.(false)}
            />

            <aside
                className={`ff-sb ${collapsed ? 'ff-sb-collapsed' : ''} ${isMobileOpen ? 'ff-sb-mobile-open' : ''}`}
                aria-label="Sidebar navigation"
            >
                {/* ── Logo ──────────────────────────────────── */}
                <div
                    className="ff-sb-logo"
                    onMouseEnter={e => showTooltip(e, 'FleetFlow')}
                    onMouseLeave={hideTooltip}
                    aria-label="FleetFlow Brand"
                >
                    <div className="ff-sb-logo-mark" aria-hidden="true">
                        <FleetFlowMark />
                    </div>
                    <div className="ff-sb-logo-words">
                        <div className="ff-sb-logo-name">FleetFlow</div>
                        <div className="ff-sb-logo-sub">Fleet Management</div>
                    </div>
                </div>

                {/* ── Collapse toggle ───────────────────────── */}
                <button
                    className="ff-sb-toggle"
                    onClick={toggleCollapse}
                    title={collapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    aria-expanded={!collapsed}
                >
                    {collapsed
                        ? <PanelLeftOpen size={12} strokeWidth={2.3} />
                        : <PanelLeftClose size={12} strokeWidth={2.3} />
                    }
                </button>

                {/* ── Nav ───────────────────────────────────── */}
                <nav ref={navRef} className="ff-sb-nav" aria-label="Main navigation">
                    {NAV_BY_SECTION.map(({ section, items }, si) => {
                        const isSectionClosed = collapsedSections.has(section);
                        return (
                            <div key={section}>
                                {si > 0 && <div className="ff-sb-divider" aria-hidden="true" />}

                                <div
                                    className="ff-sb-section-hd"
                                    role="button"
                                    tabIndex={collapsed ? -1 : 0}
                                    aria-expanded={!isSectionClosed}
                                    aria-label={`${section} section`}
                                    onClick={() => toggleSection(section)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            toggleSection(section);
                                        }
                                    }}
                                >
                                    <span className="ff-sb-section-lbl">{section}</span>
                                    <ChevronDown
                                        size={11}
                                        strokeWidth={2.5}
                                        className={`ff-sb-section-caret ${isSectionClosed ? 'closed' : 'open'}`}
                                        aria-hidden="true"
                                    />
                                </div>

                                {/* FIX #3: aria-hidden boolean → undefined when false */}
                                <div
                                    className={`ff-sb-section-items ${isSectionClosed ? 'ff-sec-closed' : ''}`}
                                    aria-hidden={isSectionClosed || undefined}
                                >
                                    <div className="ff-sb-section-items-inner">
                                        {items.map((item, ii) => {
                                            /* FIX #2: exact match OR /sub-path, not raw startsWith */
                                            const active = isRouteActive(location.pathname, item.path);
                                            const count = badges[item.path];
                                            return (
                                                <button
                                                    key={item.path}
                                                    className={`ff-sb-link ${active ? 'active' : ''}`}
                                                    data-path={item.path}
                                                    onClick={() => navigate(item.path)}
                                                    onKeyDown={e => handleNavKey(e, item.path)}
                                                    onMouseEnter={e => showTooltip(e, item.label)}
                                                    onMouseLeave={hideTooltip}
                                                    aria-current={active ? 'page' : undefined}
                                                    style={{
                                                        '--ff-sb-icon-bg': `${item.color}22`,
                                                        '--ff-sb-icon-border': `${item.color}36`,
                                                        animation: collapsed ? 'none' : 'ff-sb-stagger-in 0.35s var(--spring) backwards',
                                                        animationDelay: `${(si * items.length + ii) * 40}ms`
                                                    }}
                                                >
                                                    <div className="ff-sb-icon" aria-hidden="true">
                                                        <item.Icon
                                                            size={15}
                                                            color={active ? item.color : 'currentColor'}
                                                            strokeWidth={active ? 2.4 : 2}
                                                        />
                                                    </div>
                                                    <span className="ff-sb-link-label">{item.label}</span>
                                                    {count > 0 && (
                                                        <span
                                                            className="ff-sb-link-badge"
                                                            aria-label={`${count} notification${count !== 1 ? 's' : ''}`}
                                                        >
                                                            {count > 99 ? '99+' : count}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </nav>

                {/* ── Footer ────────────────────────────────── */}
                <div className="ff-sb-footer">
                    {onShowHelp && (
                        <button
                            className="ff-sb-help-btn"
                            onClick={onShowHelp}
                            onMouseEnter={e => showTooltip(e, 'Help & Guide')}
                            onMouseLeave={hideTooltip}
                            aria-label="Open help guide"
                        >
                            <div className="ff-sb-help-icon" aria-hidden="true">
                                <HelpCircle size={14} color="var(--text-muted)" strokeWidth={2} />
                            </div>
                            <span className="ff-sb-help-text">Help &amp; Feature Guide</span>
                        </button>
                    )}

                    <div
                        className="ff-sb-user"
                        onMouseEnter={e => showTooltip(e, user?.name ?? 'User')}
                        onMouseLeave={hideTooltip}
                    >
                        <div
                            className="ff-sb-avatar"
                            aria-hidden="true"
                            style={{ background: avatarGradient(user?.name) }}
                        >
                            {(user?.name?.[0] ?? 'A').toUpperCase()}
                            <span className="ff-sb-avatar-dot" aria-label="Online" role="status" />
                        </div>

                        <div className="ff-sb-user-info">
                            <div className="ff-sb-user-name">{user?.name ?? 'User'}</div>
                            {role && (
                                <div
                                    className="ff-sb-role-chip"
                                    style={{
                                        background: `${role.color}18`,
                                        color: role.color,
                                        border: `1px solid ${role.color}28`,
                                    }}
                                >
                                    {role.label}
                                </div>
                            )}
                        </div>

                        <button
                            className="ff-sb-logout"
                            onClick={onLogout}
                            title="Sign out"
                            aria-label="Sign out"
                        >
                            <LogOut size={14} strokeWidth={2} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── Portal tooltip ────────────────────────────── */}
            {tooltip && createPortal(
                <div
                    className="ff-sb-tip"
                    role="tooltip"
                    style={{ left: tooltip.x, top: tooltip.y }}
                >
                    {tooltip.label}
                </div>,
                document.body
            )}
        </>
    );
}
