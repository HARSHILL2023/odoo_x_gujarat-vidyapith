import { useState, useEffect } from 'react';
import AnimatedList from './AnimatedList';

const ROLE_CONTENT = {
    fleet_manager: {
        color: '#238bfa', emoji: '🛡️', title: 'Fleet Manager', tagline: 'You have full control over everything.',
        powers: [
            { icon: '🚛', text: 'Add, edit and retire vehicles' },
            { icon: '👤', text: 'Register and manage drivers' },
            { icon: '📦', text: 'Create and dispatch trips' },
            { icon: '🔧', text: 'Schedule and complete maintenance' },
            { icon: '📊', text: 'View all analytics and export reports' },
        ],
    },
    dispatcher: {
        color: '#16a34a', emoji: '📦', title: 'Dispatcher', tagline: 'You orchestrate the flow of deliveries.',
        powers: [
            { icon: '➕', text: 'Create new trips and assign drivers & vehicles' },
            { icon: '🚀', text: 'Dispatch trips (sets vehicle + driver to On Duty)' },
            { icon: '✅', text: 'Mark trips as completed or cancelled' },
            { icon: '⛽', text: 'Log fuel entries for vehicles' },
            { icon: '🏠', text: 'Monitor real-time fleet status on the Dashboard' },
        ],
    },
    safety_officer: {
        color: '#d97706', emoji: '🔍', title: 'Safety Officer', tagline: 'You keep the fleet compliant and safe.',
        powers: [
            { icon: '📝', text: 'Register and update driver profiles' },
            { icon: '⚠️', text: 'Monitor license expiry warnings' },
            { icon: '⭐', text: 'View driver safety scores and trip history' },
            { icon: '🔍', text: 'Supervise driver compliance on the Drivers page' },
            { icon: '📊', text: 'Review analytics for performance trends' },
        ],
    },
    financial_analyst: {
        color: '#9333ea', emoji: '📊', title: 'Financial Analyst', tagline: 'You track every cost the fleet incurs.',
        powers: [
            { icon: '⛽', text: 'Analyze fuel spend and efficiency (km/L)' },
            { icon: '🔧', text: 'Monitor maintenance costs per vehicle' },
            { icon: '💰', text: 'View ROI reports for each fleet asset' },
            { icon: '📥', text: 'Export CSV reports (fuel / maintenance / trips)' },
            { icon: '📈', text: 'Track operational costs on the Analytics page' },
        ],
    },
};

const FEATURES = [
    { icon: '🏠', color: '#238bfa', name: 'Command Center', time: '/dashboard', desc: 'Live KPIs — fleet utilization, active trips, maintenance count, fuel spend.' },
    { icon: '🚗', color: '#16a34a', name: 'Vehicles', time: '/vehicles', desc: 'Manage your fleet assets. Filter by type, region and status.' },
    { icon: '👤', color: '#d97706', name: 'Drivers', time: '/drivers', desc: 'Driver profiles with license expiry warnings and safety scores.' },
    { icon: '📦', color: '#f43f5e', name: 'Trips', time: '/trips', desc: 'Kanban board — draft → dispatch → complete. Server validates all rules.' },
    { icon: '🔧', color: '#0ea5e9', name: 'Maintenance', time: '/maintenance', desc: 'Log service records. Vehicle auto-moves to In Shop when logged.' },
    { icon: '⛽', color: '#eab308', name: 'Fuel Logs', time: '/fuel', desc: 'Per-vehicle fuel tracking with auto cost-per-litre calculation.' },
    { icon: '📊', color: '#9333ea', name: 'Analytics', time: '/analytics', desc: 'Efficiency, ROI per vehicle, driver performance, CSV exports.' },
];

const TIPS = [
    { icon: '💡', color: '#238bfa', name: 'Trip Dispatch', time: 'auto', desc: 'Dispatching locks the vehicle & driver until the trip completes.' },
    { icon: '⚠️', color: '#d97706', name: 'License Check', time: 'enforced', desc: 'Expired or suspended drivers are blocked from all trip assignments.' },
    { icon: '🔧', color: '#16a34a', name: 'Auto In Shop', time: 'instant', desc: 'Adding maintenance immediately sets the vehicle to "In Shop" status.' },
    { icon: '📊', color: '#9333ea', name: 'CSV Export', time: 'anytime', desc: 'Download fuel, maintenance or trip data as CSV from Analytics.' },
    { icon: '📦', color: '#f43f5e', name: 'Cargo Limit', time: 'server', desc: 'Trips exceeding the vehicle\'s max capacity are rejected by the server.' },
    { icon: '🔍', color: '#0ea5e9', name: 'Status Filters', time: 'tip', desc: 'Use filter pills on Vehicles & Drivers to narrow by status or type.' },
    { icon: '🌗', color: '#64748b', name: 'Theme Toggle', time: 'sidebar', desc: 'Switch dark / light mode anytime from the sidebar.' },
];

