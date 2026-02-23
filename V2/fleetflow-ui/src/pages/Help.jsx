import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimatedList from '../components/AnimatedList';
import {
    Shield, Package, Search, BarChart3,
    Zap, Truck, User, Map, Wrench, Fuel,
    Lightbulb, AlertTriangle, Info, Moon,
    ArrowRight, Check, HelpCircle, MessageSquare,
    ChevronDown, X, Star, FileText, Plus
} from 'lucide-react';

/* ════════════════════════════════════════════════════════════
   STATIC DATA
   ════════════════════════════════════════════════════════════ */
const ROLE_CONTENT = {
    fleet_manager: { color: '#238bfa', Icon: Shield, title: 'Fleet Manager', tagline: 'Full control — vehicles, drivers, trips, maintenance & analytics.' },
    dispatcher: { color: '#16a34a', Icon: Package, title: 'Dispatcher', tagline: 'Create & dispatch trips, assign drivers, log fuel costs.' },
    safety_officer: { color: '#d97706', Icon: Search, title: 'Safety Officer', tagline: 'Monitor driver compliance, license expiry & safety scores.' },
    financial_analyst: { color: '#9333ea', Icon: BarChart3, title: 'Financial Analyst', tagline: 'Analyze costs, ROI, fuel spend and export reports.' },
};

const FEATURES = [
    {
        Icon: Zap, name: 'Command Center', path: '/dashboard',
        desc: 'Your real-time mission control. See fleet utilization, active trips, upcoming maintenance and total fuel spend at a glance.',
        tips: ['Cards update as you add data across the app.', 'Utilization = On Trip vehicles ÷ total active vehicles.'],
        roles: ['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst'],
    },
    {
        Icon: Truck, name: 'Vehicles', path: '/vehicles',
        desc: 'Full CRUD for your fleet assets. Filter by type (truck / van / bike), region and status. Retiring a vehicle soft-deletes it.',
        tips: ['Status auto-changes to "On Trip" or "In Shop" — you cannot override this manually.', 'Filter pills stack — combine type + region.'],
        roles: ['fleet_manager'],
    },
    {
        Icon: User, name: 'Drivers', path: '/drivers',
        desc: 'Driver profiles with license tracking. Drivers with expired or near-expired licenses are flagged with a warning badge.',
        tips: ['Suspended drivers cannot be assigned to trips.', 'Safety scores are set manually during driver registration.'],
        roles: ['fleet_manager', 'safety_officer'],
    },
    {
        Icon: Map, name: 'Trips', path: '/trips',
        desc: 'Kanban-style board: Draft → Dispatched → Completed / Cancelled. Business rules are enforced server-side.',
        tips: ['Dispatch locks both the vehicle AND the driver until the trip ends.', 'Cargo weight is validated against vehicle max capacity.'],
        roles: ['fleet_manager', 'dispatcher'],
    },
    {
        Icon: Wrench, name: 'Maintenance', path: '/maintenance',
        desc: 'Log service records. When a new maintenance entry is created, the vehicle is automatically set to "In Shop".',
        tips: ['Completing maintenance reverts the vehicle to Available or On Trip.', 'Use Scheduled status to plan future services.'],
        roles: ['fleet_manager', 'safety_officer'],
    },
    {
        Icon: Fuel, name: 'Fuel & Expenses', path: '/fuel',
        desc: 'Per-vehicle fuel tracking. Cost per litre is calculated automatically from total cost ÷ litres filled.',
        tips: ['Optionally link a fuel log to a specific trip for per-trip cost breakdowns.', 'Bulk fuel data feeds into Analytics efficiency charts.'],
        roles: ['fleet_manager', 'dispatcher', 'financial_analyst'],
    },
    {
        Icon: BarChart3, name: 'Analytics', path: '/analytics',
        desc: 'Aggregated insights: fleet efficiency (km/L), ROI per vehicle, driver performance scores, and cost breakdowns.',
        tips: ['Use the Export buttons to download CSV reports.', 'Driver performance is ranked by trips completed × safety score.'],
        roles: ['fleet_manager', 'financial_analyst'],
    },
];

