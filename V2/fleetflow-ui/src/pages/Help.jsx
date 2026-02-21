import { useState, useMemo } from 'react';
import AnimatedList from '../components/AnimatedList';
import { useFleet } from '../context/FleetContext';
import { useNavigate } from 'react-router-dom';

/* ─── Data ────────────────────────────────────────────────── */
const ROLE_CONTENT = {
    fleet_manager:    { color: '#238bfa', emoji: '🛡️', title: 'Fleet Manager',    tagline: 'Full control — vehicles, drivers, trips, maintenance & analytics.' },
    dispatcher:       { color: '#16a34a', emoji: '📦', title: 'Dispatcher',        tagline: 'Create & dispatch trips, assign drivers, log fuel costs.' },
    safety_officer:   { color: '#d97706', emoji: '🔍', title: 'Safety Officer',    tagline: 'Monitor driver compliance, license expiry & safety scores.' },
    financial_analyst:{ color: '#9333ea', emoji: '📊', title: 'Financial Analyst', tagline: 'Analyze costs, ROI, fuel spend and export reports.' },
};

const FEATURES = [
    {
        icon: '⚡', name: 'Command Center', path: '/dashboard',
        desc: 'Your real-time mission control. See fleet utilization, active trips, upcoming maintenance and total fuel spend at a glance.',
        tips: ['Cards update as you add data across the app.', 'Utilization = On Trip vehicles ÷ total active vehicles.'],
        roles: ['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst'],
    },
    {
        icon: '🚛', name: 'Vehicles', path: '/vehicles',
        desc: 'Full CRUD for your fleet assets. Filter by type (truck / van / bike), region and status. Retiring a vehicle soft-deletes it.',
        tips: ['Status auto-changes to "On Trip" or "In Shop" — you cannot override this manually.', 'Filter pills stack — combine type + region.'],
        roles: ['fleet_manager'],
    },
    {
        icon: '👤', name: 'Drivers', path: '/drivers',
        desc: 'Driver profiles with license tracking. Drivers with expired or near-expired licenses are flagged with a warning badge.',
        tips: ['Suspended drivers cannot be assigned to trips.', 'Safety scores are set manually during driver registration.'],
        roles: ['fleet_manager', 'safety_officer'],
    },
    {
        icon: '🗺️', name: 'Trips', path: '/trips',
        desc: 'Kanban-style board: Draft → Dispatched → Completed / Cancelled. Business rules are enforced server-side.',
        tips: ['Dispatch locks both the vehicle AND the driver until the trip ends.', 'Cargo weight is validated against vehicle max capacity.'],
        roles: ['fleet_manager', 'dispatcher'],
    },
    {
        icon: '🔧', name: 'Maintenance', path: '/maintenance',
        desc: 'Log service records. When a new maintenance entry is created, the vehicle is automatically set to "In Shop".',
        tips: ['Completing maintenance reverts the vehicle to Available or On Trip.', 'Use Scheduled status to plan future services.'],
        roles: ['fleet_manager', 'safety_officer'],
    },
    {
        icon: '⛽', name: 'Fuel & Expenses', path: '/fuel',
        desc: 'Per-vehicle fuel tracking. Cost per litre is calculated automatically from total cost ÷ litres filled.',
        tips: ['Optionally link a fuel log to a specific trip for per-trip cost breakdowns.', 'Bulk fuel data feeds into Analytics efficiency charts.'],
        roles: ['fleet_manager', 'dispatcher', 'financial_analyst'],
    },
    {
        icon: '📊', name: 'Analytics', path: '/analytics',
        desc: 'Aggregated insights: fleet efficiency (km/L), ROI per vehicle, driver performance scores, and cost breakdowns.',
        tips: ['Use the Export buttons to download CSV reports.', 'Driver performance is ranked by trips completed × safety score.'],
        roles: ['fleet_manager', 'financial_analyst'],
    },
];