// Premium notification card — glassmorphism + icon glow + tinted border
function AnimCard({ icon, color, name, time, desc, index }) {
    return (
        <figure style={{
            display: 'flex', alignItems: 'center', gap: 14, margin: 0,
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${color}30`,
            borderLeft: `3px solid ${color}`,
            borderRadius: 14, padding: '13px 16px',
            boxShadow: `0 4px 16px rgba(0,0,0,0.15), inset 0 0 0 1px ${color}10`,
            cursor: 'default',
            transition: 'box-shadow 0.25s ease, transform 0.25s ease',
        }}
            onMouseEnter={e => {
                e.currentTarget.style.boxShadow = `0 8px 28px rgba(0,0,0,0.22), 0 0 0 1px ${color}40, inset 0 0 0 1px ${color}15`;
            }}
            onMouseLeave={e => {
                e.currentTarget.style.boxShadow = `0 4px 16px rgba(0,0,0,0.15), inset 0 0 0 1px ${color}10`;
            }}
        >
            {/* Icon bubble with glow */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                    position: 'absolute', inset: -4, borderRadius: 14,
                    background: color, opacity: 0.2, filter: 'blur(8px)',
                    pointerEvents: 'none',
                }} />
                <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: `linear-gradient(135deg, ${color}dd, ${color}88)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 19, position: 'relative',
                    boxShadow: `0 2px 8px ${color}50`,
                }}>
                    {icon}
                </div>
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', letterSpacing: '0.01em' }}>{name}</span>
                    <span style={{
                        fontSize: 9, fontWeight: 600, color: color, letterSpacing: '0.08em',
                        background: `${color}18`, border: `1px solid ${color}30`,
                        padding: '1px 6px', borderRadius: 99, textTransform: 'uppercase',
                    }}>{time}</span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{desc}</p>
            </div>
        </figure>
    );
}


const STEPS = ['Your Role', 'Feature Map', 'Tips'];

export default function WelcomeModal({ user, onClose }) {
    const [step, setStep] = useState(0);
    const [animKey, setAnimKey] = useState(0); // increment to re-trigger AnimatedList

    const roleInfo = ROLE_CONTENT[user?.role] || ROLE_CONTENT.dispatcher;

    // Re-play animation every time user switches step
    useEffect(() => { setAnimKey(k => k + 1); }, [step]);

    const goStep = (i) => { setStep(i); };

    return (
        <div
            style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 540, boxShadow: '0 24px 64px rgba(0,0,0,0.5)', overflow: 'hidden' }}>

                {/* Header */}
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
                            👋 Welcome to FleetFlow{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                            Get up to speed in 3 quick steps.
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-muted)', padding: 4 }}>✕</button>
                </div>

                {/* Step tabs */}
                <div style={{ display: 'flex', gap: 8, padding: '12px 24px 0' }}>
                    {STEPS.map((s, i) => (
                        <button key={s} onClick={() => goStep(i)} style={{
                            flex: 1, padding: '6px 0', border: 'none', borderRadius: 6,
                            fontSize: 11, fontWeight: 600, cursor: 'pointer',
                            background: step === i ? roleInfo.color : 'var(--bg-hover)',
                            color: step === i ? '#fff' : 'var(--text-muted)',
                            transition: 'all 0.2s',
                        }}>{s}</button>
                    ))}
                </div>

                {/* Content — scrollable */}
                <div style={{ padding: 24, maxHeight: 400, overflowY: 'auto', position: 'relative' }}>

                    {/* ── Step 0: Your Role ── */}
                    {step === 0 && (
                        <>
                            <div style={{ textAlign: 'center', marginBottom: 16 }}>
                                <div style={{ fontSize: 44, marginBottom: 6 }}>{roleInfo.emoji}</div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: roleInfo.color, marginBottom: 3 }}>{roleInfo.title}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{roleInfo.tagline}</div>
                            </div>
                            <AnimatedList key={`role-${animKey}`} delay={350}>
                                {roleInfo.powers.map((p, i) => (
                                    <AnimCard
                                        key={i}
                                        icon={p.icon}
                                        color={roleInfo.color}
                                        name="You can"
                                        time={`#${i + 1}`}
                                        desc={p.text}
                                    />
                                ))}
                            </AnimatedList>
                        </>
                    )}

                    {/* ── Step 1: Feature Map ── */}
                    {step === 1 && (
                        <>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14, textAlign: 'center' }}>
                                FleetFlow has 7 sections — here's what each one does:
                            </div>
                            <AnimatedList key={`features-${animKey}`} delay={500}>
                                {FEATURES.map((f, i) => (
                                    <AnimCard key={i} icon={f.icon} color={f.color} name={f.name} time={f.time} desc={f.desc} />
                                ))}
                            </AnimatedList>
                        </>
                    )}

                    {/* ── Step 2: Tips ── */}
                    {step === 2 && (
                        <>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14, textAlign: 'center' }}>
                                Things that will save you time — watch them appear ✨
                            </div>
                            <AnimatedList key={`tips-${animKey}`} delay={500}>
                                {TIPS.map((t, i) => (
                                    <AnimCard key={i} {...t} />
                                ))}
                            </AnimatedList>
                        </>
                    )}

                    {/* Bottom fade — sits below all content, never overlaps */}
                    <div style={{ height: 16 }} />
                </div>

                {/* Footer */}
                <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)' }}>
                    <button
                        onClick={() => goStep(s => Math.max(0, s - 1))}
                        disabled={step === 0}
                        style={{ padding: '8px 18px', border: '1px solid var(--border)', borderRadius: 8, background: 'none', color: 'var(--text-secondary)', cursor: step === 0 ? 'default' : 'pointer', fontSize: 13, opacity: step === 0 ? 0.4 : 1 }}
                    >← Back</button>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{step + 1} / {STEPS.length}</span>
                    {step < STEPS.length - 1 ? (
                        <button onClick={() => goStep(s => s + 1)} style={{ padding: '8px 18px', border: 'none', borderRadius: 8, background: roleInfo.color, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                            Next →
                        </button>
                    ) : (
                        <button onClick={onClose} style={{ padding: '8px 18px', border: 'none', borderRadius: 8, background: roleInfo.color, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                            Let's Go! 🚀
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
