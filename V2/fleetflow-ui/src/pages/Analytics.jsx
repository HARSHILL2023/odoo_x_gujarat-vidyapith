import { Fragment, memo, useEffect, useMemo, useRef, useState } from 'react';
import { useFleet } from '../context/FleetContext';
import useCountUp from '../hooks/useCountUp';
import Tooltip from '../components/Tooltip';
import Skeleton from '../components/Skeleton';
import toast from '../hooks/useToast';
import {
    Award, BarChart3, CheckCircle2, ChevronDown,
    Download, Fuel, PieChart, Truck, Users, Wrench, DollarSign,
    TrendingUp, TrendingDown, Check, AlertTriangle, Info, Map,
    BarChart
} from 'lucide-react';

/* ════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════ */
const medal = (rank) => rank + 1;
const sid = (val) => String(val?._id ?? val ?? '');

function heatColor(value, min, max) {
    if (value === null || value === undefined || isNaN(value)) return 'var(--bg-hover)';
    const norm = max === min ? 0.5 : (value - min) / (max - min);
    return `rgba(${Math.round((1 - norm) * 220)}, ${Math.round(norm * 220)}, 60, 0.75)`;
}

function getWeekStart(offsetWeeks = 0) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay() - offsetWeeks * 7);
    return d;
}

/* ── CSV ───────────────────────────────────────────────────── */
function downloadCSV(filename, rows) {
    if (!rows.length) { toast.warning('No data to export for this period'); return; }
    const headers = Object.keys(rows[0]);
    const escape = (v) => {
        const s = String(v ?? '');
        return s.includes(',') || s.includes('"') || s.includes('\n')
            ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: filename }).click();
    URL.revokeObjectURL(url);
}

/* ── Period helpers ────────────────────────────────────────── */
const PERIODS = [
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'all', label: 'All Time' },
];

function getPeriodBounds(period) {
    if (period === 'all') return null;
    const start = new Date();
    if (period === 'week') start.setDate(start.getDate() - 7);
    if (period === 'month') start.setMonth(start.getMonth() - 1);
    start.setHours(0, 0, 0, 0);
    const prev = new Date(start);
    if (period === 'week') prev.setDate(prev.getDate() - 7);
    if (period === 'month') prev.setMonth(prev.getMonth() - 1);
    return { start, prev };
}

/* ════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ════════════════════════════════════════════════════════════ */

/* ── TrendBadge ────────────────────────────────────────────── */
/* ── TrendBadge (Memoized) ─────────────────────────────────── */
const TrendBadge = memo(function TrendBadge({ value, suffix = '%', inverse = false }) {
    if (value === null || value === undefined || value === 0 || isNaN(value)) return null;
    const isPositive = inverse ? value < 0 : value > 0;
    const label = `${Math.abs(value)}${suffix} ${isPositive ? 'increase' : 'decrease'}`;
    return (
        <span
            aria-label={label}
            style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                background: isPositive ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
                color: isPositive ? 'var(--green-t)' : 'var(--red-t)',
                border: `1px solid ${isPositive ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`,
            }}
        >
            {isPositive ? <TrendingUp size={10} aria-hidden="true" /> : <TrendingDown size={10} aria-hidden="true" />} {Math.abs(value)}{suffix}
        </span>
    );
});

/* ── SparkBar (Memoized) ───────────────────────────────────── */
const SparkBar = memo(function SparkBar({ pct, color = 'var(--accent)' }) {
    return (
        <div
            aria-label={`Progress: ${pct}%`}
            style={{
                width: 80, height: 6, background: 'rgba(255,255,255,0.06)',
                borderRadius: 999, overflow: 'hidden', flexShrink: 0,
            }}
        >
            <div style={{
                width: `${Math.min(100, Math.max(0, pct))}%`, height: '100%',
                borderRadius: 999, background: color,
                boxShadow: `0 0 8px ${color}80`,
                transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
            }} />
        </div>
    );
});

/* ── SectionHeader (Memoized) ──────────────────────────────── */
const SectionHeader = memo(function SectionHeader({ Icon, title, subtitle, action }) {
    return (
        <div className="table-toolbar" style={{ background: 'transparent' }}>
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {Icon && (
                        <Icon size={15} strokeWidth={2.2}
                            style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                    )}
                    <span className="table-toolbar-title" style={{ fontSize: 15 }}>{title}</span>
                </div>
                {subtitle && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>
                )}
            </div>
            {action}
        </div>
    );
});