const NOTIFICATIONS = [
    { icon: '💡', color: '#238bfa', name: 'Trip Dispatch',      time: 'auto',     desc: "Dispatching a trip locks the vehicle & driver — they're unavailable until the trip ends." },
    { icon: '⚠️', color: '#d97706', name: 'License Check',      time: 'enforced', desc: 'Drivers with expired or suspended status are blocked from all trip assignments.' },
    { icon: '🔧', color: '#16a34a', name: 'Auto In Shop',       time: 'instant',  desc: 'Adding a maintenance record immediately moves the vehicle to "In Shop" status.' },
    { icon: '📊', color: '#9333ea', name: 'CSV Export',         time: 'anytime',  desc: 'Download fuel, maintenance or trip data as CSV from the Analytics page.' },
    { icon: '📦', color: '#f43f5e', name: 'Cargo Validation',   time: 'server',   desc: "Trips exceeding the vehicle's max capacity are rejected by the server." },
    { icon: '🔍', color: '#0ea5e9', name: 'Status Filters',     time: 'tip',      desc: 'Use filter pills on Vehicles and Drivers pages to narrow results by status or type.' },
    { icon: '🌗', color: '#64748b', name: 'Theme Toggle',       time: 'sidebar',  desc: 'Switch between dark and light mode anytime using the button at the top of the sidebar.' },
];

const FAQS = [
    {
        q: "Why can't I dispatch a trip?",
        a: 'Check that the driver is "Off Duty" (not suspended or on another trip), the vehicle is "Available", and the driver\'s license has not expired. The server will return the exact failure reason.',
        tag: 'trips',
    },
    {
        q: 'The vehicle is stuck on "In Shop" — how do I fix it?',
        a: 'Go to Maintenance → find the active record for that vehicle → click "Complete". The vehicle status will revert automatically.',
        tag: 'vehicles',
    },
    {
        q: 'How do I export data?',
        a: 'Go to Analytics → scroll to the top-right. There are separate Export CSV and Export PDF buttons for your data.',
        tag: 'analytics',
    },
    {
        q: 'Can I change my role after registering?',
        a: 'Not from the UI currently — ask your Fleet Manager to update your role in the system.',
        tag: 'account',
    },
    {
        q: 'What does "Retired" vehicle status mean?',
        a: '"Retired" is a soft delete — the vehicle is hidden from active lists but its historical trip and fuel data is preserved in reports.',
        tag: 'vehicles',
    },
    {
        q: 'Why is a driver showing "Expired" status?',
        a: "The driver's license_expiry date has passed. Update the expiry date in the driver's profile to restore their active status.",
        tag: 'drivers',
    },
    {
        q: 'How is ROI calculated?',
        a: 'ROI = (Trip Revenue − Fuel Cost − Maintenance Cost) ÷ Acquisition Cost × 100%. Set acquisition_cost when adding a vehicle to enable ROI tracking.',
        tag: 'analytics',
    },
];

const CHECKLIST = [
    { id: 'vehicle', icon: '🚛', label: 'Add your first vehicle' },
    { id: 'driver',  icon: '👤', label: 'Register a driver' },
    { id: 'trip',    icon: '🗺️', label: 'Create & dispatch a trip' },
    { id: 'fuel',    icon: '⛽', label: 'Log a fuel entry' },
    { id: 'maint',   icon: '🔧', label: 'Add a maintenance record' },
    { id: 'analytics', icon: '📊', label: 'Review Analytics & Reports' },
];

