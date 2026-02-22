import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFleet } from '../context/FleetContext';
import {
    BarChart3, ChevronRight, Clock, Gauge, HelpCircle,
    LayoutDashboard, MapPin, Plus, Route,
    Search, Truck, User, UserPlus, Users,
    Wrench, X,
} from 'lucide-react';
    
/* ─── Constants ───────────────────────────────────────────── */
const STYLE_ID = 'ff-cp-styles';
const RECENT_KEY = 'ff-cp-recent';
const MAX_RECENT = 5;
const FILTERS = ['All', 'Pages', 'Create', 'Data'];

/* Icon lookup for reconstructing recent items from localStorage */
const ROUTE_ICON = {
    '/': { Icon: LayoutDashboard, color: '#3b82f6' },
    '/trips': { Icon: Route, color: '#38bdf8' },
    '/vehicles': { Icon: Truck, color: '#22c55e' },
    '/drivers': { Icon: Users, color: '#8b5cf6' },
    '/analytics': { Icon: BarChart3, color: '#a855f7' },
    '/maintenance': { Icon: Wrench, color: '#f59e0b' },
    '/fuel': { Icon: Gauge, color: '#f97316' },
    '/help': { Icon: HelpCircle, color: '#64748b' },
};

/* ─── Fuzzy scorer ────────────────────────────────────────── */
function scoreText(text, q) {
    if (!text || !q) return 0;
    const t = text.toLowerCase(), query = q.toLowerCase();
    if (t === query) return 100;
    if (t.startsWith(query)) return 80;
    if (t.includes(query)) return 60;
    if (t.split(/[\s·_\-]+/).some(w => w.startsWith(query))) return 40;
    return 0;
}
function scoreItem(item, q) {
    return Math.max(scoreText(item.label, q), scoreText(item.sub ?? '', q) * 0.6);
}

/* ─── localStorage helpers ────────────────────────────────── */
function loadRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
    catch { return []; }
}
function saveRecent(arr) {
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(arr.slice(0, MAX_RECENT))); }
    catch { }
}

