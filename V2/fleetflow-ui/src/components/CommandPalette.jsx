import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFleet } from '../context/FleetContext';

/* ─── CSS injected once ───────────────────────────────────── */
const CSS = `
.cp-overlay {
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(0,0,0,0.55);
    backdrop-filter: blur(6px);
    display: flex; align-items: flex-start; justify-content: center;
    padding-top: clamp(60px, 12vh, 140px);
    animation: fadeIn 0.15s ease;
}
.cp-box {
    width: 600px; max-width: calc(100vw - 32px);
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 16px;
    box-shadow: 0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05);
    overflow: hidden;
    animation: fadeInScale 0.2s ease;
    display: flex; flex-direction: column;
}
.cp-input-wrap {
    display: flex; align-items: center; gap: 10;
    padding: 14px 18px;
    border-bottom: 1px solid var(--border);
}
.cp-icon { font-size: 18px; opacity: 0.6; flex-shrink: 0; }
.cp-input {
    flex: 1; background: none; border: none; outline: none;
    font-size: 16px; font-family: var(--font-sans);
    color: var(--text-primary);
    caret-color: var(--accent);
}
.cp-input::placeholder { color: var(--text-muted); }
.cp-results {
    max-height: 380px; overflow-y: auto; padding: 8px 0;
}
.cp-section {
    font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;
    color: var(--text-muted); padding: 10px 18px 4px;
}
.cp-item {
    display: flex; align-items: center; gap: 12;
    padding: 10px 18px;
    cursor: pointer;
    transition: background 0.1s ease;
    border-radius: 0;
}
.cp-item:hover, .cp-item.selected {
    background: var(--bg-hover);
}
.cp-item-icon { font-size: 18px; width: 28px; text-align: center; flex-shrink: 0; }
.cp-item-label { flex: 1; font-size: 14px; font-weight: 500; color: var(--text-primary); }
.cp-item-sub { font-size: 12px; color: var(--text-muted); }
.cp-item-kbd {
    font-size: 10px; font-family: var(--font-mono, monospace);
    background: var(--bg-hover); border: 1px solid var(--border);
    border-radius: 4px; padding: 2px 6px; color: var(--text-muted);
}
.cp-footer {
    display: flex; gap: 16; padding: 10px 18px;
    border-top: 1px solid var(--border);
    font-size: 11px; color: var(--text-muted);
}
.cp-footer kbd {
    background: var(--bg-hover); border: 1px solid var(--border);
    border-radius: 3px; padding: 1px 5px; font-size: 10px;
    margin: 0 2px;
}
`;

function injectCSS(id, css) {
    if (typeof document === 'undefined' || document.getElementById(id)) return;
    const el = document.createElement('style');
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
}

