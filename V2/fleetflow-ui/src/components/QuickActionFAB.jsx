import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Command, HelpCircle, Plus, Route,
    Truck, UserPlus, X,
} from 'lucide-react';

/* ─── Constants ───────────────────────────────────────────── */
const STYLE_ID     = 'ff-fab-styles';
const EXIT_MS      = 200;
const EXIT_STAGGER = 28;
const ACTIONS_LEN  = 5;
const EXIT_TOTAL   = EXIT_MS + (ACTIONS_LEN - 1) * EXIT_STAGGER + 30; // ~342ms

/* ─── Static actions (module level) ──────────────────────── */
const ACTIONS = [
    {
        Icon: Command,    label: 'Command Palette',
        color: '#0ea5e9', bg: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
        kbd: 'Ctrl K',
        action: () => window.__ffOpenCommandPalette?.(),
    },
    {
        Icon: Route,      label: 'New Trip',
        color: '#22c55e', bg: 'linear-gradient(135deg, #22c55e, #16a34a)',
        route: '/trips',    state: { openCreate: true },
    },
    {
        Icon: Truck,      label: 'Add Vehicle',
        color: '#f59e0b', bg: 'linear-gradient(135deg, #f59e0b, #d97706)',
        route: '/vehicles', state: { openCreate: true },
    },
    {
        Icon: UserPlus,   label: 'Add Driver',
        color: '#8b5cf6', bg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
        route: '/drivers',  state: { openCreate: true },
    },
    {
        Icon: HelpCircle, label: 'Help & Tips',
        color: '#64748b', bg: 'linear-gradient(135deg, #64748b, #475569)',
        route: '/help',
    },
];