/* ─── CSS ─────────────────────────────────────────────────── */
const CSS = `
@keyframes cp-item-in {
    from { opacity: 0; transform: translateY(5px); }
    to   { opacity: 1; transform: translateY(0); }
}
.cp-overlay {
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(0,0,0,0.62);
    backdrop-filter: blur(8px);
    display: flex; align-items: flex-start; justify-content: center;
    padding-top: clamp(60px, 12vh, 140px);
    animation: fadeIn 0.15s ease;
}
.cp-box {
    width: 600px; max-width: calc(100vw - 32px);
    background: var(--bg-card);
    border: 1px solid var(--glass-border);
    border-radius: 16px;
    box-shadow:
        0 32px 80px rgba(0,0,0,0.75),
        0 0 0 1px rgba(255,255,255,0.06),
        inset 0 1px 0 rgba(255,255,255,0.05);
    overflow: hidden;
    animation: fadeInScale 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    display: flex; flex-direction: column;
}
/* ── Brand bar ─────────────────────────────────────────────── */
.cp-brand {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 14px 9px;
    border-bottom: 1px solid var(--glass-border);
    background: rgba(255,255,255,0.016);
}
.cp-brand-logo {
    width: 22px; height: 22px; border-radius: 6px; flex-shrink: 0;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 14px rgba(59,130,246,0.45);
}
.cp-brand-name {
    font-size: 12px; font-weight: 700; letter-spacing: 0.01em;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text; font-family: var(--font-heading);
}
.cp-brand-divider { width: 1px; height: 12px; background: var(--glass-border); }
.cp-brand-label {
    font-size: 11px; color: var(--text-muted);
    font-weight: 500; letter-spacing: 0.02em;
}
.cp-clear-recent {
    margin-left: auto; font-size: 10.5px; color: var(--text-muted);
    background: none; border: none; cursor: pointer;
    padding: 2px 8px; border-radius: 5px;
    font-family: var(--font-body);
    transition: color 0.15s ease, background 0.15s ease;
}
.cp-clear-recent:hover { color: var(--text-secondary); background: var(--bg-hover); }
/* ── Search input ──────────────────────────────────────────── */
.cp-input-wrap {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 14px;
    border-bottom: 1px solid var(--glass-border);
}
.cp-input {
    flex: 1; background: none; border: none; outline: none;
    font-size: 15px; font-family: var(--font-body);
    color: var(--text-primary); caret-color: var(--accent);
}
.cp-input::placeholder { color: var(--text-muted); }
.cp-clear-btn {
    display: flex; align-items: center; justify-content: center;
    width: 22px; height: 22px; border-radius: 6px; border: none;
    background: var(--bg-hover); cursor: pointer;
    color: var(--text-muted); padding: 0; flex-shrink: 0;
    transition: background 0.15s ease, color 0.15s ease;
}
.cp-clear-btn:hover { background: var(--border); color: var(--text-primary); }
.cp-esc-hint {
    font-size: 10px; color: var(--text-muted);
    background: var(--bg-hover); border: 1px solid var(--glass-border);
    border-radius: 4px; padding: 2px 7px;
    font-family: var(--font-mono); white-space: nowrap; flex-shrink: 0;
}
/* ── Filter tabs ───────────────────────────────────────────── */
.cp-filters {
    display: flex; gap: 3px; padding: 7px 8px;
    border-bottom: 1px solid var(--glass-border);
    background: rgba(255,255,255,0.01);
}
.cp-filter-tab {
    display: flex; align-items: center; gap: 5px;
    padding: 4px 10px; border-radius: 6px;
    border: 1px solid transparent;
    font-size: 11.5px; font-weight: 500; cursor: pointer;
    background: transparent; color: var(--text-muted);
    transition: background 0.15s, color 0.15s, border-color 0.15s;
    font-family: var(--font-body);
}
.cp-filter-tab:hover {
    background: var(--bg-hover); color: var(--text-secondary);
}
.cp-filter-tab.active {
    background: rgba(59,130,246,0.1);
    color: var(--accent);
    border-color: rgba(59,130,246,0.22);
}
.cp-filter-count {
    font-size: 9.5px; font-weight: 700;
    background: rgba(255,255,255,0.07);
    border-radius: 99px; padding: 1px 5px;
    min-width: 16px; text-align: center;
    font-variant-numeric: tabular-nums;
    line-height: 1.4;
}
.cp-filter-tab.active .cp-filter-count {
    background: rgba(59,130,246,0.18); color: var(--accent);
}
/* ── Results ───────────────────────────────────────────────── */
.cp-results {
    max-height: 360px; overflow-y: auto; padding: 6px;
    scrollbar-width: thin; scrollbar-color: var(--border) transparent;
}
.cp-results::-webkit-scrollbar { width: 4px; }
.cp-results::-webkit-scrollbar-track { background: transparent; }
.cp-results::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
.cp-section {
    display: flex; align-items: center; gap: 5px;
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.9px; color: var(--text-muted);
    padding: 10px 10px 4px;
}
.cp-item {
    display: flex; align-items: center; gap: 10px;
    padding: 7px 10px; cursor: pointer;
    border-radius: 9px; border: 1px solid transparent;
    transition: background 0.1s ease, border-color 0.1s ease;
    position: relative;
    animation: cp-item-in 0.18s ease both;
}
.cp-item:hover { background: var(--bg-hover); }
.cp-item[aria-selected="true"] {
    background: rgba(59,130,246,0.08);
    border-color: rgba(59,130,246,0.2);
}
.cp-item[aria-selected="true"]::before {
    content: '';
    position: absolute; inset: 0; border-radius: 9px;
    background: linear-gradient(90deg, rgba(59,130,246,0.04), transparent);
    pointer-events: none;
}
.cp-item-text { flex: 1; min-width: 0; }
.cp-item-label {
    display: flex; align-items: center; gap: 0;
    font-size: 13.5px; font-weight: 500; color: var(--text-primary);
}
.cp-item-label-text {
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.cp-item-sub {
    display: flex; align-items: center;
    font-size: 11.5px; color: var(--text-muted);
    margin-top: 2px; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
}
.cp-item-arrow {
    color: var(--text-muted); flex-shrink: 0;
    opacity: 0; transition: opacity 0.1s ease, transform 0.1s ease;
}
.cp-item[aria-selected="true"] .cp-item-arrow {
    opacity: 1; color: var(--accent); transform: translateX(2px);
}
/* ── Badges ────────────────────────────────────────────────── */
.cp-badge {
    display: inline-flex; align-items: center;
    font-size: 9px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.06em; padding: 1px 6px; border-radius: 99px;
    margin-left: 7px; white-space: nowrap; flex-shrink: 0;
}
.cp-badge-current {
    background: rgba(59,130,246,0.15); color: var(--accent);
    border: 1px solid rgba(59,130,246,0.25);
}
.cp-badge-recent {
    background: rgba(255,255,255,0.05); color: var(--text-muted);
    border: 1px solid var(--glass-border);
}
/* ── Status dot ────────────────────────────────────────────── */
.cp-status-dot {
    display: inline-block; width: 6px; height: 6px;
    border-radius: 50%; margin-right: 5px; flex-shrink: 0;
}
/* ── Empty state ───────────────────────────────────────────── */
.cp-empty {
    padding: 36px 18px; text-align: center;
    color: var(--text-muted); font-size: 13px; line-height: 1.7;
}
.cp-empty-icon { font-size: 28px; margin-bottom: 8px; line-height: 1; }
.cp-empty strong { color: var(--text-secondary); }
.cp-empty-hint {
    font-size: 11px; margin-top: 6px; color: var(--text-muted);
    opacity: 0.7;
}
/* ── Footer ────────────────────────────────────────────────── */
.cp-footer {
    display: flex; align-items: center; flex-wrap: wrap; gap: 14px;
    padding: 9px 14px;
    border-top: 1px solid var(--glass-border);
    font-size: 11px; color: var(--text-muted);
    background: rgba(255,255,255,0.012);
}
.cp-footer-hint { display: flex; align-items: center; gap: 4px; }
.cp-footer kbd {
    display: inline-flex; align-items: center; justify-content: center;
    background: var(--bg-hover); border: 1px solid var(--border);
    border-bottom-width: 2px; border-radius: 4px;
    padding: 1px 5px; font-size: 10px; font-family: var(--font-mono);
    color: var(--text-secondary); min-width: 20px;
}
.cp-result-count {
    margin-left: auto; font-size: 10.5px; color: var(--text-muted);
    font-variant-numeric: tabular-nums;
}
@media (prefers-reduced-motion: reduce) {
    .cp-overlay, .cp-box, .cp-item { animation: none; }
}
`;

