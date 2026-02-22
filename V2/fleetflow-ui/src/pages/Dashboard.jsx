import { lazy, Suspense as ReactSuspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
const DashboardStats = lazy(() => import('../components/DashboardStats'));
import { useFleet } from '../context/FleetContext';
import StatusBadge from '../components/StatusBadge';
const TripHeatmap = lazy(() => import('../components/TripHeatmap'));
import useCountUp from '../hooks/useCountUp';
import {
    Package, RefreshCw, TrendingUp, Truck, Wrench,
    AlertTriangle, Check, Search, X, Users,
    Fuel, BarChart3, Building2, ClipboardList,
    TrendingDown, Play, Droplet, User, Info,
    AlertCircle
} from 'lucide-react';

/* ════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════ */
function relTime(date) {
    if (!date) return '—';
    const diff = (Date.now() - new Date(date)) / 1000;
    if (isNaN(diff) || diff < 0) return '—';
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

const sid = (val) => String(val?._id ?? val ?? '');

const STATUS_COLORS = {
    on_trip: '#38bdf8',
    available: '#22c55e',
    in_shop: '#f59e0b',
    retired: '#94a3b8',
    suspended: '#ef4444',
};

const FEED_ICONS = {
    trip: { Icon: Truck, color: 'var(--color-on-trip)' },
    maint: { Icon: Wrench, color: 'var(--color-in-shop)' },
};

function injectSpinStyle() {
    if (document.getElementById('ff-spin-kf')) return;
    const s = document.createElement('style');
    s.id = 'ff-spin-kf';
    s.textContent = '@keyframes ff-spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(s);
}

/* ════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ════════════════════════════════════════════════════════════ */

/* ── LiveClock ─────────────────────────────────────────────── */
function LiveClock() {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const id = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    return (
        <span
            aria-live="polite"
            aria-label={`Current time: ${time.toLocaleTimeString()}`}
            style={{
                fontFamily: 'var(--font-mono)', fontSize: 13,
                color: 'var(--text-muted)', letterSpacing: '0.5px',
            }}
        >
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
    );
}

/* ── TrendBadge ────────────────────────────────────────────── */
function TrendBadge({ value, suffix = '%', inverse = false }) {
    if (value === null || value === undefined || value === 0 || isNaN(value)) return null;
    const isPositive = inverse ? value < 0 : value > 0;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 999,
            background: isPositive ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
            color: isPositive ? 'var(--green-t)' : 'var(--red-t)',
            border: `1px solid ${isPositive ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
        }}>
            {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />} {Math.abs(value)}{suffix}
        </span>
    );
}

/* ── PulseDot ──────────────────────────────────────────────── */
function PulseDot({ color = 'var(--green-t)' }) {
    return (
        <span style={{
            display: 'inline-block', width: 6, height: 6,
            borderRadius: '50%', background: color,
            boxShadow: `0 0 5px ${color}80`,
            animation: 'pulse-dot 2.5s ease infinite',
            flexShrink: 0,
        }} />
    );
}

/* ── QuickAction ───────────────────────────────────────────── */
function QuickAction({ Icon, label, onClick, color = 'var(--accent)' }) {
    return (
        <button
            onClick={onClick}
            aria-label={label}
            style={{
                flex: '1 1 0', minWidth: 90,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '16px 10px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer', transition: 'all 0.2s ease',
                color: 'var(--text-secondary)',
            }}
            onMouseEnter={e => {
                const el = e.currentTarget;
                el.style.background = `${color}14`;
                el.style.borderColor = color;
                el.style.color = color;
                el.style.transform = 'translateY(-2px)';
                el.style.boxShadow = `0 4px 14px ${color}30`;
            }}
            onMouseLeave={e => {
                const el = e.currentTarget;
                el.style.background = 'rgba(255,255,255,0.03)';
                el.style.borderColor = 'var(--glass-border)';
                el.style.color = 'var(--text-secondary)';
                el.style.transform = 'translateY(0)';
                el.style.boxShadow = 'none';
            }}
        >
            <Icon size={22} aria-hidden="true" />
            <span style={{ fontSize: 11, fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>
                {label}
            </span>
        </button>
    );
}



/* ── AlertItem ─────────────────────────────────────────────── */
function AlertItem({ alert, onDismiss }) {
    const isError = alert.type === 'error';
    const color = isError ? 'var(--red-t)' : 'var(--orange-t)';
    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            padding: '8px 12px', borderRadius: 8,
            background: isError ? 'rgba(239,68,68,0.08)' : 'rgba(251,146,60,0.08)',
            border: `1px solid ${isError ? 'rgba(239,68,68,0.22)' : 'rgba(251,146,60,0.22)'}`,
            borderLeft: `3px solid ${color}`,
            animation: 'fadeInScale 0.25s ease',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                {isError ? <AlertCircle size={14} color={color} /> : <AlertTriangle size={14} color={color} />}
                <span style={{ fontSize: 13, color }}>{alert.msg}</span>
            </div>
            <button
                onClick={() => onDismiss(alert.id)}
                aria-label="Dismiss alert"
                style={{
                    background: 'none', border: 'none', color,
                    cursor: 'pointer', fontSize: 18, lineHeight: 1,
                    opacity: 0.6, flexShrink: 0, padding: '0 4px',
                    borderRadius: 4, transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
            >
                <X size={16} aria-hidden="true" />
            </button>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════ */
export default function Dashboard() {
    const {
        vehicles, drivers, trips, maintenance,
        stats, loading, refreshAll,
    } = useFleet();
    const navigate = useNavigate();

    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [isRefreshing, setIsRefreshing] = useState(false);

    /* ── One-time setup ─────────────────────────────────────── */
    useEffect(() => {
        injectSpinStyle();
        document.title = 'Command Center · FleetFlow';
        return () => { document.title = 'FleetFlow'; };
    }, []);

    /* ── Lookup maps ────────────────────────────────────────── */
    const vehicleMap = useMemo(() =>
        Object.fromEntries(vehicles.map(v => [sid(v), v])),
        [vehicles]
    );
    // driverMap available for future use (trip row driver name lookup)
    const driverMap = useMemo(() =>
        Object.fromEntries(drivers.map(d => [sid(d), d])),
        [drivers]
    );

    /* ── KPIs ───────────────────────────────────────────────── */
    const totalNonRetired = useMemo(
        () => vehicles.filter(v => v.status !== 'retired').length,
        [vehicles]
    );

    const utilization = useMemo(() =>
        totalNonRetired
            ? Math.round(((stats?.onTripVehicles ?? 0) / totalNonRetired) * 100)
            : 0,
        [stats, totalNonRetired]
    );

    /* FIX: t.status not t.state */
    const pendingCargo = useMemo(
        () => trips.filter(t => t.status === 'draft').length,
        [trips]
    );

    /* ── Animated KPIs — staggered ─────────────────────────── */
    const animFleet = useCountUp(stats?.onTripVehicles ?? 0, { delay: 0, easing: 'ease-out-expo' });
    const animShop = useCountUp(stats?.inShopVehicles ?? 0, { delay: 80, easing: 'ease-out-expo' });
    const animUtil = useCountUp(utilization, { delay: 160, easing: 'ease-out-expo' });
    const animPending = useCountUp(pendingCargo, { delay: 240, easing: 'ease-out-expo' });

    /* ── Alerts ─────────────────────────────────────────────── */
    const [dismissed, setDismissed] = useState(() => {
        try { return JSON.parse(sessionStorage.getItem('ff-dismissed-alerts') || '[]'); }
        catch { return []; }
    });

    const rawAlerts = useMemo(() => {
        const now = Date.now();
        const alerts = [];

        drivers.forEach(d => {
            const expDate = d.license_expiry ?? d.licenseExpiry;
            if (!expDate) return;
            const daysLeft = Math.ceil((new Date(expDate) - now) / 86400000);
            if (daysLeft <= 0) {
                alerts.push({ id: `lic-exp-${sid(d)}`, msg: `${d.name}'s license has EXPIRED`, type: 'error' });
            } else if (daysLeft <= 30) {
                alerts.push({
                    id: `lic-soon-${sid(d)}`,
                    msg: `${d.name}'s license expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
                    type: 'warning'
                });
            }
        });

        trips.forEach(t => {
            if (t.status !== 'dispatched') return;
            const started = t.date_start ?? t.dateStart;
            if (!started) return;
            const hoursAgo = (now - new Date(started)) / 3600000;
            if (hoursAgo > 24) {
                alerts.push({
                    id: `overdue-${sid(t)}`,
                    msg: `Trip ${t.reference} overdue — dispatched ${Math.floor(hoursAgo)}h ago`,
                    type: 'warning'
                });
            }
        });

        return alerts;
    }, [drivers, trips]);

    const visibleAlerts = useMemo(
        () => rawAlerts.filter(a => !dismissed.includes(a.id)),
        [rawAlerts, dismissed]
    );

    const dismissAlert = useCallback((id) => {
        setDismissed(prev => {
            const next = [...prev, id];
            sessionStorage.setItem('ff-dismissed-alerts', JSON.stringify(next));
            return next;
        });
    }, []);

    const dismissAllAlerts = useCallback(() => {
        setDismissed(prev => {
            const next = [...new Set([...prev, ...rawAlerts.map(a => a.id)])];
            sessionStorage.setItem('ff-dismissed-alerts', JSON.stringify(next));
            return next;
        });
    }, [rawAlerts]);

    /* ── Donut data ─────────────────────────────────────────── */
    const statusGroups = useMemo(() =>
        [
            { key: 'on_trip', label: 'On Trip' },
            { key: 'available', label: 'Available' },
            { key: 'in_shop', label: 'In Shop' },
            { key: 'retired', label: 'Retired' },
            { key: 'suspended', label: 'Suspended' },
        ]
            .map(g => ({
                ...g,
                value: vehicles.filter(v => v.status === g.key).length,
                color: STATUS_COLORS[g.key],
            }))
            .filter(g => g.value > 0),
        [vehicles]
    );

    /* ── Recent trips (sorted newest first, max 8) ──────────── */
    const recentTrips = useMemo(() =>
        [...trips]
            .sort((a, b) =>
                new Date(b.date_start ?? b.dateStart ?? 0) -
                new Date(a.date_start ?? a.dateStart ?? 0)
            )
            .slice(0, 8),
        [trips]
    );

    /* ── Activity feed ──────────────────────────────────────── */
    const feedItems = useMemo(() =>
        [
            ...trips.slice(-6).map(t => ({
                id: `t-${sid(t)}`,
                type: 'trip',
                msg: `${t.reference}: ${t.origin || '?'} → ${t.destination || '?'}`,
                sub: vehicleMap[sid(t.vehicle)]?.name ?? '',
                date: t.date_start ?? t.dateStart,
                status: t.status,
            })),
            ...maintenance.slice(-4).map(m => ({
                id: `m-${sid(m)}`,
                type: 'maint',
                msg: m.name ?? m.description ?? 'Service',
                sub: vehicleMap[sid(m.vehicle)]?.name ?? '',
                date: m.service_date,
                status: m.status,
            })),
        ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
        [trips, maintenance, vehicleMap]
    );

    /* ── Refresh ────────────────────────────────────────────── */
    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            await refreshAll();
            setLastRefresh(new Date());
        } finally {
            setIsRefreshing(false);
        }
    }, [refreshAll]);

    useEffect(() => {
        const id = setInterval(() => {
            refreshAll();
            setLastRefresh(new Date());
        }, 30_000);
        return () => clearInterval(id);
    }, [refreshAll]);

    /* ════════════════════════════════════════════════════════
       RENDER
       ════════════════════════════════════════════════════════ */
    return (
        <div className="fade-in">

            {/* ── Page Actions ────────────────────────────────── */}
            <div className="page-header" style={{ marginBottom: 20, justifyContent: 'flex-end', gap: 16 }}>
                <div className="page-sub" style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 'auto' }}>
                    <PulseDot />
                    Live · refreshed {relTime(lastRefresh)}
                    <span style={{ color: 'var(--border)', userSelect: 'none' }}>·</span>
                    <LiveClock />
                </div>
                <div className="page-actions">
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={handleRefresh}
                        disabled={isRefreshing || loading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 7,
                            border: '1px solid var(--border)',
                            background: 'var(--bg-surface)',
                            fontWeight: 700,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-1px) scale(1.02)';
                            e.currentTarget.style.borderColor = 'var(--accent)';
                            e.currentTarget.style.boxShadow = '0 0 12px var(--accent-glow)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0) scale(1)';
                            e.currentTarget.style.borderColor = 'var(--border)';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                        }}
                    >
                        <RefreshCw
                            size={13} strokeWidth={2.5}
                            style={isRefreshing
                                ? { animation: 'ff-spin 0.7s linear infinite' }
                                : undefined}
                        />
                        {isRefreshing ? 'Syncing...' : 'Refresh Feed'}
                    </button>
                </div>
            </div>

            {/* ── KPI Cards ───────────────────────────────── */}
            <div className="kpi-grid" style={{ marginBottom: 20 }}>

                <div
                    className="kpi-card blue ff-card fade-in-scale"
                    style={{ cursor: 'pointer', animationDelay: '0ms' }}
                    onClick={() => navigate('/vehicles')}
                    role="button" tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && navigate('/vehicles')}
                >
                    <div className="kpi-icon"><Truck size={20} strokeWidth={2} /></div>
                    <div className="kpi-label">Active Fleet</div>
                    <div className="kpi-value">{animFleet}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div className="kpi-sub">
                            {vehicles.length} total · {stats?.availVehicles ?? 0} available
                        </div>
                        <TrendBadge value={5} />
                    </div>
                </div>

                <div
                    className="kpi-card orange ff-card fade-in-scale"
                    style={{ cursor: 'pointer', animationDelay: '80ms' }}
                    onClick={() => navigate('/maintenance')}
                    role="button" tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && navigate('/maintenance')}
                >
                    <div className="kpi-icon"><Wrench size={20} strokeWidth={2} /></div>
                    <div className="kpi-label">In Shop</div>
                    <div className="kpi-value">{animShop}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div className="kpi-sub">
                            {stats?.pendingMaint ?? 0} service jobs pending
                        </div>
                        <TrendBadge value={(stats?.inShopVehicles ?? 0) > 2 ? 2 : -1} inverse />
                    </div>
                </div>

                <div
                    className="kpi-card green ff-card fade-in-scale"
                    style={{ cursor: 'pointer', animationDelay: '160ms' }}
                    onClick={() => navigate('/analytics')}
                    role="button" tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && navigate('/analytics')}
                >
                    <div className="kpi-icon"><TrendingUp size={20} strokeWidth={2} /></div>
                    <div className="kpi-label">Utilization</div>
                    <div className="kpi-value">{animUtil}%</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div className="kpi-sub">
                            {stats?.onDutyDrivers ?? 0} driver{stats?.onDutyDrivers !== 1 ? 's' : ''} on duty
                        </div>
                        <TrendBadge value={utilization > 60 ? 8 : -5} />
                    </div>
                </div>

                <div
                    className="kpi-card red ff-card fade-in-scale"
                    style={{ cursor: 'pointer', animationDelay: '240ms' }}
                    onClick={() => navigate('/trips')}
                    role="button" tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && navigate('/trips')}
                >
                    <div className="kpi-icon"><Package size={20} strokeWidth={2} /></div>
                    <div className="kpi-label">Pending Cargo</div>
                    <div className="kpi-value">{animPending}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div className="kpi-sub">trips awaiting dispatch</div>
                        <TrendBadge value={pendingCargo > 0 ? -pendingCargo : 0} inverse />
                    </div>
                </div>

            </div>

            {/* ── Alerts Banner ───────────────────────────── */}
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
                    {/* Alert header row */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            fontSize: 11, fontWeight: 700, color: 'var(--orange-t)',
                            textTransform: 'uppercase', letterSpacing: '0.7px',
                        }}>
                            <PulseDot color="var(--orange-t)" />
                            Fleet Alerts — {visibleAlerts.length} item{visibleAlerts.length !== 1 ? 's' : ''}
                        </div>
                        {/* Dismiss All */}
                        <button
                            onClick={dismissAllAlerts}
                            style={{
                                background: 'none', border: '1px solid rgba(251,146,60,0.3)',
                                borderRadius: 6, padding: '3px 10px',
                                fontSize: 11, color: 'var(--text-muted)',
                                cursor: 'pointer', fontFamily: 'var(--font-body)',
                                transition: 'color 0.15s ease, border-color 0.15s ease',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.color = 'var(--orange-t)';
                                e.currentTarget.style.borderColor = 'var(--orange-t)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.color = 'var(--text-muted)';
                                e.currentTarget.style.borderColor = 'rgba(251,146,60,0.3)';
                            }}
                        >
                            Dismiss all
                        </button>
                    </div>

                    {/* Alert items */}
                    {visibleAlerts.map(alert => (
                        <AlertItem key={alert.id} alert={alert} onDismiss={dismissAlert} />
                    ))}
                </div>
            )}

            {/* ── Mid Row: Fleet Health Donut + Activity Feed ── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '300px 1fr',
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
                            <div className="empty-state-icon"><Truck size={40} opacity={0.2} /></div>
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
                            <ReactSuspense fallback={
                                <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ width: 110, height: 110, borderRadius: '50%', border: '8px solid rgba(255,255,255,0.03)' }} />
                                </div>
                            }>
                                <DashboardStats
                                    vehicles={vehicles}
                                    utilization={utilization}
                                    statusGroups={statusGroups}
                                />
                            </ReactSuspense>

                            {/* Donut legend */}
                            <div style={{
                                display: 'flex', flexWrap: 'wrap',
                                gap: '6px 14px', marginTop: 8,
                            }}>
                                {statusGroups.map(s => (
                                    <div key={s.key} style={{
                                        display: 'flex', alignItems: 'center',
                                        gap: 5, fontSize: 12,
                                    }}>
                                        <span style={{
                                            width: 8, height: 8, borderRadius: '50%',
                                            background: s.color, display: 'inline-block',
                                            flexShrink: 0, boxShadow: `0 0 6px ${s.color}80`,
                                        }} />
                                        <span style={{ color: 'var(--text-secondary)' }}>
                                            {s.label}
                                        </span>
                                        <strong style={{ color: 'var(--text-primary)' }}>
                                            {s.value}
                                        </strong>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Activity Feed */}
                <div className="stat-card ff-card"
                    style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
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
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'var(--border) transparent',
                    }}>
                        {feedItems.length === 0 ? (
                            <div className="empty-state" style={{ padding: '32px 0' }}>
                                <div className="empty-state-icon"><ClipboardList size={40} opacity={0.2} /></div>
                                <div className="empty-state-text">No recent activity</div>
                                <div className="empty-state-sub">
                                    Activity appears here once trips and services are added
                                </div>
                            </div>
                        ) : feedItems.map((item, i) => {
                            const meta = FEED_ICONS[item.type];
                            return (
                                <div
                                    key={item.id}
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
                                    onMouseEnter={e =>
                                        e.currentTarget.style.background = 'var(--bg-hover)'
                                    }
                                    onMouseLeave={e =>
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                                    }
                                >
                                    <meta.Icon size={18} strokeWidth={2.5} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: 12, fontWeight: 600,
                                            color: 'var(--text-primary)',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {item.msg}
                                        </div>
                                        <div style={{
                                            fontSize: 11, color: 'var(--text-muted)',
                                            marginTop: 2, display: 'flex', gap: 8,
                                        }}>
                                            {item.sub && (
                                                <span style={{ color: 'var(--text-secondary)' }}>
                                                    {item.sub}
                                                </span>
                                            )}
                                            <span>{relTime(item.date)}</span>
                                        </div>
                                    </div>
                                    <StatusBadge status={item.status} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Quick Actions ────────────────────────────── */}
            <div className="table-wrapper ff-card"
                style={{ marginBottom: 16, padding: '14px 16px' }}>
                <div style={{
                    fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 12,
                }}>
                    Quick Actions
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <QuickAction Icon={Truck} label="New Trip"
                        onClick={() => navigate('/trips')} color="var(--blue-t)" />
                    <QuickAction Icon={User} label="Add Driver"
                        onClick={() => navigate('/drivers')} color="var(--purple-t)" />
                    <QuickAction Icon={Wrench} label="Log Service"
                        onClick={() => navigate('/maintenance')} color="var(--orange-t)" />
                    <QuickAction Icon={Fuel} label="Fuel Entry"
                        onClick={() => navigate('/fuel')} color="var(--blue-t)" />
                    <QuickAction Icon={BarChart3} label="Analytics"
                        onClick={() => navigate('/analytics')} color="var(--green-t)" />
                    <QuickAction Icon={Building2} label="All Vehicles"
                        onClick={() => navigate('/vehicles')} color="var(--red-t)" />
                </div>
            </div>

            {/* ── Trip Activity Heatmap ───────────────────── */}
            <div style={{ marginBottom: 16, minHeight: 200 }}>
                <ReactSuspense fallback={<div style={{ height: 200, background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Loading Heatmap...</span></div>}>
                    <TripHeatmap accent="var(--accent)" />
                </ReactSuspense>
            </div>

            {/* ── Recent Trips Table ───────────────────────── */}
            <div className="table-wrapper ff-card" style={{ marginBottom: 20 }}>
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
                        ) : recentTrips.map(t => {
                            const vehicle = vehicleMap[sid(t.vehicle)];
                            const driver = driverMap[sid(t.driver)];

                            return (
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
                                            {vehicle?.name ?? '—'}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                            {vehicle?.licenseplate ?? vehicle?.license_plate ?? ''}
                                        </div>
                                    </td>
                                    <td className="text-secondary">
                                        {driver?.name ?? '—'}
                                    </td>
                                    <td>
                                        <div style={{
                                            display: 'flex', alignItems: 'center',
                                            gap: 5, fontSize: 12,
                                        }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>
                                                {t.origin || '—'}
                                            </span>
                                            <span style={{ color: 'var(--text-muted)' }}>→</span>
                                            <span style={{ color: 'var(--text-secondary)' }}>
                                                {t.destination || '—'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="text-muted">
                                        {(t.cargo_weight ?? t.cargoWeight) != null
                                            ? `${(t.cargo_weight ?? t.cargoWeight).toLocaleString()} kg`
                                            : '—'}
                                    </td>
                                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        {relTime(t.date_start ?? t.dateStart)}
                                    </td>
                                    <td>
                                        <StatusBadge status={t.status} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

        </div>
    );
}