const NOTIFICATIONS = [
    { Icon: Lightbulb, color: '#238bfa', name: 'Trip Dispatch', time: 'auto', desc: "Dispatching a trip locks the vehicle & driver — they're unavailable until the trip ends." },
    { Icon: AlertTriangle, color: '#d97706', name: 'License Check', time: 'enforced', desc: 'Drivers with expired or suspended status are blocked from all trip assignments.' },
    { Icon: Wrench, color: '#16a34a', name: 'Auto In Shop', time: 'instant', desc: 'Adding a maintenance record immediately moves the vehicle to "In Shop" status.' },
    { Icon: BarChart3, color: '#9333ea', name: 'CSV Export', time: 'anytime', desc: 'Download fuel, maintenance or trip data as CSV from the Analytics page.' },
    { Icon: Package, color: '#f43f5e', name: 'Cargo Validation', time: 'server', desc: "Trips exceeding the vehicle's max capacity are rejected by the server." },
    { Icon: Search, color: '#0ea5e9', name: 'Status Filters', time: 'tip', desc: 'Use filter pills on Vehicles and Drivers pages to narrow results by status or type.' },
    { Icon: Moon, color: '#64748b', name: 'Theme Toggle', time: 'sidebar', desc: 'Switch between dark and light mode anytime using the button at the top of the sidebar.' },
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
    { id: 'vehicle', Icon: Truck, label: 'Add your first vehicle' },
    { id: 'driver', Icon: User, label: 'Register a driver' },
    { id: 'trip', Icon: Map, label: 'Create & dispatch a trip' },
    { id: 'fuel', Icon: Fuel, label: 'Log a fuel entry' },
    { id: 'maint', Icon: Wrench, label: 'Add a maintenance record' },
    { id: 'analytics', Icon: BarChart3, label: 'Review Analytics & Reports' },
];

const TAG_COLORS = {
    trips: '#3b82f6',
    vehicles: '#22c55e',
    drivers: '#f59e0b',
    analytics: '#a855f7',
    account: '#64748b',
    fuel: '#0ea5e9',
};

const QUICK_LINKS = [
    { href: '#tips', Icon: Zap, label: 'Tips' },
    { href: '#checklist', Icon: Check, label: 'Checklist' },
    { href: '#features', Icon: Map, label: 'Features' },
    { href: '#faq', Icon: HelpCircle, label: 'FAQ' },
    { href: '#support', Icon: MessageSquare, label: 'Support' },
];

/* ════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ════════════════════════════════════════════════════════════ */