/* ── ExportDropdown ────────────────────────────────────────── */
function ExportDropdown({ onTrips, onFuel, onMaintenance, onROI }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    /* Close on outside click */
    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const items = [
        { label: 'Trips CSV', icon: CheckCircle2, action: onTrips },
        { label: 'Fuel Logs CSV', icon: Fuel, action: onFuel },
        { label: 'Maintenance CSV', icon: Wrench, action: onMaintenance },
        { label: 'ROI Report CSV', icon: BarChart3, action: onROI },
    ];

    return (
        <div ref={ref} style={{ position: 'relative', flex: '1 0 auto' }}>
            <button
                className="btn btn-secondary"
                onClick={() => setOpen(o => !o)}
                aria-label="Export options"
                aria-expanded={open}
                aria-haspopup="true"
                style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center' }}
            >
                <Download size={13} strokeWidth={2.2} aria-hidden="true" />
                <span className="desktop-only">Export Data</span>
                <span className="mobile-only">Export</span>
                <ChevronDown
                    size={12} strokeWidth={2.5}
                    aria-hidden="true"
                    style={{
                        transition: 'transform 0.18s ease',
                        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                        marginLeft: 'auto'
                    }}
                />
            </button>

            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200,
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: 6, minWidth: 190,
                    boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
                    animation: 'ff-dropdown-in 0.14s cubic-bezier(0.16,1,0.3,1) both',
                }}>
                    {items.map(({ label, icon: Icon, action }) => (
                        <button
                            key={label}
                            onClick={() => { action(); setOpen(false); }}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                                padding: '8px 12px', border: 'none', borderRadius: 7,
                                background: 'none', cursor: 'pointer', fontSize: 13,
                                color: 'var(--text-secondary)', fontFamily: 'var(--font-body)',
                                transition: 'background 0.1s ease, color 0.1s ease',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'var(--bg-hover)';
                                e.currentTarget.style.color = 'var(--text-primary)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'none';
                                e.currentTarget.style.color = 'var(--text-secondary)';
                            }}
                        >
                            <Icon size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
                            {label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ── ROIRow ────────────────────────────────────────────────── */
/* ── ROIRow (Memoized) ─────────────────────────────────────── */
const ROIRow = memo(function ROIRow({ vehicle, rank, maxRoi }) {
    const roi = Number(vehicle.roi);
    const isNeg = !isNaN(roi) && roi < 0;
    const animRoi = useCountUp(isNaN(roi) ? 0 : Math.abs(roi), {
        duration: 900, decimals: 1, easing: 'ease-out-expo',
    });
    const barPct = maxRoi > 0 ? Math.min(100, Math.abs(roi) / maxRoi * 100) : 0;

    return (
        <tr style={{ background: isNeg ? 'rgba(239,68,68,0.04)' : undefined }}>
            <td>
                <span style={{
                    fontSize: 14, fontWeight: 700, opacity: 0.5,
                    color: rank === 0 ? 'var(--orange-t)' : rank === 1 ? 'var(--blue-t)' : rank === 2 ? 'var(--green-t)' : 'inherit'
                }}>#{medal(rank)}</span>
            </td>
            <td>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <strong style={{ fontSize: 13 }}>{vehicle.name}</strong>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {vehicle.licenseplate ?? vehicle.license_plate ?? vehicle.licensePlate ?? '—'}
                    </span>
                </div>
            </td>
            <td>
                <span className="tag" style={{ textTransform: 'capitalize' }}>
                    {vehicle.type}
                </span>
            </td>
            <td style={{ fontWeight: 600, color: 'var(--green-t)' }}>
                ₹{vehicle.revenue.toLocaleString()}
            </td>
            <td className="text-muted">₹{vehicle.fuel.toLocaleString()}</td>
            <td className="text-muted">₹{vehicle.maint.toLocaleString()}</td>
            <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        flex: 1, minWidth: 60, height: 5,
                        background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden',
                    }}>
                        <div style={{
                            width: `${barPct}%`, height: '100%', borderRadius: 999,
                            background: isNeg
                                ? 'linear-gradient(90deg,#ef4444,#f87171)'
                                : 'linear-gradient(90deg,#22c55e,#4ade80)',
                            transition: 'width 0.8s ease',
                        }} />
                    </div>
                    <Tooltip
                        title={vehicle.roi === null ? 'ROI Undefined' : `ROI: ${vehicle.roi}%`}
                        description={vehicle.roi === null
                            ? `Missing acquisition cost. Table is showing Net Profit: ₹${vehicle.netProfit.toLocaleString()}.`
                            : `Based on revenue vs (fuel + maintenance) over acquisition cost.`
                        }
                    >
                        <span style={{
                            fontWeight: 700, fontSize: 14, minWidth: 56,
                            color: isNeg ? 'var(--red-t)' : 'var(--green-t)',
                            cursor: 'default',
                        }}>
                            {vehicle.roi === null ? '—' : `${isNeg ? '-' : '+'}${animRoi}%`}
                        </span>
                    </Tooltip>
                </div>
            </td>
        </tr>
    );
});