/* ─── Sub-components ──────────────────────────────────────── */
function NotifCard({ icon, color, name, time, desc }) {
    return (
        <figure style={{
            display: 'flex', alignItems: 'center', gap: 14, margin: 0,
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${color}30`,
            borderLeft: `3px solid ${color}`,
            borderRadius: 14, padding: '13px 16px',
            boxShadow: `0 4px 16px rgba(0,0,0,0.12), inset 0 0 0 1px ${color}08`,
            cursor: 'default', transition: 'box-shadow 0.25s ease, transform 0.25s ease',
        }}
            onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.015)';
                e.currentTarget.style.boxShadow = `0 8px 28px rgba(0,0,0,0.2), 0 0 0 1px ${color}40`;
            }}
            onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = `0 4px 16px rgba(0,0,0,0.12), inset 0 0 0 1px ${color}08`;
            }}
        >
            <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                    position: 'absolute', inset: -4, borderRadius: 14,
                    background: color, opacity: 0.15, filter: 'blur(8px)', pointerEvents: 'none',
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
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{name}</span>
                    <span style={{
                        fontSize: 9, fontWeight: 600, color,
                        letterSpacing: '0.08em',
                        background: `${color}18`,
                        border: `1px solid ${color}30`,
                        padding: '1px 6px', borderRadius: 99,
                        textTransform: 'uppercase',
                    }}>
                        {time}
                    </span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{desc}</p>
            </div>
        </figure>
    );
}

function SectionHeader({ id, title }) {
    return (
        <h2 id={id} style={{
            fontSize: 15, fontWeight: 700, color: 'var(--text-primary)',
            marginBottom: 16, paddingBottom: 10,
            borderBottom: '1px solid var(--glass-border)',
            display: 'flex', alignItems: 'center', gap: 8,
            scrollMarginTop: 20,
        }}>
            {title}
        </h2>
    );
}

function TagPill({ tag }) {
    const TAG_COLORS = {
        trips:     '#3b82f6', vehicles: '#22c55e', drivers: '#f59e0b',
        analytics: '#a855f7', account:  '#64748b', fuel:    '#0ea5e9',
    };
    const color = TAG_COLORS[tag] ?? '#64748b';
    return (
        <span style={{
            fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.07em', padding: '2px 7px', borderRadius: 99,
            background: `${color}18`, color, border: `1px solid ${color}30`,
        }}>
            {tag}
        </span>
    );
}

/* ─── Main Component ──────────────────────────────────────── */
export default function Help({ user }) {
    const roleInfo = ROLE_CONTENT[user?.role] ?? ROLE_CONTENT.dispatcher;
    const navigate = useNavigate();
    const [openFaq, setOpenFaq]           = useState(null);
    const [activeFeature, setActiveFeature] = useState(null);
    const [search, setSearch]             = useState('');
    const [previewRole, setPreviewRole]   = useState(null);
    const [checked, setChecked]           = useState(() => {
        try { return JSON.parse(localStorage.getItem('ff-checklist') || '[]'); }
        catch { return []; }
    });

    const displayRole = ROLE_CONTENT[previewRole] ?? roleInfo;

    /* ── Search filtering ─────────────────────────────────── */
    const filteredFeatures = useMemo(() => {
        if (!search) return FEATURES;
        const q = search.toLowerCase();
        return FEATURES.filter(f =>
            f.name.toLowerCase().includes(q) ||
            f.desc.toLowerCase().includes(q) ||
            f.tips.some(t => t.toLowerCase().includes(q))
        );
    }, [search]);

    const filteredFaqs = useMemo(() => {
        if (!search) return FAQS;
        const q = search.toLowerCase();
        return FAQS.filter(f =>
            f.q.toLowerCase().includes(q) ||
            f.a.toLowerCase().includes(q) ||
            f.tag.includes(q)
        );
    }, [search]);

    /* ── Checklist toggle ─────────────────────────────────── */
    const toggleCheck = id => {
        const next = checked.includes(id)
            ? checked.filter(c => c !== id)
            : [...checked, id];
        setChecked(next);
        localStorage.setItem('ff-checklist', JSON.stringify(next));
    };
    const checkPct = Math.round((checked.length / CHECKLIST.length) * 100);

    return (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 4px 48px' }} className="fade-in">

            {/* ── Hero banner ───────────────────────────────── */}
            <div style={{
                background: `linear-gradient(135deg, ${displayRole.color}18 0%, transparent 65%)`,
                border: `1px solid ${displayRole.color}35`,
                borderRadius: 18, padding: '28px 32px', marginBottom: 28,
                position: 'relative', overflow: 'hidden',
                transition: 'all 0.35s ease',
            }}>
                {/* Background glow */}
                <div style={{
                    position: 'absolute', top: -30, right: -30,
                    width: 160, height: 160, borderRadius: '50%',
                    background: displayRole.color, opacity: 0.07,
                    filter: 'blur(40px)', pointerEvents: 'none',
                }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, position: 'relative' }}>
                    <div style={{ fontSize: 52, lineHeight: 1, flexShrink: 0 }}>{displayRole.emoji}</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 21, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 5, fontFamily: 'var(--font-heading)' }}>
                            Help &amp; Resource Centre
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                            Logged in as{' '}
                            <strong style={{ color: displayRole.color }}>{displayRole.title}</strong>
                            {' '}— {displayRole.tagline}
                        </div>
                        {/* Role preview pills */}
                        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                            {Object.entries(ROLE_CONTENT).map(([key, r]) => (
                                <button
                                    key={key}
                                    onClick={() => setPreviewRole(previewRole === key ? null : key)}
                                    style={{
                                        fontSize: 11, fontWeight: 600,
                                        padding: '4px 12px', borderRadius: 999,
                                        background: previewRole === key || (!previewRole && key === user?.role)
                                            ? `${r.color}25` : 'rgba(255,255,255,0.04)',
                                        color: previewRole === key || (!previewRole && key === user?.role)
                                            ? r.color : 'var(--text-muted)',
                                        border: `1px solid ${previewRole === key || (!previewRole && key === user?.role)
                                            ? r.color + '50' : 'var(--glass-border)'}`,
                                        cursor: 'pointer', transition: 'all 0.2s',
                                    }}
                                >
                                    {r.emoji} {r.title}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Search bar ────────────────────────────────── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--glass-border)',
                borderRadius: 12, padding: '10px 16px', marginBottom: 28,
                transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
                onFocus={e => {
                    e.currentTarget.style.borderColor = roleInfo.color;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${roleInfo.color}18`;
                }}
                onBlur={e => {
                    e.currentTarget.style.borderColor = 'var(--glass-border)';
                    e.currentTarget.style.boxShadow = 'none';
                }}
            >
                <span style={{ fontSize: 16, flexShrink: 0 }}>🔍</span>
                <input
                    style={{
                        flex: 1, background: 'none', border: 'none', outline: 'none',
                        fontSize: 14, color: 'var(--text-primary)',
                        fontFamily: 'var(--font-body)',
                    }}
                    placeholder="Search features, tips, FAQs…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                {search && (
                    <button
                        onClick={() => setSearch('')}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--text-muted)', fontSize: 16, lineHeight: 1, padding: 0,
                        }}
                    >
                        ×
                    </button>
                )}
            </div>

            {/* ── Quick Jump nav ────────────────────────────── */}
            {!search && (
                <div style={{
                    display: 'flex', gap: 8, flexWrap: 'wrap',
                    marginBottom: 32,
                }}>
                    {[
                        { href: '#tips',      label: '⚡ Tips'     },
                        { href: '#checklist', label: '✅ Checklist' },
                        { href: '#features',  label: '🗺 Features'  },
                        { href: '#faq',       label: '❓ FAQ'       },
                        { href: '#support',   label: '💬 Support'   },
                    ].map(({ href, label }) => (
                        <a
                            key={href}
                            href={href}
                            style={{
                                fontSize: 12, fontWeight: 600,
                                padding: '5px 14px', borderRadius: 999,
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--text-secondary)',
                                textDecoration: 'none',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.color = roleInfo.color;
                                e.currentTarget.style.borderColor = `${roleInfo.color}50`;
                                e.currentTarget.style.background = `${roleInfo.color}10`;
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.color = 'var(--text-secondary)';
                                e.currentTarget.style.borderColor = 'var(--glass-border)';
                                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                            }}
                        >
                            {label}
                        </a>
                    ))}
                </div>
            )}

            {/* ── Live Tips ─────────────────────────────────── */}
            {!search && (
                <section style={{ marginBottom: 40 }} id="tips">
                    <SectionHeader id="tips" title="⚡ Quick Tips" />
                    <AnimatedList delay={1800} loop visible={4}>
                        {NOTIFICATIONS.map((n, i) => <NotifCard key={i} {...n} />)}
                    </AnimatedList>
                </section>
            )}

            {/* ── Getting Started Checklist ─────────────────── */}
            {!search && (
                <section style={{ marginBottom: 40 }} id="checklist">
                    <SectionHeader id="checklist" title="✅ Getting Started" />
                    <div style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 14, padding: '20px 22px',
                    }}>
                        {/* Progress bar */}
                        <div style={{ marginBottom: 18 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, fontSize: 12 }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    Setup Progress
                                </span>
                                <span style={{
                                    fontWeight: 700,
                                    color: checkPct === 100 ? 'var(--green-t)' : roleInfo.color,
                                }}>
                                    {checkPct}% {checkPct === 100 ? '🎉' : ''}
                                </span>
                            </div>
                            <div style={{
                                height: 6, background: 'rgba(255,255,255,0.06)',
                                borderRadius: 999, overflow: 'hidden',
                            }}>
                                <div style={{
                                    width: `${checkPct}%`, height: '100%', borderRadius: 999,
                                    background: checkPct === 100
                                        ? 'var(--green-t)'
                                        : `linear-gradient(90deg, ${roleInfo.color}, ${roleInfo.color}aa)`,
                                    boxShadow: `0 0 8px ${roleInfo.color}60`,
                                    transition: 'width 0.5s ease',
                                }} />
                            </div>
                        </div>
                        {/* Items */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {CHECKLIST.map(item => {
                                const done = checked.includes(item.id);
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => toggleCheck(item.id)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 12,
                                            padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
                                            background: done ? `${roleInfo.color}0c` : 'rgba(255,255,255,0.02)',
                                            border: `1px solid ${done ? roleInfo.color + '30' : 'var(--glass-border)'}`,
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={e => !done && (e.currentTarget.style.background = 'var(--bg-hover)')}
                                        onMouseLeave={e => !done && (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                                    >
                                        <div style={{
                                            width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                                            border: `2px solid ${done ? roleInfo.color : 'var(--text-muted)'}`,
                                            background: done ? roleInfo.color : 'transparent',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'all 0.2s',
                                        }}>
                                            {done && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>}
                                        </div>
                                        <span style={{ fontSize: 16 }}>{item.icon}</span>
                                        <span style={{
                                            fontSize: 13, fontWeight: 500,
                                            color: done ? 'var(--text-muted)' : 'var(--text-primary)',
                                            textDecoration: done ? 'line-through' : 'none',
                                            transition: 'all 0.2s',
                                        }}>
                                            {item.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            {/* ── Feature Guide ─────────────────────────────── */}
            <section style={{ marginBottom: 40 }} id="features">
                <SectionHeader id="features" title="🗺️ Feature Guide" />
                {search && filteredFeatures.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                        No features match "{search}"
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {filteredFeatures.map((f, i) => {
                            const isOpen = activeFeature === i;
                            const isRoleFeature = f.roles.includes(user?.role ?? 'dispatcher');
                            return (
                                <div
                                    key={f.path}
                                    onClick={() => setActiveFeature(isOpen ? null : i)}
                                    style={{
                                        background: 'rgba(255,255,255,0.02)',
                                        border: `1px solid ${isOpen ? displayRole.color + '55' : 'var(--glass-border)'}`,
                                        borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                                        transition: 'all 0.22s ease',
                                        boxShadow: isOpen ? `0 0 0 1px ${displayRole.color}18` : 'none',
                                    }}
                                    onMouseEnter={e => !isOpen && (e.currentTarget.style.background = 'var(--bg-hover)')}
                                    onMouseLeave={e => !isOpen && (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                                            background: isOpen
                                                ? `linear-gradient(135deg, ${displayRole.color}30, ${displayRole.color}15)`
                                                : 'rgba(255,255,255,0.05)',
                                            border: `1px solid ${isOpen ? displayRole.color + '40' : 'var(--glass-border)'}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 20, transition: 'all 0.2s',
                                        }}>
                                            {f.icon}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                                                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                                                    {f.name}
                                                </span>
                                                {isRoleFeature && (
                                                    <span style={{
                                                        fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
                                                        background: `${displayRole.color}20`, color: displayRole.color,
                                                        border: `1px solid ${displayRole.color}35`,
                                                        textTransform: 'uppercase', letterSpacing: '0.07em',
                                                    }}>
                                                        your role
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                                {f.desc}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                                            <span style={{
                                                color: isOpen ? displayRole.color : 'var(--text-muted)',
                                                fontSize: 11, transition: 'transform 0.2s, color 0.2s',
                                                transform: isOpen ? 'rotate(180deg)' : 'none',
                                                display: 'inline-block',
                                            }}>
                                                ▼
                                            </span>
                                        </div>
                                    </div>

                                    {/* Expanded tips */}
                                    {isOpen && (
                                        <div style={{
                                            marginTop: 14, paddingTop: 14,
                                            borderTop: `1px solid ${displayRole.color}25`,
                                            animation: 'fadeIn 0.2s ease',
                                        }}>
                                            <div style={{
                                                fontSize: 10, fontWeight: 700,
                                                color: 'var(--text-muted)',
                                                textTransform: 'uppercase', letterSpacing: '0.7px',
                                                marginBottom: 10,
                                            }}>
                                                Tips
                                            </div>
                                            {f.tips.map((tip, j) => (
                                                <div key={j} style={{
                                                    display: 'flex', gap: 10, alignItems: 'flex-start',
                                                    marginBottom: j < f.tips.length - 1 ? 8 : 0,
                                                    padding: '7px 10px',
                                                    background: `${displayRole.color}08`,
                                                    borderRadius: 8,
                                                    border: `1px solid ${displayRole.color}15`,
                                                }}>
                                                    <span style={{ color: displayRole.color, fontWeight: 700, flexShrink: 0, lineHeight: 1.6 }}>→</span>
                                                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{tip}</span>
                                                </div>
                                            ))}
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                style={{ marginTop: 12 }}
                                                onClick={e => { e.stopPropagation(); navigate(f.path); }}
                                            >
                                                Open {f.name} →
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* ── FAQ ───────────────────────────────────────── */}
            <section style={{ marginBottom: 40 }} id="faq">
                <SectionHeader id="faq" title="❓ Frequently Asked Questions" />
                {search && filteredFaqs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                        No FAQs match "{search}"
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {filteredFaqs.map((faq, i) => {
                            const isOpen = openFaq === i;
                            return (
                                <div
                                    key={i}
                                    style={{
                                        background: 'rgba(255,255,255,0.02)',
                                        border: `1px solid ${isOpen ? displayRole.color + '45' : 'var(--glass-border)'}`,
                                        borderRadius: 11, overflow: 'hidden',
                                        transition: 'border-color 0.2s',
                                    }}
                                >
                                    <button
                                        onClick={() => setOpenFaq(isOpen ? null : i)}
                                        style={{
                                            width: '100%', padding: '12px 16px',
                                            background: 'none', border: 'none',
                                            display: 'flex', alignItems: 'center',
                                            justifyContent: 'space-between',
                                            cursor: 'pointer', textAlign: 'left', gap: 12,
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                                                {faq.q}
                                            </span>
                                            <TagPill tag={faq.tag} />
                                        </div>
                                        <span style={{
                                            color: isOpen ? displayRole.color : 'var(--text-muted)',
                                            fontSize: 18, flexShrink: 0,
                                            transition: 'transform 0.22s, color 0.2s',
                                            transform: isOpen ? 'rotate(45deg)' : 'none',
                                            display: 'inline-block', lineHeight: 1,
                                        }}>
                                            +
                                        </span>
                                    </button>
                                    {isOpen && (
                                        <div style={{
                                            padding: '0 16px 16px',
                                            fontSize: 13, color: 'var(--text-secondary)',
                                            lineHeight: 1.7,
                                            borderTop: `1px solid ${displayRole.color}20`,
                                            animation: 'fadeIn 0.2s ease',
                                        }}>
                                            <div style={{
                                                marginTop: 12, padding: '10px 14px',
                                                background: `${displayRole.color}08`,
                                                borderRadius: 8,
                                                border: `1px solid ${displayRole.color}15`,
                                            }}>
                                                {faq.a}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* ── Support callout ───────────────────────────── */}
            <div
                id="support"
                style={{
                    background: `linear-gradient(135deg, ${roleInfo.color}10, rgba(255,255,255,0.02))`,
                    border: `1px solid ${roleInfo.color}30`,
                    borderRadius: 14, padding: '20px 24px',
                    display: 'flex', alignItems: 'center', gap: 18,
                }}
            >
                <div style={{
                    width: 52, height: 52, flexShrink: 0,
                    borderRadius: 14,
                    background: `linear-gradient(135deg, ${roleInfo.color}50, ${roleInfo.color}25)`,
                    border: `1px solid ${roleInfo.color}40`,
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 26,
                }}>
                    💬
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 5 }}>
                        Still stuck?
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                        Re-open the interactive onboarding tour from the{' '}
                        <strong style={{ color: 'var(--text-secondary)' }}>❓ Help &amp; Feature Guide</strong>
                        {' '}button in the sidebar — it walks through your role, feature map and all tips step by step.
                    </div>
                </div>
                <button
                    className="btn btn-secondary btn-sm"
                    style={{ flexShrink: 0 }}
                    onClick={() => navigate('/dashboard')}
                >
                    Go to Dashboard
                </button>
            </div>
        </div>
    );
}
