import { useState, useEffect, useRef } from 'react';
import { useFleet } from '../context/FleetContext';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import useCountUp from '../hooks/useCountUp';
import {
    PieChart, Pie, Cell, Tooltip as RechartsTip, ResponsiveContainer,
} from 'recharts';

/* ─── helpers ─────────────────────────────────────────────── */
function relTime(date) {
    const diff = (Date.now() - new Date(date)) / 1000;
    if (!date || isNaN(diff) || diff < 0) return '—';
    if (diff < 60)    return 'just now';
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

const sid = val => String(val?._id ?? val ?? '');

const STATUS_COLORS = {
    on_trip:   '#38bdf8',
    available: '#22C55E',
    in_shop:   '#F59E0B',
    retired:   '#94A3B8',
    suspended: '#EF4444',
};

const FEED_ICONS = {
    trip:  { icon: '🚛', color: 'var(--color-on-trip)'  },
    maint: { icon: '🔧', color: 'var(--color-in-shop)'  },
};

/* ─── Live Clock ──────────────────────────────────────────── */
function LiveClock() {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const id = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    return (
        <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 13,
            color: 'var(--text-muted)', letterSpacing: '0.5px',
        }}>
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
    );
}

/* ─── Trend Badge ─────────────────────────────────────────── */
function TrendBadge({ value, suffix = '%', inverse = false }) {
    if (!value || isNaN(value)) return null;
    const isPositive = inverse ? value < 0 : value > 0;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 10, fontWeight: 700, padding: '2px 6px',
            borderRadius: 999,
            background: isPositive ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
            color: isPositive ? 'var(--green-t)' : 'var(--red-t)',
            border: `1px solid ${isPositive ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
        }}>
            {isPositive ? '↑' : '↓'} {Math.abs(value)}{suffix}
        </span>
    );
}

/* ─── Pulse indicator ─────────────────────────────────────── */
function PulseDot({ color = 'var(--green-t)' }) {
    return (
        <span style={{
            display: 'inline-block', width: 7, height: 7,
            borderRadius: '50%', background: color,
            boxShadow: `0 0 6px ${color}`,
            animation: 'pulse-dot 2s ease infinite',
            flexShrink: 0,
        }} />
    );
}

/* ─── Quick-action shortcut card ─────────────────────────── */
function QuickAction({ icon, label, onClick, color = 'var(--accent)' }) {
    return (
        <button onClick={onClick} style={{
            flex: '1 1 0',
            minWidth: 90,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 8,
            padding: '16px 10px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius)',
            cursor: 'pointer', transition: 'all 0.2s ease',
            color: 'var(--text-secondary)',
        }}
            onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(59,130,246,0.08)';
                e.currentTarget.style.borderColor = color;
                e.currentTarget.style.color = color;
                e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                e.currentTarget.style.borderColor = 'var(--glass-border)';
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.transform = 'translateY(0)';
            }}
        >
            <span style={{ fontSize: 22 }}>{icon}</span>
            <span style={{ fontSize: 11, fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
        </button>
    );
}

/* ─── Custom Recharts tooltip ─────────────────────────────── */
function DonutTooltip({ active, payload }) {
    if (!active || !payload?.[0]) return null;
    const { name, value, payload: p } = payload[0];
    return (
        <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
            borderRadius: 10, padding: '8px 14px', fontSize: 12,
            boxShadow: 'var(--shadow-lg)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
                <strong>{p.label}</strong>
            </div>
            <div style={{ color: 'var(--text-muted)', marginTop: 3 }}>
                {value} vehicle{value !== 1 ? 's' : ''}
            </div>
        </div>
    );
}

/* ─── Alert item ──────────────────────────────────────────── */
function AlertItem({ alert, onDismiss }) {
    const isError = alert.msg.startsWith('❌');
    return (
        <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: 12,
            padding: '8px 12px',
            background: isError ? 'rgba(239,68,68,0.08)' : 'rgba(251,146,60,0.08)',
            borderRadius: 8,
            borderLeft: `3px solid ${isError ? 'var(--red-t)' : 'var(--orange-t)'}`,
            animation: 'fadeInScale 0.25s ease',
        }}>
            <span style={{
                fontSize: 13,
                color: isError ? 'var(--red-t)' : 'var(--orange-t)',
            }}>
                {alert.msg}
            </span>
            <button
                onClick={() => onDismiss(alert.id)}
                style={{
                    background: 'none', border: 'none',
                    color: isError ? 'var(--red-t)' : 'var(--orange-t)',
                    cursor: 'pointer', fontSize: 18, lineHeight: 1,
                    opacity: 0.6, flexShrink: 0, padding: '0 4px',
                    borderRadius: 4, transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
                title="Dismiss"
            >
                ×
            </button>
        </div>
    );
}

/* ─── Main Component ──────────────────────────────────────── */
export default function Dashboard() {
    const { vehicles, drivers, trips, maintenance, refreshAll } = useFleet();
    const navigate = useNavigate();
    const [lastRefresh, setLastRefresh] = useState(new Date());

    /* ── KPIs ──────────────────────────────────────────────── */
    const activeFleet    = vehicles.filter(v => v.status === 'on_trip').length;
    const inShop         = vehicles.filter(v => v.status === 'in_shop').length;
    const totalNonRetired = vehicles.filter(v => v.status !== 'retired').length;
    const utilization    = totalNonRetired
        ? Math.round((activeFleet / totalNonRetired) * 100) : 0;
    const pendingCargo   = trips.filter(t => t.state === 'draft').length;
    const activeDrivers  = drivers.filter(d => d.status === 'on_duty').length;

    const animFleet   = useCountUp(activeFleet);
    const animShop    = useCountUp(inShop);
    const animUtil    = useCountUp(utilization);
    const animPending = useCountUp(pendingCargo);

    /* ── Alerts ────────────────────────────────────────────── */
    const [dismissed, setDismissed] = useState(() => {
        try { return JSON.parse(sessionStorage.getItem('ff-dismissed-alerts') || '[]'); }
        catch { return []; }
    });

    const now = Date.now();
    const rawAlerts = [];

    drivers.forEach(d => {
        const expDate = d.licenseExpiry || d.license_expiry;
        if (!expDate) return;
        const daysLeft = Math.ceil((new Date(expDate) - now) / 86400000);
        if (daysLeft <= 0) {
            rawAlerts.push({ id: `lic-exp-${sid(d)}`, msg: `❌ ${d.name}'s license has EXPIRED` });
        } else if (daysLeft <= 30) {
            rawAlerts.push({ id: `lic-soon-${sid(d)}`, msg: `⚠ ${d.name}'s license expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}` });
        }
    });

    trips.forEach(t => {
        if (t.state !== 'dispatched') return;
        const started = t.dateStart || t.date_start;
        if (!started) return;
        const hoursAgo = (now - new Date(started)) / 3600000;
        if (hoursAgo > 24) {
            rawAlerts.push({
                id: `overdue-${sid(t)}`,
                msg: `⚠ Trip ${t.reference} overdue — dispatched ${Math.floor(hoursAgo)}h ago`,
            });
        }
    });

    const visibleAlerts = rawAlerts.filter(a => !dismissed.includes(a.id));

    const dismissAlert = id => {
        const next = [...dismissed, id];
        setDismissed(next);
        sessionStorage.setItem('ff-dismissed-alerts', JSON.stringify(next));
    };

    /* ── Donut data ────────────────────────────────────────── */
    const statusGroups = [
        { key: 'on_trip',   label: 'On Trip'    },
        { key: 'available', label: 'Available'  },
        { key: 'in_shop',   label: 'In Shop'    },
        { key: 'retired',   label: 'Retired'    },
        { key: 'suspended', label: 'Suspended'  },
    ].map(g => ({
        ...g,
        value: vehicles.filter(v => v.status === g.key).length,
        color: STATUS_COLORS[g.key],
    })).filter(g => g.value > 0);

    /* ── Recent trips ──────────────────────────────────────── */
    const recentTrips = [...trips]
        .sort((a, b) => {
            const da = new Date(a.dateStart || a.date_start || 0);
            const db = new Date(b.dateStart || b.date_start || 0);
            return db - da;
        })
        .slice(0, 8);

    /* ── Activity feed ─────────────────────────────────────── */
    const feedItems = [
        ...trips.slice(-6).map(t => ({
            id: `t-${sid(t)}`,
            type: 'trip',
            msg: `${t.reference}: ${t.origin || '?'} → ${t.destination || '?'}`,
            sub: t.vehicle?.name || '',
            date: t.dateStart || t.date_start,
            state: t.state,
        })),
        ...maintenance.slice(-4).map(m => ({
            id: `m-${sid(m)}`,
            type: 'maint',
            msg: m.name || m.description || 'Service',
            sub: m.vehicle?.name || '',
            date: m.date,
            state: m.state,
        })),
    ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    /* ── Auto-refresh every 30s ────────────────────────────── */
    useEffect(() => {
        const id = setInterval(() => {
            refreshAll();
            setLastRefresh(new Date());
        }, 30000);
        return () => clearInterval(id);
    }, [refreshAll]);

    /* ── KPI card config ───────────────────────────────────── */
    const kpis = [
        {
            label: 'Active Fleet', value: animFleet,
            sub: `${vehicles.length} total vehicles`, icon: '🚛',
            color: 'blue', delay: 0, trend: 5,
            onClick: () => navigate('/vehicles'),
        },
        {
            label: 'In Shop', value: animShop,
            sub: 'under maintenance', icon: '🔧',
            color: 'orange', delay: 80, trend: inShop > 2 ? 2 : -1, trendInverse: true,
            onClick: () => navigate('/maintenance'),
        },
        {
            label: 'Utilization', value: `${animUtil}%`,
            sub: `${activeDrivers} drivers on duty`, icon: '📈',
            color: 'green', delay: 160, trend: 8,
            onClick: () => navigate('/analytics'),
        },
        {
            label: 'Pending Cargo', value: animPending,
            sub: 'trips awaiting dispatch', icon: '📦',
            color: 'red', delay: 240, trend: pendingCargo > 0 ? -pendingCargo : 0, trendInverse: true,
            onClick: () => navigate('/trips'),
        },
    ];

    return (
        <div className="fade-in">

            {/* ── Page Header ───────────────────────────────── */}
            <div className="page-header" style={{ marginBottom: 20 }}>
                <div>
                    <div className="page-title">Command Center</div>
                    <div className="page-sub" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <PulseDot />
                        Live · refreshed {relTime(lastRefresh)}
                        <span style={{ color: 'var(--border)', userSelect: 'none' }}>·</span>
                        <LiveClock />
                    </div>
                </div>
                <div className="page-actions">
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => { refreshAll(); setLastRefresh(new Date()); }}
                        style={{ gap: 6 }}
                    >
                        ↻ Refresh
                    </button>
                </div>
            </div>

            {/* ── KPI Cards ─────────────────────────────────── */}
            <div className="kpi-grid" style={{ marginBottom: 20 }}>
                {kpis.map(kpi => (
                    <div
                        key={kpi.label}
                        className={`kpi-card ${kpi.color} ff-card`}
                        style={{ cursor: 'pointer', animation: `fadeInScale 0.4s ease ${kpi.delay}ms both` }}
                        onClick={kpi.onClick}
                    >
                        <div className="kpi-icon">{kpi.icon}</div>
                        <div className="kpi-label">{kpi.label}</div>
                        <div className="kpi-value">{kpi.value}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div className="kpi-sub">{kpi.sub}</div>
                            <TrendBadge value={kpi.trend} inverse={kpi.trendInverse} />
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Alerts Banner ─────────────────────────────── */}
            {visibleAlerts.length > 0 && (
                <div style={{
                    background: 'rgba(251,146,60,0.06)',
                    border: '1px solid rgba(180,83,9,0.35)',
                    borderRadius: 'var(--radius)',
                    padding: '12px 16px',
                    marginBottom: 20,
                    display: 'flex', flexDirection: 'column', gap: 8,
                    animation: 'fadeIn 0.3s ease',
                }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        fontSize: 11, fontWeight: 700, color: 'var(--orange-t)',
                        textTransform: 'uppercase', letterSpacing: '0.7px',
                    }}>
                        <PulseDot color="var(--orange-t)" />
                        Fleet Alerts — {visibleAlerts.length} item{visibleAlerts.length !== 1 ? 's' : ''}
                    </div>
                    {visibleAlerts.map(alert => (
                        <AlertItem key={alert.id} alert={alert} onDismiss={dismissAlert} />
                    ))}
                </div>
            )}

            {/* ── Mid Row: Donut + Activity Feed ────────────── */}
            <div style={{
                display: 'grid', gridTemplateColumns: '300px 1fr',
                gap: 16, marginBottom: 16,
            }}>
                {/* Fleet Health Donut */}
                <div className="stat-card ff-card" style={{ padding: '20px 20px 16px' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', marginBottom: 12,
                    }}>
                        <div className="stat-card-title" style={{ margin: 0 }}>Fleet Health</div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {vehicles.length} total
                        </span>
                    </div>

                    {vehicles.length === 0 ? (
                        <div className="empty-state" style={{ padding: '32px 0' }}>
                            <div className="empty-state-icon">🚛</div>
                            <div className="empty-state-text">No vehicles yet</div>
                            <button
                                className="btn btn-primary btn-sm"
                                style={{ marginTop: 12 }}
                                onClick={() => navigate('/vehicles')}
                            >
                                + Add Vehicle
                            </button>
                        </div>
                    ) : (
                        <>
                            <div style={{ position: 'relative' }}>
                                <ResponsiveContainer width="100%" height={180}>
                                    <PieChart>
                                        <Pie
                                            data={statusGroups}
                                            cx="50%" cy="50%"
                                            innerRadius={55} outerRadius={82}
                                            paddingAngle={3} dataKey="value"
                                            startAngle={90} endAngle={-270}
                                        >
                                            {statusGroups.map((entry, i) => (
                                                <Cell
                                                    key={i}
                                                    fill={entry.color}
                                                    stroke="transparent"
                                                    style={{ filter: `drop-shadow(0 0 6px ${entry.color}60)` }}
                                                />
                                            ))}
                                        </Pie>
                                        <RechartsTip content={<DonutTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>

                                {/* Centre label */}
                                <div style={{
                                    position: 'absolute', top: '50%', left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    textAlign: 'center', pointerEvents: 'none',
                                }}>
                                    <div style={{
                                        fontSize: 28, fontWeight: 800,
                                        fontFamily: 'var(--font-heading)',
                                        color: 'var(--text-primary)', lineHeight: 1,
                                    }}>
                                        {utilization}%
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                        Active
                                    </div>
                                </div>
                            </div>

                            {/* Legend */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 8 }}>
                                {statusGroups.map(s => (
                                    <div key={s.key} style={{
                                        display: 'flex', alignItems: 'center',
                                        gap: 5, fontSize: 12,
                                    }}>
                                        <span style={{
                                            width: 8, height: 8, borderRadius: '50%',
                                            background: s.color, display: 'inline-block',
                                            flexShrink: 0,
                                            boxShadow: `0 0 6px ${s.color}80`,
                                        }} />
                                        <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                                        <strong style={{ color: 'var(--text-primary)' }}>{s.value}</strong>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Activity Feed */}
                <div className="stat-card ff-card" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', marginBottom: 12,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div className="stat-card-title" style={{ margin: 0 }}>Activity Feed</div>
                            <PulseDot />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            auto-refresh 30s
                        </span>
                    </div>

                    <div style={{
                        flex: 1, overflowY: 'auto', maxHeight: 260,
                        display: 'flex', flexDirection: 'column', gap: 6,
                        paddingRight: 4,
                    }}>
                        {feedItems.length === 0 ? (
                            <div className="empty-state" style={{ padding: '32px 0' }}>
                                <div className="empty-state-icon">📋</div>
                                <div className="empty-state-text">No recent activity</div>
                                <div className="empty-state-sub">Activity appears here once trips and services are added</div>
                            </div>
                        ) : feedItems.map((item, i) => {
                            const meta = FEED_ICONS[item.type];
                            return (
                                <div
                                    key={`${item.id}-${i}`}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '9px 12px', borderRadius: 10,
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid var(--glass-border)',
                                        borderLeft: `3px solid ${meta.color}`,
                                        transition: 'background 0.15s',
                                        cursor: 'default',
                                        animation: `fadeIn 0.3s ease ${i * 30}ms both`,
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                >
                                    <span style={{
                                        fontSize: 18, lineHeight: 1, flexShrink: 0,
                                        filter: `drop-shadow(0 0 4px ${meta.color}80)`,
                                    }}>
                                        {meta.icon}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: 12, fontWeight: 600,
                                            color: 'var(--text-primary)',
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        }}>
                                            {item.msg}
                                        </div>
                                        <div style={{
                                            fontSize: 11, color: 'var(--text-muted)',
                                            marginTop: 2, display: 'flex', gap: 8,
                                        }}>
                                            {item.sub && <span style={{ color: 'var(--text-secondary)' }}>{item.sub}</span>}
                                            <span>{relTime(item.date)}</span>
                                        </div>
                                    </div>
                                    <StatusBadge status={item.state} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Quick Actions ─────────────────────────────── */}
            <div className="table-wrapper ff-card" style={{ marginBottom: 16, padding: '14px 16px' }}>
                <div style={{
                    fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.7px',
                    marginBottom: 12,
                }}>
                    Quick Actions
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <QuickAction icon="🚛" label="New Trip"       onClick={() => navigate('/trips')}       color="var(--blue-t)"   />
                    <QuickAction icon="👤" label="Add Driver"     onClick={() => navigate('/drivers')}     color="var(--purple-t)" />
                    <QuickAction icon="🔧" label="Log Service"    onClick={() => navigate('/maintenance')} color="var(--orange-t)" />
                    <QuickAction icon="⛽" label="Fuel Entry"     onClick={() => navigate('/fuel')}        color="var(--cyan, var(--blue-t))" />
                    <QuickAction icon="📊" label="Analytics"      onClick={() => navigate('/analytics')}  color="var(--green-t)"  />
                    <QuickAction icon="🏢" label="All Vehicles"   onClick={() => navigate('/vehicles')}   color="var(--red-t)"    />
                </div>
            </div>

            {/* ── Recent Trips Table ────────────────────────── */}
            <div className="table-wrapper">
                <div className="table-toolbar">
                    <span className="table-toolbar-title">
                        Recent Trips
                        <span style={{
                            marginLeft: 8, fontSize: 11, fontWeight: 400,
                            color: 'var(--text-muted)',
                        }}>
                            last {recentTrips.length}
                        </span>
                    </span>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate('/trips')}
                    >
                        View All →
                    </button>
                </div>

                <table className="data-table ff-table">
                    <thead>
                        <tr>
                            <th>Reference</th>
                            <th>Vehicle</th>
                            <th>Driver</th>
                            <th>Route</th>
                            <th>Cargo</th>
                            <th>Started</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recentTrips.length === 0 ? (
                            <tr>
                                <td colSpan={7}>
                                    <div className="empty-state" style={{ padding: '32px 0' }}>
                                        <div className="empty-state-icon">📦</div>
                                        <div className="empty-state-text">No trips logged yet</div>
                                        <button
                                            className="btn btn-primary btn-sm"
                                            style={{ marginTop: 12 }}
                                            onClick={() => navigate('/trips')}
                                        >
                                            + Create First Trip
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ) : recentTrips.map(t => (
                            <tr key={sid(t)}>
                                <td>
                                    <code style={{
                                        fontFamily: 'var(--font-mono)', fontSize: 12,
                                        background: 'rgba(255,255,255,0.05)',
                                        padding: '2px 7px', borderRadius: 4,
                                        color: 'var(--accent)',
                                    }}>
                                        {t.reference}
                                    </code>
                                </td>
                                <td>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                                        {t.vehicle?.name || '—'}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                        {t.vehicle?.license_plate || ''}
                                    </div>
                                </td>
                                <td className="text-secondary">{t.driver?.name || '—'}</td>
                                <td>
                                    <div style={{
                                        display: 'flex', alignItems: 'center',
                                        gap: 5, fontSize: 12,
                                    }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>{t.origin || '—'}</span>
                                        <span style={{ color: 'var(--text-muted)' }}>→</span>
                                        <span style={{ color: 'var(--text-secondary)' }}>{t.destination || '—'}</span>
                                    </div>
                                </td>
                                <td className="text-muted">
                                    {(t.cargoWeight ?? t.cargo_weight) != null
                                        ? `${(t.cargoWeight ?? t.cargo_weight).toLocaleString()} kg`
                                        : '—'}
                                </td>
                                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                    {relTime(t.dateStart || t.date_start)}
                                </td>
                                <td><StatusBadge status={t.state} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