/* ── DriverRow (Memoized) ──────────────────────────────────── */
const DriverRow = memo(function DriverRow({ d, rank }) {
    const score = d.safety_score ?? d.safetyScore ?? 0;
    const exp = d.license_expiry ?? d.licenseExpiry;
    const isExpired = exp && new Date(exp) < new Date();
    const scoreColor = score > 80 ? 'var(--green-t)' : score > 60 ? 'var(--orange-t)' : 'var(--red-t)';
    const rateColor = d.completionRate > 80 ? 'var(--green-t)' : 'var(--orange-t)';

    return (
        <tr>
            <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                        background: rank < 3
                            ? 'linear-gradient(135deg,#3b82f6,#8b5cf6)'
                            : 'var(--bg-hover)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: rank < 3 ? 15 : 13, fontWeight: 700,
                        color: rank < 3 ? '#fff' : 'var(--text-muted)',
                        boxShadow: rank < 3 ? '0 0 12px rgba(59,130,246,0.3)' : 'none',
                    }}>
                        {rank < 3 ? <Award size={rank === 0 ? 18 : 14} /> : (d.name?.[0]?.toUpperCase() ?? '?')}
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{d.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {d.trips_completed ?? d.tripsCompleted ?? 0} career trips
                        </div>
                    </div>
                </div>
            </td>
            <td style={{ textAlign: 'center', fontWeight: 600 }}>{d.totalTrips}</td>
            <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--green-t)' }}>
                {d.completedCount}
            </td>
            <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <SparkBar pct={d.completionRate} color={rateColor} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: rateColor, minWidth: 34 }}>
                        {d.completionRate}%
                    </span>
                </div>
            </td>
            <td>
                <Tooltip
                    title="Safety Score"
                    description={`${score >= 80 ? 'Excellent' : score >= 60 ? 'Average' : 'Poor'} driver — based on incident history and completed trips`}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'default' }}>
                        <SparkBar pct={score} color={scoreColor} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: scoreColor, minWidth: 30 }}>
                            {typeof score === 'number' ? score.toFixed(1) : score}
                        </span>
                    </div>
                </Tooltip>
            </td>
            <td>
                <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
                    background: isExpired ? 'rgba(220,38,38,0.15)' : 'rgba(22,163,74,0.15)',
                    color: isExpired ? 'var(--red-t)' : 'var(--green-t)',
                    border: `1px solid ${isExpired ? 'rgba(220,38,38,0.25)' : 'rgba(22,163,74,0.25)'}`,
                }}>
                    {isExpired ? <AlertTriangle size={12} /> : <Check size={12} />} {isExpired ? 'Expired' : 'Valid'}
                </span>
            </td>
        </tr>
    );
});