/* ─── main component ──────────────────────────────────────── */
export default function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(0);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    const { vehicles, drivers, trips } = useFleet();

    injectCSS('ff-cp-styles', CSS);

    /* ── Global open/close keybinding (Ctrl+K / Cmd+K) ──── */
    useEffect(() => {
        const handler = e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setOpen(o => !o);
                setQuery('');
                setSelected(0);
            }
            if (e.key === 'Escape' && open) {
                setOpen(false);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open]);

    // Expose open method globally for FAB
    useEffect(() => {
        window.__ffOpenCommandPalette = () => { setOpen(true); setQuery(''); setSelected(0); };
        return () => { delete window.__ffOpenCommandPalette; };
    }, []);

    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 30);
    }, [open]);

    /* ── Static nav actions ─────────────────────────────── */
    const navActions = [
        { icon: '🖥️', label: 'Go to Dashboard', sub: 'Overview & KPIs', action: () => navigate('/') },
        { icon: '🚛', label: 'Go to Trips', sub: 'Dispatcher & Kanban', action: () => navigate('/trips') },
        { icon: '🚗', label: 'Go to Vehicles', sub: 'Fleet Registry', action: () => navigate('/vehicles') },
        { icon: '👤', label: 'Go to Drivers', sub: 'Driver Profiles', action: () => navigate('/drivers') },
        { icon: '📊', label: 'Go to Analytics', sub: 'ROI & Performance', action: () => navigate('/analytics') },
        { icon: '🔧', label: 'Go to Maintenance', sub: 'Service Records', action: () => navigate('/maintenance') },
        { icon: '⛽', label: 'Go to Fuel Logs', sub: 'Fuel & Expense', action: () => navigate('/fuel') },
        { icon: '❓', label: 'Go to Help', sub: 'Tips & FAQ', action: () => navigate('/help') },
    ];

    const createActions = [
        { icon: '➕', label: 'New Trip', action: () => navigate('/trips', { state: { openCreate: true } }) },
        { icon: '🚛', label: 'Add Vehicle', action: () => navigate('/vehicles', { state: { openCreate: true } }) },
        { icon: '👤', label: 'Add Driver', action: () => navigate('/drivers', { state: { openCreate: true } }) },
    ];

    /* ── Dynamic search results from data ──────────────── */
    const q = query.toLowerCase().trim();
    const dataResults = [];
    if (q.length >= 2) {
        vehicles.filter(v => v.name?.toLowerCase().includes(q)).slice(0, 3).forEach(v =>
            dataResults.push({ icon: '🚗', label: v.name, sub: `${v.status} · ${v.licensePlate ?? v.license_plate}`, action: () => navigate('/vehicles') })
        );
        drivers.filter(d => d.name?.toLowerCase().includes(q)).slice(0, 3).forEach(d =>
            dataResults.push({ icon: '👤', label: d.name, sub: d.status, action: () => navigate('/drivers') })
        );
        trips.filter(t => t.reference?.toLowerCase().includes(q) || t.origin?.toLowerCase().includes(q) || t.destination?.toLowerCase().includes(q)).slice(0, 3).forEach(t =>
            dataResults.push({ icon: '🚛', label: t.reference, sub: `${t.origin} → ${t.destination} · ${t.state}`, action: () => navigate('/trips') })
        );
    }

    /* ── Filtered action lists ──────────────────────────── */
    const filteredNav = !q ? navActions : navActions.filter(a => a.label.toLowerCase().includes(q) || a.sub.toLowerCase().includes(q));
    const filteredCreate = !q ? createActions : createActions.filter(a => a.label.toLowerCase().includes(q));

    const sections = [
        ...(dataResults.length ? [{ title: 'Results', items: dataResults }] : []),
        ...(filteredNav.length ? [{ title: 'Navigate', items: filteredNav }] : []),
        ...(filteredCreate.length ? [{ title: 'Quick Create', items: filteredCreate }] : []),
    ];

    const allItems = sections.flatMap(s => s.items);

    /* ── Keyboard navigation ─────────────────────────────── */
    const handleKey = e => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => (s + 1) % allItems.length); }
        if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => (s - 1 + allItems.length) % allItems.length); }
        if (e.key === 'Enter') {
            e.preventDefault();
            const item = allItems[selected];
            if (item) { item.action(); setOpen(false); setQuery(''); }
        }
    };

    const exec = useCallback((action) => {
        action();
        setOpen(false);
        setQuery('');
    }, []);

    if (!open) return null;

    let itemIndex = 0;

    return (
        <div className="cp-overlay" onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
            <div className="cp-box" onClick={e => e.stopPropagation()}>
                <div className="cp-input-wrap">
                    <span className="cp-icon">🔍</span>
                    <input
                        ref={inputRef}
                        className="cp-input"
                        placeholder="Search pages, vehicles, trips, drivers…"
                        value={query}
                        onChange={e => { setQuery(e.target.value); setSelected(0); }}
                        onKeyDown={handleKey}
                    />
                    {query && (
                        <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)', padding: '0 4px' }}>×</button>
                    )}
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap' }}>ESC to close</span>
                </div>

                <div className="cp-results">
                    {allItems.length === 0 ? (
                        <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                            No results for "<strong>{query}</strong>"
                        </div>
                    ) : sections.map(section => (
                        <div key={section.title}>
                            <div className="cp-section">{section.title}</div>
                            {section.items.map(item => {
                                const idx = itemIndex++;
                                return (
                                    <div
                                        key={`${section.title}-${idx}`}
                                        className={`cp-item ${idx === selected ? 'selected' : ''}`}
                                        onMouseEnter={() => setSelected(idx)}
                                        onClick={() => exec(item.action)}
                                    >
                                        <span className="cp-item-icon">{item.icon}</span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div className="cp-item-label">{item.label}</div>
                                            {item.sub && <div className="cp-item-sub">{item.sub}</div>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>

                <div className="cp-footer">
                    <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
                    <span><kbd>Enter</kbd> Open</span>
                    <span><kbd>Esc</kbd> Close</span>
                    <span style={{ marginLeft: 'auto' }}><kbd>Ctrl+K</kbd> Toggle</span>
                </div>
            </div>
        </div>
    );
}