function injectStyles() {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
}

/* ─── Static data ─────────────────────────────────────────── */
const NAV_DATA = [
    { Icon: LayoutDashboard, color: '#3b82f6', label: 'Dashboard', sub: '', route: '/' },
    { Icon: Route, color: '#38bdf8', label: 'Trip Dispatcher', sub: '', route: '/trips' },
    { Icon: Truck, color: '#22c55e', label: 'Vehicles', sub: '', route: '/vehicles' },
    { Icon: Users, color: '#8b5cf6', label: 'Drivers', sub: '', route: '/drivers' },
    { Icon: BarChart3, color: '#a855f7', label: 'Analytics', sub: '', route: '/analytics' },
    { Icon: Wrench, color: '#f59e0b', label: 'Maintenance', sub: '', route: '/maintenance' },
    { Icon: Gauge, color: '#f97316', label: 'Fuel & Expenses', sub: '', route: '/fuel' },
    { Icon: HelpCircle, color: '#64748b', label: 'Help', sub: '', route: '/help' },
];

const CREATE_DATA = [
    { Icon: Plus, color: '#22c55e', label: 'New Trip', sub: 'Create & dispatch a trip', route: '/trips', state: { openCreate: true } },
    { Icon: Truck, color: '#3b82f6', label: 'Add Vehicle', sub: 'Register a fleet vehicle', route: '/vehicles', state: { openCreate: true } },
    { Icon: UserPlus, color: '#8b5cf6', label: 'Add Driver', sub: 'Register a new driver profile', route: '/drivers', state: { openCreate: true } },
];