/* ─── CSS ─────────────────────────────────────────────────── */
const CSS = `
/* ── Keyframes ─────────────────────────────────────────────── */
@keyframes fab-item-in {
    0%   { opacity: 0; transform: translateX(16px) scale(0.86); }
    62%  { opacity: 1; transform: translateX(-2px) scale(1.02); }
    100% { opacity: 1; transform: translateX(0)    scale(1);    }
}
@keyframes fab-item-out {
    from { opacity: 1; transform: translateX(0)    scale(1); }
    to   { opacity: 0; transform: translateX(14px) scale(0.9); }
}
@keyframes fab-bd-in   { from { opacity: 0; } to { opacity: 1; } }
@keyframes fab-bd-out  { from { opacity: 1; } to { opacity: 0; } }
@keyframes fab-ring {
    0%   { transform: scale(1);    opacity: 0.65; }
    100% { transform: scale(1.72); opacity: 0;    }
}
@keyframes fab-badge-pop {
    0%   { transform: scale(0);   opacity: 0; }
    65%  { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(1);   opacity: 1; }
}

/* ── Backdrop ─────────────────────────────────────────────── */
.fab-backdrop {
    position: fixed; inset: 0; z-index: 1199;
    animation: fab-bd-in 0.2s ease both;
}
.fab-backdrop.leaving { animation: fab-bd-out 0.22s ease both; }

/* ── Root ─────────────────────────────────────────────────── */
.fab-root {
    position: fixed; bottom: 28px; right: 28px;
    z-index: 1200;
    display: flex; flex-direction: column;
    align-items: flex-end; gap: 10px;
}

/* ── Main FAB button ──────────────────────────────────────── */
.fab-btn {
    position: relative;
    width: 54px; height: 54px; border-radius: 50%;
    background: linear-gradient(135deg, var(--accent, #0ea5e9), #6366f1);
    color: #fff; border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    box-shadow:
        0 6px 22px rgba(14,165,233,0.45),
        0 0 0 4px rgba(14,165,233,0.1);
    transition:
        transform 0.28s cubic-bezier(0.34,1.56,0.64,1),
        box-shadow 0.2s ease,
        background 0.35s ease;
    flex-shrink: 0;
}
.fab-btn:hover {
    transform: scale(1.1);
    box-shadow:
        0 8px 28px rgba(14,165,233,0.55),
        0 0 0 7px rgba(14,165,233,0.15);
}
.fab-btn:focus-visible {
    outline: 2px solid var(--accent, #0ea5e9);
    outline-offset: 4px;
}
.fab-btn.open {
    background: linear-gradient(315deg, var(--accent, #0ea5e9), #6366f1);
    box-shadow:
        0 6px 22px rgba(99,102,241,0.42),
        0 0 0 4px rgba(99,102,241,0.12);
}

/* Attention pulse ring: 3 pulses, then stops */
.fab-pulse-ring {
    position: absolute; inset: 0; border-radius: 50%;
    background: rgba(14,165,233,0.38);
    animation: fab-ring 1.8s ease-out 1.5s 3;
    pointer-events: none;
}
.fab-btn.open .fab-pulse-ring { animation: none; }

/* ── Icon morph (Plus ↔ X) ────────────────────────────────── */
.fab-icon {
    position: absolute;
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.18s ease;
}
.fab-icon-plus  { opacity: 1; transform: rotate(0deg)   scale(1);   }
.fab-icon-x     { opacity: 0; transform: rotate(-90deg) scale(0.55); }
.fab-btn.open .fab-icon-plus { opacity: 0; transform: rotate(90deg) scale(0.55); }
.fab-btn.open .fab-icon-x    { opacity: 1; transform: rotate(0deg)  scale(1);    }

/* ── Notification badge ───────────────────────────────────── */
.fab-badge {
    position: absolute; top: -2px; right: -2px;
    min-width: 18px; height: 18px; border-radius: 9px;
    background: #ef4444;
    border: 2.5px solid var(--bg-page, #0f172a);
    font-size: 9px; font-weight: 800; color: #fff;
    display: flex; align-items: center; justify-content: center;
    padding: 0 4px;
    box-shadow: 0 0 10px rgba(239,68,68,0.5);
    animation: fab-badge-pop 0.3s cubic-bezier(0.16,1,0.3,1) both;
    font-variant-numeric: tabular-nums;
    line-height: 1;
}

/* ── Menu wrapper ─────────────────────────────────────────── */
.fab-menu {
    display: flex; flex-direction: column;
    align-items: flex-end; gap: 8px;
}

/* ── Item row ─────────────────────────────────────────────── */
.fab-item {
    display: flex; align-items: center; gap: 10px;
    cursor: pointer; outline: none;
    border-radius: 999px;
}
.fab-item.entering {
    animation: fab-item-in 0.32s cubic-bezier(0.16,1,0.3,1) both;
}
.fab-item.leaving {
    animation: fab-item-out ${EXIT_MS}ms ease both;
}

/* ── Label chip ───────────────────────────────────────────── */
.fab-label {
    display: flex; align-items: center; gap: 7px;
    padding: 7px 13px;
    background: var(--bg-card);
    border: 1px solid var(--glass-border);
    border-radius: 10px;
    font-size: 12px; font-weight: 600; color: var(--text-primary);
    white-space: nowrap; user-select: none;
    box-shadow:
        0 4px 18px rgba(0,0,0,0.28),
        inset 0 1px 0 rgba(255,255,255,0.05);
    backdrop-filter: blur(10px);
    transition: background 0.15s ease;
}
.fab-item:hover .fab-label,
.fab-item:focus-visible .fab-label { background: var(--bg-hover); }

/* Active route dot */
.fab-label-dot {
    width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
    background: #22c55e;
    box-shadow: 0 0 6px #22c55e80;
}
/* Keyboard hint badge */
.fab-label-kbd {
    font-size: 9.5px; font-family: var(--font-mono, monospace);
    background: var(--bg-hover); border: 1px solid var(--border);
    border-bottom-width: 2px; border-radius: 3px;
    padding: 1px 5px; color: var(--text-muted); flex-shrink: 0;
}

/* ── Circle icon ──────────────────────────────────────────── */
.fab-circle {
    width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.28);
    position: relative; overflow: hidden;
    transition:
        transform 0.22s cubic-bezier(0.34,1.56,0.64,1),
        box-shadow 0.2s ease;
}
.fab-circle::after {
    content: ''; position: absolute; inset: 0; border-radius: 50%;
    background: rgba(255,255,255,0);
    transition: background 0.15s ease;
}
.fab-item:hover .fab-circle {
    transform: scale(1.13);
    box-shadow: 0 6px 20px rgba(0,0,0,0.35);
}
.fab-item:hover .fab-circle::after { background: rgba(255,255,255,0.14); }
.fab-item:focus-visible .fab-circle { outline: 2px solid rgba(255,255,255,0.55); }

/* ── Reduced motion ───────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
    .fab-item.entering, .fab-item.leaving { animation: none !important; opacity: 1; }
    .fab-pulse-ring                        { display: none; }
    .fab-icon                              { transition: none; }
    .fab-badge                             { animation: none; }
    .fab-backdrop, .fab-backdrop.leaving   { animation: none !important; }
    .fab-backdrop.leaving                  { opacity: 0; }
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

/* ─── Component ───────────────────────────────────────────── */
/**
 * Props:
 *   badge  number  — optional red notification count on the FAB (default 0)
 */
export default function QuickActionFAB({ badge = 0 }) {
    const [open,    setOpen]    = useState(false);
    const [leaving, setLeaving] = useState(false);

    const rootRef  = useRef(null);
    const btnRef   = useRef(null);
    const itemRefs = useRef([]);      // indexed array of item DOM nodes
    const timerRef = useRef(null);    // single timer ref — prevents overlapping

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(injectStyles, []);

    /* ── Exit animation trigger ───────────────────────────── */
    const triggerClose = useCallback(() => {
        setLeaving(true);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            setOpen(false);
            setLeaving(false);
        }, EXIT_TOTAL);
    }, []);

    // Cleanup timer on unmount
    useEffect(() => () => clearTimeout(timerRef.current), []);

    /* ── Close on route change ────────────────────────────── */
    useEffect(() => {
        if (open) triggerClose();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    /* ── Click outside ────────────────────────────────────── */
    useEffect(() => {
        if (!open) return;
        const h = e => {
            if (!rootRef.current?.contains(e.target)) triggerClose();
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [open, triggerClose]);

    /* ── Escape key ───────────────────────────────────────── */
    useEffect(() => {
        if (!open) return;
        const h = e => {
            if (e.key === 'Escape') {
                triggerClose();
                setTimeout(() => btnRef.current?.focus(), EXIT_TOTAL);
            }
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [open, triggerClose]);

    /* ── Toggle ───────────────────────────────────────────── */
    const toggleOpen = useCallback(() => {
        if (open) {
            triggerClose();
        } else {
            clearTimeout(timerRef.current);
            setOpen(true);
            setLeaving(false);
        }
    }, [open, triggerClose]);

    /* ── Execute + animate out ────────────────────────────── */
    const exec = useCallback(item => {
        triggerClose();
        // Navigate after exit animation completes
        setTimeout(() => {
            if (item.route) navigate(item.route, { state: item.state ?? {} });
            else item.action?.();
        }, EXIT_TOTAL);
    }, [navigate, triggerClose]);

    /* ── Keyboard: arrow navigation between items ─────────── */
    const handleItemKey = useCallback((e, i) => {
        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                (i === 0 ? btnRef.current : itemRefs.current[i - 1])?.focus();
                break;
            case 'ArrowDown':
                e.preventDefault();
                (i === ACTIONS.length - 1 ? btnRef.current : itemRefs.current[i + 1])?.focus();
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                exec(ACTIONS[i]);
                break;
        }
    }, [exec]);

    /* ── Keyboard: arrow from FAB button ─────────────────── */
    const handleBtnKey = useCallback(e => {
        if (!open) return;
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            itemRefs.current.at(-1)?.focus();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            itemRefs.current[0]?.focus();
        }
    }, [open]);

    /* ── Active route check ───────────────────────────────── */
    const isActive = item => !!item.route && location.pathname === item.route;

    return (
        <>
            {/* Backdrop — subtle, click to close */}
            {open && (
                <div
                    className={`fab-backdrop ${leaving ? 'leaving' : ''}`}
                    onClick={triggerClose}
                    aria-hidden="true"
                />
            )}

            <div
                className="fab-root"
                ref={rootRef}
                role="region"
                aria-label="Quick actions"
            >
                {/* ── Menu ────────────────────────────────── */}
                {open && (
                    <div
                        className="fab-menu"
                        role="menu"
                        aria-orientation="vertical"
                        aria-label="Quick action menu"
                    >
                        {ACTIONS.map((item, i) => {
                            const active = isActive(item);
                            // Enter: bottom-to-top (item closest to FAB first)
                            // Exit:  top-to-bottom (furthest item first)
                            const delay = leaving
                                ? `${i * EXIT_STAGGER}ms`
                                : `${(ACTIONS.length - 1 - i) * 45}ms`;
                            return (
                                <div
                                    key={item.label}
                                    ref={el => { itemRefs.current[i] = el; }}
                                    className={`fab-item ${leaving ? 'leaving' : 'entering'}`}
                                    style={{ animationDelay: delay }}
                                    role="menuitem"
                                    tabIndex={0}
                                    aria-current={active ? 'page' : undefined}
                                    onClick={() => exec(item)}
                                    onKeyDown={e => handleItemKey(e, i)}
                                >
                                    {/* Label chip */}
                                    <div className="fab-label">
                                        {active && (
                                            <span
                                                className="fab-label-dot"
                                                aria-hidden="true"
                                            />
                                        )}
                                        {item.label}
                                        {item.kbd && (
                                            <span
                                                className="fab-label-kbd"
                                                aria-hidden="true"
                                            >
                                                {item.kbd}
                                            </span>
                                        )}
                                    </div>

                                    {/* Colored circle icon */}
                                    <div
                                        className="fab-circle"
                                        style={{ background: item.bg }}
                                        aria-hidden="true"
                                    >
                                        <item.Icon size={15} color="#fff" strokeWidth={2.1} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── Main FAB button ─────────────────────── */}
                <button
                    ref={btnRef}
                    className={`fab-btn ${open ? 'open' : ''}`}
                    onClick={toggleOpen}
                    onKeyDown={handleBtnKey}
                    aria-expanded={open}
                    aria-haspopup="menu"
                    aria-label={open ? 'Close quick actions' : 'Quick actions'}
                >
                    {/* Attention pulse ring — 3× then stops */}
                    <span className="fab-pulse-ring" aria-hidden="true" />

                    {/* Icon morph: Plus ↔ X */}
                    <span className="fab-icon fab-icon-plus" aria-hidden="true">
                        <Plus size={22} strokeWidth={2.5} />
                    </span>
                    <span className="fab-icon fab-icon-x" aria-hidden="true">
                        <X size={20} strokeWidth={2.5} />
                    </span>

                    {/* Notification count badge */}
                    {badge > 0 && !open && (
                        <span
                            className="fab-badge"
                            aria-label={`${badge} pending notification${badge !== 1 ? 's' : ''}`}
                        >
                            {badge > 9 ? '9+' : badge}
                        </span>
                    )}
                </button>
            </div>
        </>
    );
}
