import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    ArrowLeft, ArrowRight, Rocket, X,
    Shield, Package, Search, BarChart3,
    Truck, Wrench, Fuel, AlertTriangle,
    CheckCircle2, Info, Lightbulb, Map,
    History, Award, Navigation, LifeBuoy,
    Droplet, ClipboardList, Gauge, Zap,
    User
} from 'lucide-react';
import AnimatedList from './AnimatedList';

/* ─── Constants ───────────────────────────────────────────── */
const STYLE_ID = 'ff-welcome-styles';
const SKIP_KEY = 'ff-welcome-skip';

/* ─── CSS ─────────────────────────────────────────────────── */
const CSS = `
@keyframes ff-wm-backdrop-in  { from { opacity: 0; }                              to { opacity: 1; } }
@keyframes ff-wm-modal-in     { from { opacity: 0; transform: scale(0.94) translateY(12px); } to { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes ff-wm-slide-left   { from { opacity: 0; transform: translateX(32px);  } to { opacity: 1; transform: translateX(0); } }
@keyframes ff-wm-slide-right  { from { opacity: 0; transform: translateX(-32px); } to { opacity: 1; transform: translateX(0); } }

/* ── Backdrop ──────────────────────────────────────────────── */
.ff-wm-backdrop {
    position: fixed; inset: 0; z-index: 9998;
    background: rgba(0,0,0,0.72);
    backdrop-filter: blur(5px);
    display: flex; align-items: center; justify-content: center;
    padding: 16px;
    animation: ff-wm-backdrop-in 0.22s ease both;
}

/* ── Modal shell ───────────────────────────────────────────── */
.ff-wm {
    background: var(--bg-card);
    border: 1px solid var(--glass-border);
    border-radius: 18px;
    width: 100%; max-width: 560px;
    box-shadow: 0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset;
    overflow: hidden;
    animation: ff-wm-modal-in 0.3s cubic-bezier(0.16,1,0.3,1) both;
    display: flex; flex-direction: column;
    max-height: calc(100vh - 32px);
}

/* ── Accent bar ────────────────────────────────────────────── */
.ff-wm-accent {
    height: 3px;
    transition: background 0.3s ease;
}

/* ── Header ────────────────────────────────────────────────── */
.ff-wm-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    padding: 20px 22px 14px;
    border-bottom: 1px solid var(--glass-border);
    flex-shrink: 0;
}
.ff-wm-header-text { flex: 1; }
.ff-wm-title {
    font-size: 16px; font-weight: 800; color: var(--text-primary);
    font-family: var(--font-heading); letter-spacing: -0.02em;
    line-height: 1.3;
}
.ff-wm-subtitle {
    font-size: 12px; color: var(--text-muted); margin-top: 2px;
}
.ff-wm-close {
    width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: none; border: none; cursor: pointer;
    color: var(--text-muted); margin-top: -2px; margin-left: 8px;
    transition: background 0.12s ease, color 0.12s ease;
}
.ff-wm-close:hover  { background: rgba(239,68,68,0.1); color: #ef4444; }
.ff-wm-close:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

/* ── Step tabs ─────────────────────────────────────────────── */
.ff-wm-tabs {
    display: flex; gap: 6px;
    padding: 14px 22px 0;
    flex-shrink: 0;
}
.ff-wm-tab {
    flex: 1; padding: 7px 4px;
    border: 1px solid var(--glass-border); border-radius: 8px;
    font-size: 11px; font-weight: 700; cursor: pointer;
    font-family: var(--font-body); letter-spacing: 0.02em;
    transition: background 0.18s ease, color 0.18s ease,
                border-color 0.18s ease, box-shadow 0.18s ease;
    background: var(--bg-hover); color: var(--text-muted);
}
.ff-wm-tab.active {
    color: #fff;
    box-shadow: 0 2px 12px var(--ff-wm-tab-glow, rgba(59,130,246,0.4));
}
.ff-wm-tab:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

/* ── Step number bubble on tab ─────────────────────────────── */
.ff-wm-tab-num {
    display: inline-flex; align-items: center; justify-content: center;
    width: 15px; height: 15px; border-radius: 50%; font-size: 9px;
    background: rgba(255,255,255,0.2); margin-right: 5px; font-weight: 800;
}

/* ── Content area ──────────────────────────────────────────── */
.ff-wm-body {
    padding: 20px 22px 0;
    overflow-y: auto; flex: 1;
    scrollbar-width: thin; scrollbar-color: var(--border) transparent;
}
.ff-wm-body::-webkit-scrollbar       { width: 3px; }
.ff-wm-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

/* ── Step content wrapper ──────────────────────────────────── */
.ff-wm-step { padding-bottom: 20px; }
.ff-wm-step.slide-left  { animation: ff-wm-slide-left  0.22s cubic-bezier(0.16,1,0.3,1) both; }
.ff-wm-step.slide-right { animation: ff-wm-slide-right 0.22s cubic-bezier(0.16,1,0.3,1) both; }

/* ── Step 0: role hero ─────────────────────────────────────── */
.ff-wm-role-hero { text-align: center; margin-bottom: 18px; }
.ff-wm-role-emoji {
    font-size: 48px; line-height: 1; margin-bottom: 8px;
    filter: drop-shadow(0 4px 12px var(--ff-wm-role-glow, rgba(59,130,246,0.4)));
}
.ff-wm-role-name {
    font-size: 16px; font-weight: 800; font-family: var(--font-heading);
    letter-spacing: -0.02em; margin-bottom: 4px;
}
.ff-wm-role-tagline { font-size: 12.5px; color: var(--text-secondary); }

/* ── Step 1: feature map intro ────────────────────────────── */
.ff-wm-intro { font-size: 12px; color: var(--text-secondary); margin-bottom: 14px; text-align: center; }

/* ── AnimCard ──────────────────────────────────────────────── */
.ff-wm-card {
    display: flex; align-items: center; gap: 14;
    margin: 0; padding: 13px 16px;
    border-radius: 13px;
    cursor: default;
    transition: box-shadow 0.22s ease, transform 0.22s ease;
}
.ff-wm-card:hover { transform: translateY(-1px); }
.ff-wm-card-icon-wrap { position: relative; flex-shrink: 0; }
.ff-wm-card-glow {
    position: absolute; inset: -4px; border-radius: 14px;
    opacity: 0.22; filter: blur(8px); pointer-events: none;
}
.ff-wm-card-icon {
    width: 42px; height: 42px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-size: 19px; position: relative;
}
.ff-wm-card-body { flex: 1; min-width: 0; }
.ff-wm-card-top  { display: flex; align-items: center; gap: 8; margin-bottom: 3px; }
.ff-wm-card-name { font-weight: 700; font-size: 13px; color: var(--text-primary); letter-spacing: 0.01em; }
.ff-wm-card-chip {
    font-size: 9px; font-weight: 700; letter-spacing: 0.08em;
    padding: 1px 6px; border-radius: 99px; text-transform: uppercase;
    flex-shrink: 0;
}
.ff-wm-card-desc { margin: 0; font-size: 12px; color: var(--text-secondary); line-height: 1.5; }

/* ── Footer ────────────────────────────────────────────────── */
.ff-wm-footer {
    padding: 14px 22px;
    border-top: 1px solid var(--glass-border);
    display: flex; align-items: center; gap: 12;
    background: var(--bg-surface);
    flex-shrink: 0;
}
.ff-wm-back {
    padding: 8px 14px; border: 1px solid var(--glass-border);
    border-radius: 9px; background: none;
    color: var(--text-secondary); cursor: pointer;
    font-size: 13px; font-weight: 600; font-family: var(--font-body);
    display: flex; align-items: center; gap: 6;
    transition: background 0.12s ease, opacity 0.12s ease;
}
.ff-wm-back:hover   { background: var(--bg-hover); }
.ff-wm-back:disabled { opacity: 0.35; cursor: default; pointer-events: none; }
.ff-wm-back:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

/* ── Progress dots ─────────────────────────────────────────── */
.ff-wm-dots { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6; }
.ff-wm-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--border);
    transition: width 0.22s ease, background 0.22s ease, border-radius 0.22s ease;
}
.ff-wm-dot.active {
    width: 20px; border-radius: 3px;
}

/* ── Next / CTA button ─────────────────────────────────────── */
.ff-wm-next {
    padding: 8px 16px; border: none; border-radius: 9px;
    color: #fff; cursor: pointer; font-weight: 700;
    font-size: 13px; font-family: var(--font-body);
    display: flex; align-items: center; gap: 6;
    transition: filter 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}
.ff-wm-next:hover  { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 4px 14px var(--ff-wm-btn-glow, rgba(59,130,246,0.4)); }
.ff-wm-next:active { transform: translateY(0); filter: brightness(0.95); }
.ff-wm-next:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

/* ── "Don't show again" ────────────────────────────────────── */
.ff-wm-skip-row {
    display: flex; align-items: center; gap: 7;
    padding: 0 22px 12px;
    flex-shrink: 0;
}
.ff-wm-skip-cb { width: 14px; height: 14px; accent-color: var(--accent); cursor: pointer; }
.ff-wm-skip-lbl { font-size: 11px; color: var(--text-muted); cursor: pointer; user-select: none; }

/* ── Mobile ────────────────────────────────────────────────── */
@media (max-width: 480px) {
    .ff-wm-tab-num { display: none; }
    .ff-wm-card    { gap: 10px; padding: 10px 12px; }
    .ff-wm-card-icon { width: 36px; height: 36px; font-size: 16px; }
}

/* ── Reduced motion ────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
    .ff-wm-backdrop, .ff-wm, .ff-wm-step { animation: none !important; }
    .ff-wm-card, .ff-wm-next, .ff-wm-dot { transition: none !important; }
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

/* ─── Role content ─────────────────────────────────────────── */
const ROLE_CONTENT = {
    fleet_manager: {
        color: '#3b82f6', Icon: Shield, title: 'Fleet Manager',
        tagline: 'You have full control over everything.',
        powers: [
            { Icon: Truck, text: 'Add, edit and retire vehicles' },
            { Icon: User, text: 'Register and manage drivers' },
            { Icon: Package, text: 'Create and dispatch trips' },
            { Icon: Wrench, text: 'Schedule and complete maintenance' },
            { Icon: BarChart3, text: 'View all analytics and export reports' },
        ],
    },
    dispatcher: {
        color: '#22c55e', Icon: Package, title: 'Dispatcher',
        tagline: 'You orchestrate the flow of deliveries.',
        powers: [
            { Icon: Rocket, text: 'Create new trips and assign drivers & vehicles' },
            { Icon: Gauge, text: 'Dispatch trips (sets vehicle + driver to On Duty)' },
            { Icon: CheckCircle2, text: 'Mark trips as completed or cancelled' },
            { Icon: Droplet, text: 'Log fuel entries for vehicles' },
            { Icon: Map, text: 'Monitor real-time fleet status on the Dashboard' },
        ],
    },
    safety_officer: {
        color: '#f59e0b', Icon: Search, title: 'Safety Officer',
        tagline: 'You keep the fleet compliant and safe.',
        powers: [
            { Icon: ClipboardList, text: 'Register and update driver profiles' },
            { Icon: AlertTriangle, text: 'Monitor license expiry warnings' },
            { Icon: Award, text: 'View driver safety scores and trip history' },
            { Icon: Search, text: 'Supervise driver compliance on the Drivers page' },
            { Icon: BarChart3, text: 'Review analytics for performance trends' },
        ],
    },
    financial_analyst: {
        color: '#a855f7', Icon: BarChart3, title: 'Financial Analyst',
        tagline: 'You track every cost the fleet incurs.',
        powers: [
            { Icon: Droplet, text: 'Analyze fuel spend and efficiency (km/L)' },
            { Icon: Wrench, text: 'Monitor maintenance costs per vehicle' },
            { Icon: BarChart3, text: 'View ROI reports for each fleet asset' },
            { Icon: Rocket, text: 'Export CSV reports (fuel / maintenance / trips)' },
            { Icon: History, text: 'Track operational costs on the Analytics page' },
        ],
    },
};

/* ─── Static data ─────────────────────────────────────────── */
const FEATURES = [
    { Icon: Map, color: '#3b82f6', name: 'Command Center', time: '/dashboard', desc: 'Live KPIs — fleet utilization, active trips, maintenance count, fuel spend.' },
    { Icon: Truck, color: '#22c55e', name: 'Vehicles', time: '/vehicles', desc: 'Manage your fleet assets. Filter by type, region and status.' },
    { Icon: User, color: '#f59e0b', name: 'Drivers', time: '/drivers', desc: 'Driver profiles with license expiry warnings and safety scores.' },
    { Icon: Package, color: '#f43f5e', name: 'Trips', time: '/trips', desc: 'Kanban board — draft → dispatch → complete. Server validates all rules.' },
    { Icon: Wrench, color: '#0ea5e9', name: 'Maintenance', time: '/maintenance', desc: 'Log service records. Vehicle auto-moves to In Shop when logged.' },
    { Icon: Fuel, color: '#eab308', name: 'Fuel Logs', time: '/fuel', desc: 'Per-vehicle fuel tracking with auto cost-per-litre calculation.' },
    { Icon: BarChart3, color: '#a855f7', name: 'Analytics', time: '/analytics', desc: 'Efficiency, ROI per vehicle, driver performance, CSV exports.' },
];

const TIPS = [
    { Icon: Lightbulb, color: '#3b82f6', name: 'Trip Dispatch', time: 'auto', desc: 'Dispatching locks the vehicle & driver until the trip completes.' },
    { Icon: AlertTriangle, color: '#f59e0b', name: 'License Check', time: 'enforced', desc: 'Expired or suspended drivers are blocked from all trip assignments.' },
    { Icon: Wrench, color: '#22c55e', name: 'Auto In Shop', time: 'instant', desc: 'Adding maintenance immediately sets the vehicle to "In Shop" status.' },
    { Icon: Rocket, color: '#a855f7', name: 'CSV Export', time: 'anytime', desc: 'Download fuel, maintenance or trip data as CSV from Analytics.' },
    { Icon: Package, color: '#f43f5e', name: 'Cargo Limit', time: 'server', desc: "Trips exceeding the vehicle's max capacity are rejected by the server." },
    { Icon: Search, color: '#0ea5e9', name: 'Status Filters', time: 'tip', desc: 'Use filter pills on Vehicles & Drivers to narrow by status or type.' },
    { Icon: Zap, color: '#64748b', name: 'Theme Toggle', time: 'sidebar', desc: 'Switch dark / light mode anytime from the sidebar header.' },
];

const STEPS = [
    { label: 'Your Role', key: 'role' },
    { label: 'Feature Map', key: 'features' },
    { label: 'Pro Tips', key: 'tips' },
];

/* ─── AnimCard ────────────────────────────────────────────── */
function AnimCard({ Icon, color, name, time, desc }) {
    return (
        <figure
            className="ff-wm-card"
            style={{
                background: `rgba(255,255,255,0.03)`,
                border: `1px solid ${color}28`,
                borderLeft: `3px solid ${color}`,
                boxShadow: `0 4px 16px rgba(0,0,0,0.12), inset 0 0 0 1px ${color}0c`,
            }}
            onMouseEnter={e => {
                e.currentTarget.style.boxShadow =
                    `0 8px 28px rgba(0,0,0,0.18), 0 0 0 1px ${color}38, inset 0 0 0 1px ${color}10`;
            }}
            onMouseLeave={e => {
                e.currentTarget.style.boxShadow =
                    `0 4px 16px rgba(0,0,0,0.12), inset 0 0 0 1px ${color}0c`;
            }}
        >
            {/* Icon bubble */}
            <div className="ff-wm-card-icon-wrap">
                <div className="ff-wm-card-glow" style={{ background: color }} />
                <div
                    className="ff-wm-card-icon"
                    style={{
                        background: `linear-gradient(135deg, ${color}dd, ${color}88)`,
                        boxShadow: `0 2px 10px ${color}50`,
                        color: 'white',
                    }}
                >
                    <Icon size={20} strokeWidth={2.5} />
                </div>
            </div>

            {/* Text */}
            <div className="ff-wm-card-body">
                <div className="ff-wm-card-top">
                    <span className="ff-wm-card-name">{name}</span>
                    <span
                        className="ff-wm-card-chip"
                        style={{
                            color,
                            background: `${color}18`,
                            border: `1px solid ${color}30`,
                        }}
                    >
                        {time}
                    </span>
                </div>
                <p className="ff-wm-card-desc">{desc}</p>
            </div>
        </figure>
    );
}

/* ─── Main Component ──────────────────────────────────────── */
/**
 * Props:
 *   user     { name: string, role: string }
 *   onClose  fn
 */
export default function WelcomeModal({ user, onClose }) {
    const [step, setStep] = useState(0);
    const [dir, setDir] = useState('left');    // slide direction
    const [animKey, setAnimKey] = useState(0);
    const [skipNext, setSkipNext] = useState(
        () => localStorage.getItem(SKIP_KEY) === 'true'
    );

    const bodyRef = useRef(null);
    const roleInfo = ROLE_CONTENT[user?.role] ?? ROLE_CONTENT.fleet_manager;
    const totalSteps = STEPS.length;

    useEffect(injectStyles, []);

    /* ── Re-trigger list animation + scroll to top on step change */
    useEffect(() => {
        setAnimKey(k => k + 1);
        bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [step]);

    /* ── Keyboard: Escape, ArrowLeft/Right ───────────────────── */
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') { onClose(); return; }
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown')
                goStep(s => Math.min(totalSteps - 1, s + 1), 'left');
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
                goStep(s => Math.max(0, s - 1), 'right');
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    /* ── Navigate with direction tracking ───────────────────── */
    const goStep = useCallback((indexOrFn, direction) => {
        setDir(direction ?? 'left');
        setStep(typeof indexOrFn === 'function' ? indexOrFn : () => indexOrFn);
    }, []);

    const goNext = () => {
        if (step < totalSteps - 1) goStep(step + 1, 'left');
    };
    const goBack = () => {
        if (step > 0) goStep(step - 1, 'right');
    };

    /* ── Handle "Don't show again" ───────────────────────────── */
    const handleSkipToggle = (e) => {
        const checked = e.target.checked;
        setSkipNext(checked);
        localStorage.setItem(SKIP_KEY, String(checked));
    };

    /* ── Close handler ───────────────────────────────────────── */
    const handleClose = () => onClose();

    /* ── Step slide class ────────────────────────────────────── */
    const slideClass = `ff-wm-step ${dir === 'left' ? 'slide-left' : 'slide-right'}`;

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div
            className="ff-wm-backdrop"
            onClick={e => e.target === e.currentTarget && handleClose()}
            role="dialog"
            aria-modal="true"
            aria-label="Welcome to FleetFlow"
        >
            <div className="ff-wm">

                {/* ── Role-colored accent bar ─────────────────── */}
                <div
                    className="ff-wm-accent"
                    style={{ background: `linear-gradient(90deg, ${roleInfo.color}, ${roleInfo.color}88)` }}
                />

                {/* ── Header ──────────────────────────────────── */}
                <div className="ff-wm-header">
                    <div className="ff-wm-header-text">
                        <div className="ff-wm-title">
                            Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ' to FleetFlow'}!
                        </div>
                        <div className="ff-wm-subtitle">
                            Get up to speed in {totalSteps} quick steps · Use ← → to navigate
                        </div>
                    </div>
                    <button
                        className="ff-wm-close"
                        onClick={handleClose}
                        aria-label="Close welcome guide"
                    >
                        <X size={15} strokeWidth={2.5} />
                    </button>
                </div>

                {/* ── Step tabs ────────────────────────────────── */}
                <div className="ff-wm-tabs" role="tablist" aria-label="Steps">
                    {STEPS.map((s, i) => (
                        <button
                            key={s.key}
                            className={`ff-wm-tab ${step === i ? 'active' : ''}`}
                            role="tab"
                            aria-selected={step === i}
                            onClick={() => goStep(i, i > step ? 'left' : 'right')}
                            style={{
                                '--ff-wm-tab-glow': `${roleInfo.color}55`,
                                ...(step === i ? { background: roleInfo.color } : {}),
                            }}
                        >
                            <span className="ff-wm-tab-num">{i + 1}</span>
                            {s.label}
                        </button>
                    ))}
                </div>

                {/* ── Body ─────────────────────────────────────── */}
                <div className="ff-wm-body" ref={bodyRef}>

                    {/* Step 0 — Your Role */}
                    {step === 0 && (
                        <div
                            key={`role-${animKey}`}
                            className={slideClass}
                            style={{ '--ff-wm-role-glow': `${roleInfo.color}55` }}
                        >
                            <div className="ff-wm-role-hero">
                                <div
                                    className="ff-wm-role-emoji"
                                    style={{
                                        '--ff-wm-role-glow': `${roleInfo.color}55`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: roleInfo.color
                                    }}
                                >
                                    <roleInfo.Icon size={54} strokeWidth={2} />
                                </div>
                                <div className="ff-wm-role-name" style={{ color: roleInfo.color }}>
                                    {roleInfo.title}
                                </div>
                                <div className="ff-wm-role-tagline">{roleInfo.tagline}</div>
                            </div>
                            <AnimatedList key={`role-list-${animKey}`} delay={700} autoScroll={true}>
                                {roleInfo.powers.map((p, i) => (
                                    <AnimCard
                                        key={i}
                                        Icon={p.Icon}
                                        color={roleInfo.color}
                                        name="You can"
                                        time={`#${i + 1}`}
                                        desc={p.text}
                                    />
                                ))}
                            </AnimatedList>
                        </div>
                    )}

                    {/* Step 1 — Feature Map */}
                    {step === 1 && (
                        <div key={`features-${animKey}`} className={slideClass}>
                            <p className="ff-wm-intro">
                                FleetFlow has 7 sections — here's what each one does:
                            </p>
                            <AnimatedList key={`features-list-${animKey}`} delay={900} autoScroll={true}>
                                {FEATURES.map((f, i) => (
                                    <AnimCard key={i} {...f} />
                                ))}
                            </AnimatedList>
                        </div>
                    )}

                    {/* Step 2 — Pro Tips */}
                    {step === 2 && (
                        <div key={`tips-${animKey}`} className={slideClass}>
                            <p className="ff-wm-intro">
                                Things that will save you time — watch them appear
                            </p>
                            <AnimatedList key={`tips-list-${animKey}`} delay={900} autoScroll={true}>
                                {TIPS.map((t, i) => (
                                    <AnimCard key={i} {...t} />
                                ))}
                            </AnimatedList>
                        </div>
                    )}
                </div>

                {/* ── "Don't show again" row ───────────────────── */}
                <div className="ff-wm-skip-row">
                    <input
                        id="ff-wm-skip"
                        type="checkbox"
                        className="ff-wm-skip-cb"
                        checked={skipNext}
                        onChange={handleSkipToggle}
                    />
                    <label htmlFor="ff-wm-skip" className="ff-wm-skip-lbl">
                        Don't show this again on next login
                    </label>
                </div>

                {/* ── Footer ───────────────────────────────────── */}
                <div className="ff-wm-footer">
                    {/* Back */}
                    <button
                        className="ff-wm-back"
                        onClick={goBack}
                        disabled={step === 0}
                        aria-label="Previous step"
                    >
                        <ArrowLeft size={13} strokeWidth={2.5} />
                        Back
                    </button>

                    {/* Progress dots */}
                    <div className="ff-wm-dots" aria-hidden="true">
                        {STEPS.map((_, i) => (
                            <div
                                key={i}
                                className={`ff-wm-dot ${step === i ? 'active' : ''}`}
                                style={step === i ? { background: roleInfo.color } : {}}
                            />
                        ))}
                    </div>

                    {/* Next / CTA */}
                    {step < totalSteps - 1 ? (
                        <button
                            className="ff-wm-next"
                            onClick={goNext}
                            style={{
                                background: roleInfo.color,
                                '--ff-wm-btn-glow': `${roleInfo.color}55`,
                            }}
                            aria-label="Next step"
                        >
                            Next
                            <ArrowRight size={13} strokeWidth={2.5} />
                        </button>
                    ) : (
                        <button
                            className="ff-wm-next"
                            onClick={handleClose}
                            style={{
                                background: roleInfo.color,
                                '--ff-wm-btn-glow': `${roleInfo.color}55`,
                            }}
                        >
                            Let's Go!
                            <Rocket size={13} strokeWidth={2.5} />
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