/* ── NotifCard ─────────────────────────────────────────────── */
function NotifCard({ Icon: NotifIcon, color, name, time, desc }) {
    return (
        <figure
            className="ff-help-card"
            area-label={`Tip: ${name}. ${desc}`}
            style={{ borderLeftColor: color }}
        >
            <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                    position: 'absolute', inset: -4, borderRadius: 14,
                    background: color, opacity: 0.15, filter: 'blur(8px)', pointerEvents: 'none',
                }} aria-hidden="true" />
                <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: `linear-gradient(135deg, ${color}, ${color}aa)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', boxShadow: `0 4px 12px ${color}40`,
                }}>
                    <NotifIcon size={19} color="#fff" strokeWidth={2.5} aria-hidden="true" />
                </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                        {name}
                    </span>
                    <span style={{
                        fontSize: 9, fontWeight: 700, color,
                        letterSpacing: '0.08em',
                        background: `${color}15`,
                        border: `1px solid ${color}30`,
                        padding: '1px 7px', borderRadius: 99,
                        textTransform: 'uppercase',
                    }}>
                        {time}
                    </span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {desc}
                </p>
            </div>
        </figure>
    );
}

/* ── SectionHeader ─────────────────────────────────────────── */
/* FIX: was rendered with id on both <section> and <h2> → duplicate IDs.
   Now only the h2 gets the id (scroll anchor target). Remove id from <section>. */
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

/* ── TagPill ───────────────────────────────────────────────── */
function TagPill({ tag }) {
    const color = TAG_COLORS[tag] ?? '#64748b';
    return (
        <span style={{
            fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.07em', padding: '2px 7px', borderRadius: 99,
            background: `${color}18`, color, border: `1px solid ${color}30`,
            flexShrink: 0,
        }}>
            {tag}
        </span>
    );
}

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════ */
export default function Help({ user }) {
    const navigate = useNavigate();
    /* useFleet only needed if you derive live data; keep for future use */
    // const { vehicles, drivers } = useFleet();

    const roleInfo = ROLE_CONTENT[user?.role] ?? ROLE_CONTENT.dispatcher;

    const [openFaq, setOpenFaq] = useState(null);
    const [activeFeature, setActiveFeature] = useState(null);
    const [search, setSearch] = useState('');
    const [previewRole, setPreviewRole] = useState(null);
    const [checked, setChecked] = useState(() => {
        try { return JSON.parse(localStorage.getItem('ff-checklist') || '[]'); }
        catch { return []; }
    });

    /* FIX: derive displayRole inside render — memoised so it doesn't re-calc every render */
    const displayRole = useMemo(
        () => ROLE_CONTENT[previewRole] ?? roleInfo,
        [previewRole, roleInfo]
    );

    /* ── Search filters ─────────────────────────────────────── */
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

    /* ── Checklist ──────────────────────────────────────────── */
    /* FIX: use functional setChecked — avoids stale closure */
    const toggleCheck = useCallback((id) => {
        setChecked(prev => {
            const next = prev.includes(id)
                ? prev.filter(c => c !== id)
                : [...prev, id];
            localStorage.setItem('ff-checklist', JSON.stringify(next));
            return next;
        });
    }, []);

    const checkPct = Math.round((checked.length / CHECKLIST.length) * 100);

    /* ── Accordion togglers ─────────────────────────────────── */
    const toggleFaq = useCallback((i) => {
        setOpenFaq(prev => (prev === i ? null : i));
    }, []);

    const toggleFeature = useCallback((i) => {
        setActiveFeature(prev => (prev === i ? null : i));
    }, []);

    const togglePreviewRole = useCallback((key) => {
        setPreviewRole(prev => (prev === key ? null : key));
    }, []);

    /* ════════════════════════════════════════════════════════
       RENDER
       ════════════════════════════════════════════════════════ */
    return (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 4px 48px' }} className="fade-in">

            {/* ── Hero banner ─────────────────────────────── */}
            <div style={{
                background: `linear-gradient(135deg, ${displayRole.color}18 0%, transparent 65%)`,
                border: `1px solid ${displayRole.color}35`,
                borderRadius: 18, padding: '24px', marginBottom: 28,
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
                <div style={{
                    display: 'flex', alignItems: 'flex-start',
                    gap: 20, position: 'relative',
                }}>
                    <div style={{ flexShrink: 0 }}>
                        <displayRole.Icon size={42} strokeWidth={2.5} color={displayRole.color} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{
                            fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12,
                        }}>
                            Logged in as{' '}
                            <strong style={{ color: displayRole.color }}>{displayRole.title}</strong>
                            {' '}— {displayRole.tagline}
                        </div>

                        {/* Role preview pills */}
                        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                            {Object.entries(ROLE_CONTENT).map(([key, r]) => {
                                const isActive = previewRole === key
                                    || (!previewRole && key === user?.role);
                                return (
                                    <button
                                        key={key}
                                        onClick={() => togglePreviewRole(key)}
                                        aria-pressed={isActive}
                                        aria-label={`Preview role: ${r.title}`}
                                        style={{
                                            fontSize: 11, fontWeight: 600,
                                            padding: '4px 12px', borderRadius: 999,
                                            background: isActive ? `${r.color}20` : 'var(--bg-input)',
                                            color: isActive ? r.color : 'var(--text-muted)',
                                            border: `1px solid ${isActive ? r.color + '50' : 'var(--border)'}`,
                                            cursor: 'pointer', transition: 'all 0.2s',
                                        }}
                                    >
                                        <r.Icon size={14} style={{ marginRight: 6 }} aria-hidden="true" /> {r.title}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Search bar ──────────────────────────────── */}
            <div className="help-search-box">
                <Search size={16} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
                <input
                    className="help-search-input"
                    placeholder="Search features, tips, FAQs…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                {search && (
                    <button
                        onClick={() => setSearch('')}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--text-muted)', fontSize: 16,
                            lineHeight: 1, padding: '0 2px',
                            transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                        title="Clear search"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* ── Quick Jump nav ───────────────────────────── */}
            {!search && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
                    {QUICK_LINKS.map(({ href, label, Icon: NavIcon }) => (
                        <a
                            key={href}
                            href={href}
                            className="help-nav-link"
                            onMouseEnter={e => {
                                e.currentTarget.style.color = roleInfo.color;
                                e.currentTarget.style.borderColor = `${roleInfo.color}50`;
                                e.currentTarget.style.background = `${roleInfo.color}10`;
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.color = 'var(--text-secondary)';
                                e.currentTarget.style.borderColor = 'var(--border)';
                                e.currentTarget.style.background = 'var(--bg-input)';
                            }}
                        >
                            <NavIcon size={14} strokeWidth={2.5} /> {label}
                        </a>
                    ))}
                </div>
            )}

            {/* ── Live Tips ───────────────────────────────── */}
            {!search && (
                /* FIX: remove id from section — only SectionHeader h2 carries the anchor id */
                <section style={{ marginBottom: 40 }}>
                    <SectionHeader id="tips" title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Zap size={16} /> Quick Tips</span>} />
                    <AnimatedList delay={1800} loop visible={4}>
                        {NOTIFICATIONS.map((n) => (
                            <NotifCard key={n.name} {...n} />
                        ))}
                    </AnimatedList>
                </section>
            )}

            {/* ── Getting Started Checklist ────────────────── */}
            {!search && (
                <section style={{ marginBottom: 40 }}>
                    <SectionHeader id="checklist" title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Check size={16} /> Getting Started</span>} />
                    <div style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 14, padding: '20px 22px',
                    }}>
                        {/* Progress bar */}
                        <div style={{ marginBottom: 18 }}>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                marginBottom: 7, fontSize: 12,
                            }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    Setup Progress
                                </span>
                                <span style={{
                                    fontWeight: 700,
                                    color: checkPct === 100 ? 'var(--green-t)' : roleInfo.color,
                                }}>
                                    {checkPct}% {checkPct === 100 && <Star size={12} style={{ marginLeft: 4 }} />}
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
                                        role="checkbox"
                                        aria-checked={done}
                                        tabIndex={0}
                                        onKeyDown={e => e.key === 'Enter' && toggleCheck(item.id)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 12,
                                            padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
                                            background: done ? `${roleInfo.color}10` : 'var(--bg-input)',
                                            border: `1px solid ${done ? roleInfo.color + '40' : 'var(--border)'}`,
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={e => {
                                            if (!done) e.currentTarget.style.background = 'var(--bg-hover)';
                                        }}
                                        onMouseLeave={e => {
                                            if (!done) e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                                        }}
                                    >
                                        <div style={{
                                            width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                                            border: `2px solid ${done ? roleInfo.color : 'var(--text-muted)'}`,
                                            background: done ? roleInfo.color : 'transparent',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'all 0.2s',
                                        }}>
                                            {done && (
                                                <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>
                                                    ✓
                                                </span>
                                            )}
                                        </div>
                                        <item.Icon size={18} />
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

            {/* ── Feature Guide ────────────────────────────── */}
            <section style={{ marginBottom: 40 }}>
                <SectionHeader id="features" title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Map size={16} /> Feature Guide</span>} />

                {search && filteredFeatures.length === 0 ? (
                    <div style={{
                        textAlign: 'center', padding: '32px 0',
                        color: 'var(--text-muted)', fontSize: 14,
                    }}>
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
                                    onClick={() => toggleFeature(i)}
                                    role="button"
                                    aria-expanded={isOpen}
                                    aria-controls={`feature-desc-${i}`}
                                    style={{
                                        background: 'rgba(255,255,255,0.02)',
                                        border: `1px solid ${isOpen
                                            ? displayRole.color + '55'
                                            : 'var(--glass-border)'}`,
                                        borderRadius: 12, padding: '14px 16px',
                                        cursor: 'pointer', transition: 'all 0.22s ease',
                                        boxShadow: isOpen
                                            ? `0 0 0 1px ${displayRole.color}18`
                                            : 'none',
                                    }}
                                    onMouseEnter={e => {
                                        if (!isOpen)
                                            e.currentTarget.style.background = 'var(--bg-hover)';
                                    }}
                                    onMouseLeave={e => {
                                        if (!isOpen)
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                                    }}
                                >
                                    {/* Header row */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                                            background: isOpen
                                                ? `linear-gradient(135deg, ${displayRole.color}30, ${displayRole.color}15)`
                                                : 'rgba(255,255,255,0.05)',
                                            border: `1px solid ${isOpen
                                                ? displayRole.color + '40'
                                                : 'var(--glass-border)'}`,
                                            display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', fontSize: 20,
                                            transition: 'all 0.2s',
                                        }}>
                                            <f.Icon size={20} strokeWidth={2.5} color={isOpen ? displayRole.color : 'var(--text-muted)'} aria-hidden="true" />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                display: 'flex', alignItems: 'center',
                                                gap: 8, marginBottom: 3,
                                            }}>
                                                <span style={{
                                                    fontWeight: 700, fontSize: 14,
                                                    color: 'var(--text-primary)',
                                                }}>
                                                    {f.name}
                                                </span>
                                                {isRoleFeature && (
                                                    <span style={{
                                                        fontSize: 9, fontWeight: 700,
                                                        padding: '1px 6px', borderRadius: 99,
                                                        background: `${displayRole.color}20`,
                                                        color: displayRole.color,
                                                        border: `1px solid ${displayRole.color}35`,
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.07em',
                                                    }}>
                                                        your role
                                                    </span>
                                                )}
                                            </div>
                                            <div id={`feature-desc-${i}`} style={{
                                                fontSize: 12, color: 'var(--text-muted)',
                                                lineHeight: 1.5,
                                            }}>
                                                {f.desc}
                                            </div>
                                        </div>
                                        <ChevronDown size={14} aria-hidden="true" style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
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
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.7px', marginBottom: 10,
                                            }}>
                                                Tips
                                            </div>
                                            {f.tips.map((tip, j) => (
                                                <div key={j} style={{
                                                    display: 'flex', gap: 10,
                                                    alignItems: 'flex-start',
                                                    marginBottom: j < f.tips.length - 1 ? 8 : 0,
                                                    padding: '7px 10px',
                                                    background: `${displayRole.color}08`,
                                                    borderRadius: 8,
                                                    border: `1px solid ${displayRole.color}15`,
                                                }}>
                                                    <ArrowRight size={14} style={{ marginTop: 2 }} />
                                                    <span style={{
                                                        fontSize: 12,
                                                        color: 'var(--text-secondary)',
                                                        lineHeight: 1.6,
                                                    }}>
                                                        {tip}
                                                    </span>
                                                </div>
                                            ))}
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                style={{ marginTop: 12 }}
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    navigate(f.path);
                                                }}
                                            >
                                                Open {f.name} <ArrowRight size={12} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* ── FAQ ─────────────────────────────────────── */}
            <section style={{ marginBottom: 40 }}>
                <SectionHeader id="faq" title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><HelpCircle size={16} /> Frequently Asked Questions</span>} />

                {search && filteredFaqs.length === 0 ? (
                    <div style={{
                        textAlign: 'center', padding: '24px 0',
                        color: 'var(--text-muted)', fontSize: 14,
                    }}>
                        No FAQs match "{search}"
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {/* FIX: use faq.q as stable key — index keys break animation on filter */}
                        {filteredFaqs.map((faq, i) => {
                            const isOpen = openFaq === i;
                            return (
                                <div
                                    key={faq.q}
                                    style={{
                                        background: 'rgba(255,255,255,0.02)',
                                        border: `1px solid ${isOpen
                                            ? displayRole.color + '45'
                                            : 'var(--glass-border)'}`,
                                        borderRadius: 11, overflow: 'hidden',
                                        transition: 'border-color 0.2s',
                                    }}
                                >
                                    <button
                                        onClick={() => toggleFaq(i)}
                                        style={{
                                            width: '100%', padding: '12px 16px',
                                            background: 'none', border: 'none',
                                            display: 'flex', alignItems: 'center',
                                            justifyContent: 'space-between',
                                            cursor: 'pointer', textAlign: 'left', gap: 12,
                                        }}
                                    >
                                        <div style={{
                                            display: 'flex', alignItems: 'center',
                                            gap: 10, flex: 1, minWidth: 0,
                                        }}>
                                            <span style={{
                                                fontSize: 13, fontWeight: 600,
                                                color: 'var(--text-primary)',
                                                flex: 1,
                                            }}>
                                                {faq.q}
                                            </span>
                                            <TagPill tag={faq.tag} />
                                        </div>
                                        <Plus size={18} />
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

            {/* ── Support callout ─────────────────────────── */}
            <div
                id="support"
                style={{
                    background: `linear-gradient(135deg, ${roleInfo.color}10, rgba(255,255,255,0.02))`,
                    border: `1px solid ${roleInfo.color}30`,
                    borderRadius: 14, padding: '20px 24px',
                    display: 'flex', alignItems: 'center', gap: 18,
                    flexWrap: 'wrap'
                }}
            >
                <div style={{
                    width: 52, height: 52, flexShrink: 0, borderRadius: 14,
                    background: `linear-gradient(135deg, ${roleInfo.color}50, ${roleInfo.color}25)`,
                    border: `1px solid ${roleInfo.color}40`,
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 26,
                }}>
                    <MessageSquare size={26} color="#fff" />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{
                        fontWeight: 700, fontSize: 14,
                        color: 'var(--text-primary)', marginBottom: 5,
                    }}>
                        Still stuck?
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                        Re-open the interactive onboarding tour from the{' '}
                        <strong style={{ color: 'var(--text-secondary)' }}>
                            <HelpCircle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Help &amp; Feature Guide
                        </strong>
                        {' '}button in the sidebar — it walks through your role, feature map
                        and all tips step by step.
                    </div>
                </div>
                <button
                    className="btn btn-secondary btn-sm"
                    style={{ flexShrink: 0, width: '100%', justifyContent: 'center' }}
                    onClick={() => navigate('/dashboard')}
                >
                    Go to Dashboard
                </button>
            </div>

        </div>
    );
}