/* ── CostDonut (Memoized) ──────────────────────────────────── */
const CostDonut = memo(function CostDonut({ fuel, maint }) {
    const total = (fuel + maint) || 1;
    const fuelPct = Math.round((fuel / total) * 100);
    const maintPct = 100 - fuelPct;
    const circumference = 2 * Math.PI * 36;
    const fuelDash = (fuelPct / 100) * circumference;

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 24, padding: '20px 24px',
            flexWrap: 'wrap', justifyContent: 'center'
        }}>
            <svg width={90} height={90} style={{ flexShrink: 0, transform: 'rotate(-90deg)' }} aria-label={`Cost breakdown: Fuel ${fuelPct}%, Maintenance ${maintPct}%`}>
                <circle cx={45} cy={45} r={36} fill="none"
                    stroke="rgba(255,255,255,0.06)" strokeWidth={10} aria-hidden="true" />
                <circle cx={45} cy={45} r={36} fill="none"
                    stroke="#38bdf8" strokeWidth={10}
                    strokeDasharray={`${fuelDash} ${circumference - fuelDash}`}
                    strokeLinecap="round"
                    aria-hidden="true"
                    style={{ transition: 'stroke-dasharray 1s ease', filter: 'drop-shadow(0 0 6px #38bdf880)' }} />
                <circle cx={45} cy={45} r={36} fill="none"
                    stroke="#fb923c" strokeWidth={10}
                    strokeDasharray={`${circumference - fuelDash} ${fuelDash}`}
                    strokeDashoffset={-fuelDash}
                    strokeLinecap="round"
                    aria-hidden="true"
                    style={{ transition: 'all 1s ease', filter: 'drop-shadow(0 0 6px #fb923c80)' }} />
            </svg>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 140 }}>
                {[
                    { label: 'Fuel', pct: fuelPct, cost: fuel, color: '#38bdf8' },
                    { label: 'Maintenance', pct: maintPct, cost: maint, color: '#fb923c' },
                ].map(({ label, pct, cost, color }) => (
                    <div key={label}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                            <div style={{
                                width: 10, height: 10, borderRadius: 2,
                                background: color, boxShadow: `0 0 6px ${color}`,
                            }} />
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
                        </div>
                        <div style={{
                            fontSize: 18, fontWeight: 800,
                            fontFamily: 'var(--font-heading)', color,
                        }}>
                            {pct}%{' '}
                            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>
                                ₹{cost.toLocaleString()}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

/* ── HeatmapRow (Memoized) ─────────────────────────────────── */
const HeatmapRow = memo(function HeatmapRow({ vehicle, cells, weeks, minEff, maxEff, heatColor }) {
    return (
        <Fragment>
            <div style={{
                fontSize: 12, fontWeight: 600,
                color: 'var(--text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis',
                whiteSpace: 'nowrap', alignSelf: 'center',
                paddingRight: 8,
            }}>
                {vehicle.name}
            </div>
            {cells.map((eff, wi) => (
                <Tooltip
                    key={wi}
                    title={eff !== null ? `${eff} km/L` : 'No data'}
                    description={`Week of ${weeks[wi].label}`}
                >
                    <div
                        style={{
                            height: 38, borderRadius: 7,
                            background: eff !== null
                                ? heatColor(eff, minEff, maxEff)
                                : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${eff !== null
                                ? 'rgba(255,255,255,0.08)'
                                : 'rgba(255,255,255,0.03)'}`,
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10, fontWeight: 700,
                            color: eff !== null ? '#fff' : 'var(--text-muted)',
                            cursor: 'default',
                            transition: 'transform 0.15s ease',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                    >
                        {eff !== null ? eff : '—'}
                    </div>
                </Tooltip>
            ))}
        </Fragment>
    );
});

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════ */
export default function Analytics() {
    const { vehicles, drivers, trips, maintenance, fuelLogs, loading } = useFleet();
    const [period, setPeriod] = useState('all');

    /* ── Period bounds ─────────────────────────────────────── */
    const bounds = useMemo(() => getPeriodBounds(period), [period]);

    /* ── Filtered slices ───────────────────────────────────── */
    const filteredTrips = useMemo(() => {
        if (!bounds) return trips;
        return trips.filter(t => new Date(t.date_start) >= bounds.start);
    }, [trips, bounds]);

    const filteredFuelLogs = useMemo(() => {
        if (!bounds) return fuelLogs;
        return fuelLogs.filter(f => new Date(f.date) >= bounds.start);
    }, [fuelLogs, bounds]);

    /* ── Previous-period slices (real trend arrows) ─────────── */
    const prevTrips = useMemo(() => {
        if (!bounds) return [];
        return trips.filter(t => {
            const d = new Date(t.date_start);
            return d >= bounds.prev && d < bounds.start;
        });
    }, [trips, bounds]);

    const prevFuelLogs = useMemo(() => {
        if (!bounds) return [];
        return fuelLogs.filter(f => {
            const d = new Date(f.date);
            return d >= bounds.prev && d < bounds.start;
        });
    }, [fuelLogs, bounds]);

    /* ── KPIs ──────────────────────────────────────────────── */
    const completedTrips = useMemo(
        () => filteredTrips.filter(t => t.status === 'completed'),
        [filteredTrips]
    );

    const tripCompletionRate = useMemo(() =>
        filteredTrips.length
            ? Math.round((completedTrips.length / filteredTrips.length) * 100)
            : 0,
        [completedTrips, filteredTrips]
    );

    const totalFuelSpend = useMemo(
        () => filteredFuelLogs.reduce((s, f) => s + (f.cost || 0), 0),
        [filteredFuelLogs]
    );

    const totalMaintCost = useMemo(
        () => maintenance.reduce((s, m) => s + (m.cost || 0), 0),
        [maintenance]
    );

    const totalOpCost = totalFuelSpend + totalMaintCost;

    const avgCostPerTrip = useMemo(() =>
        completedTrips.length ? Math.round(totalOpCost / completedTrips.length) : 0,
        [completedTrips, totalOpCost]
    );

    /* ── Real trends ───────────────────────────────────────── */
    const trends = useMemo(() => {
        if (!bounds || !prevTrips.length) return {};
        const calcPct = (curr, prev) =>
            prev ? Math.round(((curr - prev) / prev) * 100) : null;
        const prevCompleted = prevTrips.filter(t => t.status === 'completed');
        const prevRate = prevTrips.length
            ? Math.round((prevCompleted.length / prevTrips.length) * 100) : 0;
        const prevFuel = prevFuelLogs.reduce((s, f) => s + (f.cost || 0), 0);
        return {
            completionRate: calcPct(tripCompletionRate, prevRate),
            fuelSpend: calcPct(totalFuelSpend, prevFuel),
        };
    }, [bounds, prevTrips, prevFuelLogs, tripCompletionRate, totalFuelSpend]);

    /* ── Animated KPIs — staggered ─────────────────────────── */
    const animRate = useCountUp(tripCompletionRate, { delay: 0, easing: 'ease-out-expo' });
    const animFuel = useCountUp(Math.round(totalFuelSpend), { delay: 60, easing: 'ease-out-expo' });
    const animMaint = useCountUp(Math.round(totalMaintCost), { delay: 120, easing: 'ease-out-expo' });
    const animTotal = useCountUp(Math.round(totalOpCost), { delay: 180, easing: 'ease-out-expo' });

    /* ── ROI ────────────────────────────────────────────────── */
    const vehicleROI = useMemo(() =>
        vehicles
            .map(v => {
                const vid = sid(v);
                const acqCost = v.acquisitioncost ?? v.acquisitionCost ?? 0;
                const fuel = filteredFuelLogs
                    .filter(f => sid(f.vehicle) === vid)
                    .reduce((s, f) => s + (f.cost || 0), 0);
                const maint = maintenance
                    .filter(m => sid(m.vehicle) === vid)
                    .reduce((s, m) => s + (m.cost || 0), 0);
                const revenue = completedTrips
                    .filter(t => sid(t.vehicle) === vid)
                    .reduce((s, t) => s + (t.revenue ?? 500), 0);
                const opCost = fuel + maint;
                const netProfit = revenue - opCost;
                const roi = acqCost > 0
                    ? Number(((revenue - opCost) / acqCost) * 100).toFixed(1)
                    : null;
                return {
                    ...v, revenue, fuel, maint, cost: opCost, netProfit,
                    roi: roi !== null ? Number(roi) : null,
                };
            })
            .filter(v => v.status !== 'retired' || v.revenue > 0 || v.cost > 0)
            .sort((a, b) => {
                const roiA = a.roi ?? -Infinity;
                const roiB = b.roi ?? -Infinity;
                if (roiA !== roiB) return roiB - roiA;
                return b.netProfit - a.netProfit;
            }),
        [vehicles, completedTrips, filteredFuelLogs, maintenance]
    );

    const maxRoi = useMemo(() =>
        vehicleROI.length ? Math.max(...vehicleROI.map(v => Math.abs(v.roi ?? 0))) : 1,
        [vehicleROI]
    );

    /* ── Heatmap — always last 8 calendar weeks ─────────────── */
    const weeks = useMemo(() =>
        Array.from({ length: 8 }, (_, i) => {
            const start = getWeekStart(7 - i);
            const end = new Date(start);
            end.setDate(end.getDate() + 7);
            return {
                start, end,
                label: start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            };
        }),
        []
    );

    const heatData = useMemo(() =>
        vehicles.map(v => {
            const vid = sid(v);
            const cells = weeks.map(({ start, end }) => {
                const weekLogs = fuelLogs.filter(f => {
                    const d = new Date(f.date);
                    return sid(f.vehicle) === vid && d >= start && d < end;
                });
                const totalLiters = weekLogs.reduce((s, f) => s + (f.liters || 0), 0);
                const odos = weekLogs.map(f => f.odometer).filter(Boolean).sort((a, b) => a - b);
                const km = odos.length >= 2 ? odos.at(-1) - odos[0] : 0;
                return (totalLiters < 0.1 || km < 1)
                    ? null
                    : Math.round((km / totalLiters) * 10) / 10;
            });
            return { vehicle: v, cells };
        }),
        [vehicles, fuelLogs, weeks]
    );

    const [minEff, maxEff] = useMemo(() => {
        const vals = heatData.flatMap(r => r.cells).filter(v => v !== null);
        return vals.length ? [Math.min(...vals), Math.max(...vals)] : [0, 1];
    }, [heatData]);

    /* ── Driver stats ───────────────────────────────────────── */
    const driverStats = useMemo(() =>
        drivers
            .map(d => {
                const did = sid(d);
                const dTrips = filteredTrips.filter(t => sid(t.driver) === did);
                const done = dTrips.filter(t => t.status === 'completed').length;
                return {
                    ...d,
                    totalTrips: dTrips.length,
                    completedCount: done,
                    completionRate: dTrips.length
                        ? Math.round((done / dTrips.length) * 100) : 0,
                };
            })
            .sort((a, b) =>
                (b.safety_score ?? b.safetyScore ?? 0) -
                (a.safety_score ?? a.safetyScore ?? 0)
            ),
        [drivers, filteredTrips]
    );

    /* ── Fleet status counts (for snapshot) ─────────────────── */
    const fleetStatus = useMemo(() => ([
        { label: 'Available', status: 'available', color: 'var(--green-t)' },
        { label: 'On Trip', status: 'on_trip', color: 'var(--blue-t)' },
        { label: 'In Shop', status: 'in_shop', color: 'var(--orange-t)' },
        { label: 'Retired', status: 'retired', color: 'var(--gray-t)' },
    ].map(s => ({
        ...s,
        count: vehicles.filter(v => v.status === s.status).length,
        total: vehicles.length,
    }))), [vehicles]);

    if (loading) return (
        <div className="fade-in">
            <div className="kpi-grid" style={{ marginBottom: 28 }}>
                {Array.from({ length: 4 }).map((_, i) => <Skeleton.Stat key={i} />)}
            </div>
            <div className="dashboard-row">
                <div className="table-wrapper ff-card" style={{ height: 'auto', minHeight: 200 }}>
                    <Skeleton width="120px" height="14px" style={{ margin: 20 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '0 20px' }}>
                        <Skeleton circle width="70px" height="70px" />
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <Skeleton width="100%" height="10px" />
                            <Skeleton width="80%" height="10px" />
                        </div>
                    </div>
                </div>
                <div className="table-wrapper ff-card" style={{ height: 200, padding: 20 }}>
                    <Skeleton width="160px" height="14px" style={{ marginBottom: 20 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} width="100%" height="8px" />)}
                    </div>
                </div>
            </div>
            <div className="table-wrapper" style={{ padding: 20 }}>
                <Skeleton width="200px" height="16px" style={{ marginBottom: 20 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} width="100%" height="40px" />)}
                </div>
            </div>
        </div>
    );

    /* ── CSV export handlers ────────────────────────────────── */
    const exportTrips = () => {
        downloadCSV(`fleetflow-trips-${period}.csv`, filteredTrips.map(t => ({
            reference: t.reference,
            status: t.status,
            origin: t.origin,
            destination: t.destination,
            cargo_weight: t.cargo_weight,
            date_start: t.date_start,
            date_end: t.date_end ?? '',
            odometer_start: t.odometer_start ?? '',
            odometer_end: t.odometer_end ?? '',
            revenue: t.revenue ?? '',
        })));
        toast.success('Trips CSV downloaded');
    };

    const exportFuel = () => {
        downloadCSV(`fleetflow-fuel-${period}.csv`, filteredFuelLogs.map(f => ({
            date: f.date,
            vehicle: vehicles.find(v => sid(v) === sid(f.vehicle))?.name ?? sid(f.vehicle),
            liters: f.liters,
            cost: f.cost,
            cost_per_liter: f.cost_per_liter
                ?? (f.liters ? +(f.cost / f.liters).toFixed(2) : ''),
            odometer: f.odometer,
        })));
        toast.success('Fuel log CSV downloaded');
    };

    const exportMaintenance = () => {
        downloadCSV('fleetflow-maintenance.csv', maintenance.map(m => ({
            name: m.name,
            vehicle: vehicles.find(v => sid(v) === sid(m.vehicle))?.name ?? sid(m.vehicle),
            service_date: m.service_date,
            service_type: m.service_type,
            status: m.status,
            cost: m.cost,
            mechanic: m.mechanic,
            notes: m.notes ?? '',
        })));
        toast.success('Maintenance CSV downloaded');
    };

    const exportROI = () => {
        downloadCSV('fleetflow-roi.csv', vehicleROI.map((v, i) => ({
            rank: i + 1,
            name: v.name,
            type: v.type,
            licenseplate: v.licenseplate ?? v.licensePlate ?? v.license_plate ?? '',
            acquisition_cost: v.acquisitioncost ?? v.acquisitionCost ?? 0,
            revenue: v.revenue,
            fuel_cost: v.fuel,
            maintenance_cost: v.maint,
            total_op_cost: v.cost,
            roi_pct: v.roi !== null ? `${v.roi > 0 ? '+' : ''}${v.roi}` : 'N/A',
        })));
        toast.success('ROI report CSV downloaded');
    };

    /* ════════════════════════════════════════════════════════
       RENDER
       ════════════════════════════════════════════════════════ */
    return (
        <div className="fade-in">

            {/* ── Page Actions ────────────────────────────────── */}
            <div className="page-header">
                <div className="page-actions">
                    {/* Period toggle */}
                    <div className="ff-view-toggle">
                        {PERIODS.map(p => (
                            <button
                                key={p.key}
                                onClick={() => setPeriod(p.key)}
                                className={`ff-view-btn ${period === p.key ? 'active' : ''}`}
                            >
                                {p.label.replace('This ', '')}
                            </button>
                        ))}
                    </div>

                    {/* Export dropdown */}
                    <ExportDropdown
                        onTrips={exportTrips}
                        onFuel={exportFuel}
                        onMaintenance={exportMaintenance}
                        onROI={exportROI}
                    />
                </div>
            </div>

            {/* ── KPI Cards ───────────────────────────────── */}
            <div className="kpi-grid" style={{ marginBottom: 28 }}>

                {/* Trip Completion */}
                <div className="kpi-card green ff-card fade-in-scale" style={{ animationDelay: '0ms' }}>
                    <div className="kpi-icon">
                        <CheckCircle2 size={20} strokeWidth={2} />
                    </div>
                    <div className="kpi-label">Trip Completion</div>
                    <div className="kpi-value">{animRate}%</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div className="kpi-sub">
                            {completedTrips.length} / {filteredTrips.length} trips
                        </div>
                        <TrendBadge value={trends.completionRate ?? null} />
                    </div>
                </div>

                {/* Total Fuel Spend */}
                <div className="kpi-card blue ff-card fade-in-scale" style={{ animationDelay: '60ms' }}>
                    <div className="kpi-icon">
                        <Fuel size={20} strokeWidth={2} />
                    </div>
                    <div className="kpi-label">Total Fuel Spend</div>
                    <div className="kpi-value">₹{animFuel.toLocaleString()}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div className="kpi-sub">
                            {filteredFuelLogs.length} fill-ups
                        </div>
                        <TrendBadge value={trends.fuelSpend ?? null} inverse />
                    </div>
                </div>

                {/* Maintenance Cost */}
                <div className="kpi-card orange ff-card fade-in-scale" style={{ animationDelay: '120ms' }}>
                    <div className="kpi-icon">
                        <Wrench size={20} strokeWidth={2} />
                    </div>
                    <div className="kpi-label">Maintenance Cost</div>
                    <div className="kpi-value">₹{animMaint.toLocaleString()}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div className="kpi-sub">{maintenance.length} service records</div>
                        {/* No prev-period data for all-time maint — show static */}
                        {period === 'all' && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>All time</span>
                        )}
                    </div>
                </div>

                {/* Total Op Cost */}
                <div className="kpi-card red ff-card fade-in-scale" style={{ animationDelay: '180ms' }}>
                    <div className="kpi-icon">
                        <DollarSign size={20} strokeWidth={2} />
                    </div>
                    <div className="kpi-label">Total Op. Cost</div>
                    <div className="kpi-value">₹{animTotal.toLocaleString()}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div className="kpi-sub">
                            ~₹{avgCostPerTrip.toLocaleString()}/trip avg
                        </div>
                    </div>
                </div>

            </div>

            {/* ── Bento Row: Donut + Fleet Snapshot ───────── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '300px 1fr',
                gap: 16, marginBottom: 24,
            }}>

                {/* Cost Split Donut */}
                <div className="table-wrapper ff-card"
                    style={{ display: 'flex', flexDirection: 'column' }}>
                    <SectionHeader Icon={PieChart} title="Cost Split"
                        subtitle="Fuel vs Maintenance" />
                    <CostDonut fuel={totalFuelSpend} maint={totalMaintCost} />
                </div>

                {/* Fleet Status Snapshot */}
                <div className="table-wrapper ff-card">
                    <SectionHeader Icon={Truck} title="Fleet Status Snapshot" />
                    <div style={{
                        padding: '16px 24px',
                        display: 'flex', flexDirection: 'column', gap: 14,
                    }}>
                        {fleetStatus.map(({ label, count, total, color }) => (
                            <div key={label}>
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    marginBottom: 5, fontSize: 12,
                                }}>
                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                                        {label}
                                    </span>
                                    <span style={{ fontWeight: 700, color }}>
                                        {count}{' '}
                                        <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                                            / {total}
                                        </span>
                                    </span>
                                </div>
                                <div style={{
                                    height: 6, background: 'rgba(255,255,255,0.05)',
                                    borderRadius: 999, overflow: 'hidden',
                                }}>
                                    <div style={{
                                        width: total ? `${(count / total) * 100}%` : '0%',
                                        height: '100%', borderRadius: 999, background: color,
                                        boxShadow: `0 0 8px ${color}60`,
                                        transition: 'width 0.8s ease',
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── ROI Leaderboard ─────────────────────────── */}
            <div className="table-wrapper" style={{ marginBottom: 24 }}>
                <SectionHeader
                    Icon={Award}
                    title="Vehicle ROI Leaderboard"
                    subtitle="Revenue vs. (Fuel + Maintenance) ÷ Acquisition Cost"
                />
                {vehicleROI.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px 0' }}>
                        <div className="empty-state-icon"><BarChart size={40} opacity={0.2} /></div>
                        <div className="empty-state-text">No performance data yet</div>
                        <div className="empty-state-sub">
                            Log some trips, fuel, or maintenance to see ROI and profit rankings
                        </div>
                    </div>
                ) : (
                    <>
                        <table className="data-table ff-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 40 }}>#</th>
                                    <th>Vehicle</th>
                                    <th>Type</th>
                                    <th>
                                        <Tooltip title="Revenue" description="Sum of trip.revenue for completed trips. Falls back to ₹500/trip if unset.">
                                            <span style={{ cursor: 'default' }}>Revenue</span>
                                        </Tooltip>
                                    </th>
                                    <th>Fuel</th>
                                    <th>Maint.</th>
                                    <th style={{ minWidth: 190 }}>ROI</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vehicleROI.map((v, i) => (
                                    <ROIRow key={sid(v)} vehicle={v} rank={i} maxRoi={maxRoi} />
                                ))}
                            </tbody>
                        </table>
                        <div style={{
                            padding: '10px 16px', fontSize: 11,
                            color: 'var(--text-muted)', borderTop: '1px solid var(--glass-border)',
                            display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                            <Info size={12} />
                            <span>
                                Revenue uses{' '}
                                <code style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    padding: '1px 5px', borderRadius: 4,
                                }}>
                                    trip.revenue
                                </code>{' '}
                                if set, otherwise ₹500/trip estimate
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* ── Fuel Efficiency Heatmap ──────────────────── */}
            <div className="table-wrapper ff-card" style={{ marginBottom: 24, overflow: 'auto' }}>
                <SectionHeader
                    Icon={Fuel}
                    title="Fuel Efficiency Heatmap"
                    subtitle="km/L per vehicle per week · last 8 weeks (all-time)"
                />
                {heatData.every(r => r.cells.every(c => c === null)) ? (
                    <div className="empty-state" style={{ padding: '40px 0' }}>
                        <div className="empty-state-icon"><Map size={40} opacity={0.2} /></div>
                        <div className="empty-state-text">No fuel log data yet</div>
                        <div className="empty-state-sub">
                            Log at least 2 odometer readings per vehicle to compute km/L
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: '4px 20px 20px', overflowX: 'auto' }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: `170px repeat(8, minmax(64px, 1fr))`,
                            gap: 5, minWidth: 700,
                        }}>
                            {/* Column headers */}
                            <div style={{
                                fontSize: 11, color: 'var(--text-muted)',
                                fontWeight: 600, padding: '8px 0',
                            }}>
                                Vehicle
                            </div>
                            {weeks.map((w, i) => (
                                <div key={i} style={{
                                    fontSize: 10, color: 'var(--text-muted)',
                                    textAlign: 'center', fontWeight: 600, padding: '8px 0',
                                }}>
                                    {w.label}
                                </div>
                            ))}

                            {/* Data rows — Fragment fixes the missing React key warning */}
                            {heatData.map(({ vehicle, cells }) => (
                                <HeatmapRow
                                    key={sid(vehicle)}
                                    vehicle={vehicle}
                                    cells={cells}
                                    weeks={weeks}
                                    minEff={minEff}
                                    maxEff={maxEff}
                                    heatColor={heatColor}
                                />
                            ))}
                        </div>

                        {/* Legend */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            marginTop: 18, fontSize: 11, color: 'var(--text-muted)',
                        }}>
                            <span style={{ fontWeight: 600 }}>Less Efficient</span>
                            <div style={{
                                flex: 1, maxWidth: 180, height: 7, borderRadius: 999,
                                background: 'linear-gradient(90deg, rgba(220,60,60,0.8), rgba(60,220,60,0.8))',
                                boxShadow: '0 0 8px rgba(100,200,100,0.2)',
                            }} />
                            <span style={{ fontWeight: 600 }}>More Efficient</span>
                            <span style={{ marginLeft: 8, color: 'var(--text-muted)' }}>
                                Range: {minEff}–{maxEff} km/L
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Driver Performance ───────────────────────── */}
            <div className="table-wrapper">
                <SectionHeader
                    Icon={Users}
                    title="Driver Performance"
                    subtitle={`${driverStats.length} drivers · ranked by safety score · ${PERIODS.find(p => p.key === period)?.label}`}
                />
                {driverStats.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px 0' }}>
                        <div className="empty-state-icon"><Users size={40} opacity={0.2} /></div>
                        <div className="empty-state-text">No drivers added yet</div>
                        <div className="empty-state-sub">
                            Register drivers to track performance and completion rates
                        </div>
                    </div>
                ) : (
                    <table className="data-table ff-table">
                        <thead>
                            <tr>
                                <th>Driver</th>
                                <th style={{ textAlign: 'center' }}>Total Trips</th>
                                <th style={{ textAlign: 'center' }}>Completed</th>
                                <th>Completion Rate</th>
                                <th>Safety Score</th>
                                <th>License</th>
                            </tr>
                        </thead>
                        <tbody>
                            {driverStats.map((d, i) => (
                                <DriverRow key={sid(d)} d={d} rank={i} />
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

        </div>
    );
}