/* ─── Sub-components ──────────────────────────────────────── */
function IconBubble({ icon: Icon, color, isActive }) {
    return (
        <div
            aria-hidden="true"
            style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: `linear-gradient(145deg, ${color}ee, ${color}88)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isActive
                    ? `0 0 0 2px ${color}55, 0 2px 6px ${color}50`
                    : `0 1px 4px ${color}50`,
                position: 'relative',
            }}
        >
            <Icon size={14} color="#fff" strokeWidth={2.2} />
            {isActive && (
                <div style={{
                    position: 'absolute', bottom: -2, right: -2,
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#22c55e',
                    border: '1.5px solid var(--bg-card)',
                    boxShadow: '0 0 4px #22c55e80',
                }} />
            )}
        </div>
    );
}

function Highlight({ text, query }) {
    if (!query || !text) return <>{text ?? ''}</>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <>{text}</>;
    return (
        <>
            {text.slice(0, idx)}
            <mark style={{
                background: 'rgba(59,130,246,0.22)', color: 'var(--accent)',
                borderRadius: 2, padding: '0 1px', fontWeight: 600,
            }}>
                {text.slice(idx, idx + query.length)}
            </mark>
            {text.slice(idx + query.length)}
        </>
    );
}

function FleetFlowMark() {
    return (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="1" y="5" width="9" height="6" rx="1.5" fill="white" fillOpacity="0.9" />
            <path d="M10 7h3l2 3H10V7z" fill="white" fillOpacity="0.9" />
            <circle cx="4" cy="11.5" r="1.5" fill="white" fillOpacity="0.95" />
            <circle cx="12" cy="11.5" r="1.5" fill="white" fillOpacity="0.95" />
        </svg>
    );
}

/* ─── Main component ──────────────────────────────────────── */
export default function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(0);
    const [activeFilter, setActiveFilter] = useState('All');
    const [recent, setRecent] = useState(loadRecent);

    const inputRef = useRef(null);
    const resultsRef = useRef(null);
    const openRef = useRef(false);

    const location = useLocation();
    const navigate = useNavigate();
    const { vehicles, drivers, trips } = useFleet();

    useEffect(injectStyles, []);
    useEffect(() => { openRef.current = open; }, [open]);

    /* ── Open / close ─────────────────────────────────────── */
    const closePalette = useCallback(() => setOpen(false), []);

    const openPalette = useCallback(() => {
        setOpen(true);
        setQuery('');
        setSelected(0);
        setActiveFilter('All');
    }, []);

    /* ── Global Ctrl+K / Escape ───────────────────────────── */
    useEffect(() => {
        const handler = e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                if (openRef.current) closePalette(); else openPalette();
            }
            if (e.key === 'Escape' && openRef.current) closePalette();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [openPalette, closePalette]);

    /* ── FAB bridge ───────────────────────────────────────── */
    useEffect(() => {
        window.__ffOpenCommandPalette = openPalette;
        return () => { delete window.__ffOpenCommandPalette; };
    }, [openPalette]);

    /* ── Focus input on open ──────────────────────────────── */
    useEffect(() => {
        if (!open) return;
        const id = setTimeout(() => inputRef.current?.focus(), 30);
        return () => clearTimeout(id);
    }, [open]);

    /* ── Live fleet stats as dynamic sub-text ─────────────── */
    const liveStats = useMemo(() => {
        const onRoute = trips.filter(t => t.state === 'dispatched').length;
        const draft = trips.filter(t => t.state === 'draft').length;
        const avail = vehicles.filter(v => v.status === 'available').length;
        const onTrip = vehicles.filter(v => v.status === 'on_trip').length;
        const inShop = vehicles.filter(v => v.status === 'in_shop').length;
        const driving = drivers.filter(d => d.status === 'on_trip').length;
        const standby = drivers.filter(d => d.status === 'off_duty').length;
        const completed = trips.filter(t => t.state === 'completed').length;
        return {
            '/': `${vehicles.length} vehicles · ${drivers.length} drivers · ${onRoute} active trips`,
            '/trips': `${onRoute} on route · ${draft} draft · ${completed} completed`,
            '/vehicles': `${avail} available · ${onTrip} on trip · ${inShop} in shop`,
            '/drivers': `${standby} standby · ${driving} driving`,
            '/analytics': `${completed} trips completed · ${vehicles.length} vehicles tracked`,
            '/maintenance': `${inShop} in shop · ${vehicles.length} total vehicles`,
            '/fuel': `${vehicles.length} vehicles · fuel & expense logs`,
            '/help': 'Tips, FAQ & feature guide',
        };
    }, [vehicles, drivers, trips]);

    /* ── Nav actions with live stats + active route ────────── */
    const navActions = useMemo(() =>
        NAV_DATA.map(d => ({
            ...d,
            sub: liveStats[d.route] ?? d.sub,
            isActive: location.pathname === d.route,
            category: 'nav',
            action: () => navigate(d.route),
        })),
        [navigate, location.pathname, liveStats]
    );

    const createActions = useMemo(() =>
        CREATE_DATA.map(d => ({
            ...d,
            category: 'create',
            action: () => navigate(d.route, { state: d.state }),
        })),
        [navigate]
    );

    /* ── Recent actions ───────────────────────────────────── */
    const recentActions = useMemo(() =>
        recent.map(r => {
            const iconInfo = ROUTE_ICON[r.route] ?? { Icon: Clock, color: '#64748b' };
            return {
                ...iconInfo,
                label: r.label,
                sub: r.sub,
                isRecent: true,
                category: 'recent',
                action: () => navigate(r.route, r.state ? { state: r.state } : {}),
            };
        }),
        [recent, navigate]
    );

    /* ── Query ────────────────────────────────────────────── */
    const q = query.toLowerCase().trim();

    /* ── Data results (fuzzy + scored) ───────────────────── */
    const dataResults = useMemo(() => {
        if (q.length < 2) return [];
        const out = [];

        vehicles
            .map(v => ({ v, s: scoreText(v.name, q) }))
            .filter(({ s }) => s > 0)
            .sort((a, b) => b.s - a.s)
            .slice(0, 3)
            .forEach(({ v }) => out.push({
                Icon: Truck, color: '#22c55e', category: 'data',
                label: v.name,
                sub: `${v.status} · ${v.licensePlate ?? v.license_plate ?? '—'}`,
                statusColor:
                    v.status === 'available' ? '#22c55e' :
                        v.status === 'on_trip' ? '#38bdf8' :
                            v.status === 'in_shop' ? '#f59e0b' : '#94a3b8',
                action: () => navigate('/vehicles'),
                _score: scoreText(v.name, q),
            }));

        drivers
            .map(d => ({ d, s: scoreText(d.name, q) }))
            .filter(({ s }) => s > 0)
            .sort((a, b) => b.s - a.s)
            .slice(0, 3)
            .forEach(({ d }) => out.push({
                Icon: User, color: '#8b5cf6', category: 'data',
                label: d.name,
                sub: d.status,
                statusColor:
                    d.status === 'suspended' ? '#ef4444' :
                        d.status === 'on_trip' ? '#38bdf8' : '#22c55e',
                action: () => navigate('/drivers'),
                _score: scoreText(d.name, q),
            }));

        trips
            .map(t => ({
                t,
                s: Math.max(
                    scoreText(t.reference, q),
                    scoreText(t.origin, q),
                    scoreText(t.destination, q)
                ),
            }))
            .filter(({ s }) => s > 0)
            .sort((a, b) => b.s - a.s)
            .slice(0, 3)
            .forEach(({ t }) => out.push({
                Icon: MapPin, color: '#38bdf8', category: 'data',
                label: t.reference,
                sub: `${t.origin} → ${t.destination} · ${t.state}`,
                statusColor:
                    t.state === 'completed' ? '#22c55e' :
                        t.state === 'dispatched' ? '#38bdf8' :
                            t.state === 'cancelled' ? '#ef4444' : '#94a3b8',
                action: () => navigate('/trips'),
                _score: Math.max(
                    scoreText(t.reference, q),
                    scoreText(t.origin, q),
                    scoreText(t.destination, q)
                ),
            }));

        return out.sort((a, b) => b._score - a._score);
    }, [q, vehicles, drivers, trips, navigate]);

    /* ── Filtered + scored static actions ─────────────────── */
    const filteredNav = useMemo(() => {
        if (!q) return navActions;
        return navActions
            .map(a => ({ ...a, _score: scoreItem(a, q) }))
            .filter(a => a._score > 0)
            .sort((a, b) => b._score - a._score);
    }, [q, navActions]);

    const filteredCreate = useMemo(() => {
        if (!q) return createActions;
        return createActions
            .map(a => ({ ...a, _score: scoreItem(a, q) }))
            .filter(a => a._score > 0)
            .sort((a, b) => b._score - a._score);
    }, [q, createActions]);

    /* ── Sections gated by active filter ──────────────────── */
    const sections = useMemo(() => {
        const f = activeFilter;
        const raw = [];

        // Recent only shown when no query + All filter
        if (!q && (f === 'All') && recentActions.length > 0)
            raw.push({ title: 'Recent', items: recentActions });

        if ((f === 'All' || f === 'Data') && dataResults.length)
            raw.push({ title: 'Results', items: dataResults });
        if ((f === 'All' || f === 'Pages') && filteredNav.length)
            raw.push({ title: 'Navigate', items: filteredNav });
        if ((f === 'All' || f === 'Create') && filteredCreate.length)
            raw.push({ title: 'Quick Create', items: filteredCreate });

        let flat = 0;
        return raw.map(s => ({
            ...s,
            items: s.items.map(item => ({ ...item, flatIdx: flat++ })),
        }));
    }, [q, activeFilter, recentActions, dataResults, filteredNav, filteredCreate]);

    const allItems = useMemo(() => sections.flatMap(s => s.items), [sections]);

    /* ── Filter tab counts ────────────────────────────────── */
    const filterCounts = useMemo(() => ({
        'All': allItems.length,
        'Pages': filteredNav.length,
        'Create': filteredCreate.length,
        'Data': dataResults.length,
    }), [allItems.length, filteredNav.length, filteredCreate.length, dataResults.length]);

    /* ── Clamp selected ───────────────────────────────────── */
    useEffect(() => {
        if (allItems.length > 0 && selected >= allItems.length)
            setSelected(allItems.length - 1);
    }, [allItems.length, selected]);

    /* ── Scroll into view ─────────────────────────────────── */
    useEffect(() => {
        resultsRef.current
            ?.querySelector(`[data-idx="${selected}"]`)
            ?.scrollIntoView({ block: 'nearest' });
    }, [selected]);

    /* ── Execute + push to recent ─────────────────────────── */
    const exec = useCallback((action, item) => {
        action();
        // Only persist nav and create items to recent
        if (item && item.category !== 'data' && item.category !== 'recent') {
            const entry = {
                label: item.label,
                sub: item.sub,
                route: item.route ?? '',
                state: item.state ?? null,
            };
            setRecent(prev => {
                const next = [entry, ...prev.filter(r => r.label !== entry.label)]
                    .slice(0, MAX_RECENT);
                saveRecent(next);
                return next;
            });
        }
        closePalette();
        setQuery('');
    }, [closePalette]);

    /* ── Keyboard navigation ──────────────────────────────── */
    const handleKey = useCallback(e => {
        if (allItems.length === 0) return;
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelected(s => (s + 1) % allItems.length);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelected(s => (s - 1 + allItems.length) % allItems.length);
                break;
            case 'Tab':
                e.preventDefault();
                setSelected(s => e.shiftKey
                    ? (s - 1 + allItems.length) % allItems.length
                    : (s + 1) % allItems.length
                );
                break;
            case 'Enter': {
                e.preventDefault();
                const item = allItems[selected];
                if (item) exec(item.action, item);
                break;
            }
        }
    }, [allItems, selected, exec]);

    if (!open) return null;

    return (
        <div
            className="cp-overlay"
            role="presentation"
            onClick={e => e.target === e.currentTarget && closePalette()}
        >
            <div
                className="cp-box"
                role="dialog"
                aria-modal="true"
                aria-label="Command palette"
                onClick={e => e.stopPropagation()}
            >
                {/* ── Brand bar ─────────────────────────────── */}
                <div className="cp-brand" aria-hidden="true">
                    <div className="cp-brand-logo"><FleetFlowMark /></div>
                    <span className="cp-brand-name">FleetFlow</span>
                    <div className="cp-brand-divider" />
                    <span className="cp-brand-label">Command Palette</span>
                    {!q && recent.length > 0 && (
                        <button
                            className="cp-clear-recent"
                            onClick={() => { setRecent([]); saveRecent([]); }}
                            aria-label="Clear recent history"
                        >
                            Clear recent
                        </button>
                    )}
                </div>

                {/* ── Input ─────────────────────────────────── */}
                <div className="cp-input-wrap">
                    <Search
                        size={16} color="var(--text-muted)"
                        strokeWidth={2} aria-hidden="true"
                        style={{ flexShrink: 0 }}
                    />
                    <input
                        ref={inputRef}
                        id="cp-input"
                        role="combobox"
                        aria-expanded={allItems.length > 0}
                        aria-controls="cp-results"
                        aria-activedescendant={
                            allItems.length > 0 ? `cp-item-${selected}` : undefined
                        }
                        aria-autocomplete="list"
                        className="cp-input"
                        placeholder="Search pages, vehicles, trips, drivers…"
                        value={query}
                        onChange={e => { setQuery(e.target.value); setSelected(0); }}
                        onKeyDown={handleKey}
                        autoComplete="off"
                        spellCheck={false}
                    />
                    {query ? (
                        <button
                            className="cp-clear-btn"
                            aria-label="Clear search"
                            onClick={() => {
                                setQuery('');
                                setSelected(0);
                                inputRef.current?.focus();
                            }}
                        >
                            <X size={12} strokeWidth={2.5} />
                        </button>
                    ) : (
                        <span className="cp-esc-hint" aria-hidden="true">ESC</span>
                    )}
                </div>

                {/* ── Filter tabs ───────────────────────────── */}
                <div className="cp-filters" role="tablist" aria-label="Filter results">
                    {FILTERS.map(f => (
                        <button
                            key={f}
                            role="tab"
                            aria-selected={activeFilter === f}
                            className={`cp-filter-tab ${activeFilter === f ? 'active' : ''}`}
                            onClick={() => { setActiveFilter(f); setSelected(0); }}
                        >
                            {f}
                            {filterCounts[f] > 0 && (
                                <span className="cp-filter-count">{filterCounts[f]}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Results ───────────────────────────────── */}
                <div
                    id="cp-results"
                    ref={resultsRef}
                    className="cp-results"
                    role="listbox"
                    aria-label="Search results"
                >
                    {allItems.length === 0 ? (
                        <div role="status" className="cp-empty">
                            <div className="cp-empty-icon">
                                {query ? '🔍' : '⚡'}
                            </div>
                            {query ? (
                                <>
                                    No results for "<strong>{query}</strong>"
                                    <div className="cp-empty-hint">
                                        Try a page name, vehicle, driver name, or trip reference
                                    </div>
                                </>
                            ) : (
                                <>
                                    Start typing to search
                                    <div className="cp-empty-hint">
                                        Try "dispatch", "Ahmedabad", or a driver name
                                    </div>
                                </>
                            )}
                        </div>
                    ) : sections.map(section => (
                        <div
                            key={section.title}
                            role="group"
                            aria-label={section.title}
                        >
                            <div className="cp-section" aria-hidden="true">
                                {section.title === 'Recent' && (
                                    <Clock size={9} strokeWidth={2.5} />
                                )}
                                {section.title}
                            </div>
                            {section.items.map((item, ii) => (
                                <div
                                    key={`${section.title}-${item.flatIdx}`}
                                    id={`cp-item-${item.flatIdx}`}
                                    data-idx={item.flatIdx}
                                    role="option"
                                    aria-selected={item.flatIdx === selected}
                                    className="cp-item"
                                    style={{ animationDelay: `${ii * 25}ms` }}
                                    onMouseEnter={() => setSelected(item.flatIdx)}
                                    onClick={() => exec(item.action, item)}
                                >
                                    <IconBubble
                                        icon={item.Icon}
                                        color={item.color}
                                        isActive={item.isActive}
                                    />
                                    <div className="cp-item-text">
                                        <div className="cp-item-label">
                                            <span className="cp-item-label-text">
                                                <Highlight text={item.label} query={q} />
                                            </span>
                                            {item.isActive && (
                                                <span className="cp-badge cp-badge-current">
                                                    Current
                                                </span>
                                            )}
                                            {item.isRecent && (
                                                <span className="cp-badge cp-badge-recent">
                                                    Recent
                                                </span>
                                            )}
                                        </div>
                                        {item.sub && (
                                            <div className="cp-item-sub">
                                                {item.statusColor && (
                                                    <span
                                                        className="cp-status-dot"
                                                        style={{ background: item.statusColor }}
                                                    />
                                                )}
                                                <Highlight text={item.sub} query={q} />
                                            </div>
                                        )}
                                    </div>
                                    <ChevronRight
                                        size={13}
                                        strokeWidth={2.5}
                                        className="cp-item-arrow"
                                        aria-hidden="true"
                                    />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                {/* ── Footer ────────────────────────────────── */}
                <div className="cp-footer" aria-hidden="true">
                    <span className="cp-footer-hint"><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
                    <span className="cp-footer-hint"><kbd>↵</kbd> Open</span>
                    <span className="cp-footer-hint"><kbd>Esc</kbd> Close</span>
                    <span className="cp-result-count">
                        {allItems.length > 0
                            ? `${allItems.length} result${allItems.length !== 1 ? 's' : ''}`
                            : ''
                        }
                    </span>
                </div>
            </div>
        </div>
    );
}
