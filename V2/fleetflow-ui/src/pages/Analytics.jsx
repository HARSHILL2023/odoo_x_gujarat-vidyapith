import { useFleet } from '../context/FleetContext';
import useCountUp from '../hooks/useCountUp';
import Tooltip from '../components/Tooltip';
import { showToast } from '../hooks/useToast';

/* ─── helpers ─────────────────────────────────────────────── */
const medal = rank => (['🥇', '🥈', '🥉'][rank] ?? String(rank + 1));

function heatColor(value, min, max) {
    if (value === null || value === undefined || isNaN(value)) return 'var(--bg-hover)';
    const norm = max === min ? 0.5 : (value - min) / (max - min);
    const g = Math.round(norm * 220);
    const r = Math.round((1 - norm) * 220);
    return `rgba(${r}, ${g}, 60, 0.75)`;
}

function getWeekStart(offsetWeeks = 0) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay() - offsetWeeks * 7);
    return d;
}

const sid = val => String(val?._id ?? val ?? '');

/* ─── Trend Arrow ─────────────────────────────────────────── */
function TrendBadge({ value, suffix = '%', inverse = false }) {
    if (value === 0 || isNaN(value)) return null;
    const isPositive = inverse ? value < 0 : value > 0;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 11, fontWeight: 700, padding: '2px 7px',
            borderRadius: 999,
            background: isPositive ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
            color: isPositive ? 'var(--green-t)' : 'var(--red-t)',
            border: `1px solid ${isPositive ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`,
        }}>
            {isPositive ? '↑' : '↓'} {Math.abs(value)}{suffix}
        </span>
    );
}

/* ─── Mini Sparkbar ───────────────────────────────────────── */
function SparkBar({ pct, color = 'var(--accent)' }) {
    return (
        <div style={{ width: 80, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden', flexShrink: 0 }}>
            <div style={{
                width: `${Math.min(100, pct)}%`, height: '100%', borderRadius: 999,
                background: color, transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                boxShadow: `0 0 8px ${color}80`,
            }} />
        </div>
    );
}

/* ─── ROI Row ─────────────────────────────────────────────── */
function ROIRow({ vehicle, rank, maxRoi }) {
    const roi = Number(vehicle.roi);
    const isNeg = !isNaN(roi) && roi < 0;
    const animRoi = useCountUp(isNaN(roi) ? 0 : Math.abs(Math.round(roi)), 900);
    const barPct = maxRoi > 0 ? Math.min(100, Math.abs(roi) / maxRoi * 100) : 0;

    return (
        <tr style={{ background: isNeg ? 'rgba(239,68,68,0.04)' : undefined }}>
            <td><span style={{ fontSize: 18, lineHeight: 1 }}>{medal(rank)}</span></td>
            <td>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <strong style={{ fontSize: 13 }}>{vehicle.name}</strong>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{vehicle.license_plate || vehicle.licensePlate}</span>
                </div>
            </td>
            <td>
                <span className="tag" style={{ textTransform: 'capitalize' }}>
                    {vehicle.type?.replace('_', ' ')}
                </span>
            </td>
            <td style={{ fontWeight: 600, color: 'var(--green-t)' }}>${vehicle.revenue.toLocaleString()}</td>
            <td className="text-muted">${vehicle.fuel.toLocaleString()}</td>
            <td className="text-muted">${vehicle.maint.toLocaleString()}</td>
            <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Visual bar */}
                    <div style={{ flex: 1, minWidth: 60, height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{
                            width: `${barPct}%`, height: '100%', borderRadius: 999,
                            background: isNeg
                                ? 'linear-gradient(90deg,#ef4444,#f87171)'
                                : 'linear-gradient(90deg,#22c55e,#4ade80)',
                            transition: 'width 0.8s ease',
                        }} />
                    </div>
                    <span style={{
                        fontWeight: 700, fontSize: 14, minWidth: 52,
                        color: isNeg ? 'var(--red-t)' : 'var(--green-t)',
                    }}>
                        {vehicle.roi === null ? '—' : `${isNeg ? '-' : '+'}${animRoi}%`}
                    </span>
                </div>
            </td>
        </tr>
    );
}

/* ─── Driver Card ─────────────────────────────────────────── */
function DriverRow({ d, rank }) {
    const score = d.safetyScore ?? d.safety_score ?? 0;
    const exp = d.licenseExpiry || d.license_expiry;
    const isExpired = exp && new Date(exp) < new Date();
    const scoreColor = score > 80 ? 'var(--green-t)' : score > 60 ? 'var(--orange-t)' : 'var(--red-t)';
    const rateColor = d.completionRate > 80 ? 'var(--green-t)' : 'var(--orange-t)';

    return (
        <tr>
            <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Avatar with rank */}
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
                        {rank < 3 ? medal(rank) : d.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{d.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {d.contact || d.phone || d.experience_years
                                ? `${d.experience_years ?? 0}y exp`
                                : d.status}
                        </div>
                    </div>
                </div>
            </td>
            <td style={{ textAlign: 'center', fontWeight: 600 }}>{d.totalTrips}</td>
            <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--green-t)' }}>{d.completedCount}</td>
            <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <SparkBar pct={d.completionRate} color={rateColor} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: rateColor, minWidth: 34 }}>
                        {d.completionRate}%
                    </span>
                </div>
            </td>
            <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <SparkBar pct={score} color={scoreColor} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: scoreColor, minWidth: 24 }}>
                        {score}
                    </span>
                </div>
            </td>
            <td>
                <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
                    background: isExpired ? 'rgba(220,38,38,0.15)' : 'rgba(22,163,74,0.15)',
                    color: isExpired ? 'var(--red-t)' : 'var(--green-t)',
                    border: `1px solid ${isExpired ? 'rgba(220,38,38,0.25)' : 'rgba(22,163,74,0.25)'}`,
                }}>
                    {isExpired ? '⚠' : '✓'} {isExpired ? 'Expired' : 'Valid'}
                </span>
            </td>
        </tr>
    );
}

/* ─── Section Header ──────────────────────────────────────── */
function SectionHeader({ icon, title, subtitle, action }) {
    return (
        <div className="table-toolbar" style={{ background: 'transparent' }}>
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{icon}</span>
                    <span className="table-toolbar-title" style={{ fontSize: 15 }}>{title}</span>
                </div>
                {subtitle && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {subtitle}
                    </div>
                )}
            </div>
            {action}
        </div>
    );
}

/* ─── Cost Breakdown Donut (CSS only) ────────────────────────*/
function CostDonut({ fuel, maint }) {
    const total = fuel + maint || 1;
    const fuelPct = Math.round((fuel / total) * 100);
    const maintPct = 100 - fuelPct;
    const circumference = 2 * Math.PI * 36;
    const fuelDash = (fuelPct / 100) * circumference;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '20px 24px' }}>
            <svg width={90} height={90} style={{ flexShrink: 0, transform: 'rotate(-90deg)' }}>
                {/* Track */}
                <circle cx={45} cy={45} r={36} fill="none"
                    stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
                {/* Fuel arc */}
                <circle cx={45} cy={45} r={36} fill="none"
                    stroke="#38bdf8" strokeWidth={10}
                    strokeDasharray={`${fuelDash} ${circumference - fuelDash}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 1s ease', filter: 'drop-shadow(0 0 6px #38bdf880)' }}
                />
                {/* Maint arc */}
                <circle cx={45} cy={45} r={36} fill="none"
                    stroke="#fb923c" strokeWidth={10}
                    strokeDasharray={`${circumference - fuelDash} ${fuelDash}`}
                    strokeDashoffset={-fuelDash}
                    strokeLinecap="round"
                    style={{ transition: 'all 1s ease', filter: 'drop-shadow(0 0 6px #fb923c80)' }}
                />
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: '#38bdf8', boxShadow: '0 0 6px #38bdf8' }} />
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Fuel</span>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#38bdf8' }}>
                        {fuelPct}% <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>${fuel.toLocaleString()}</span>
                    </div>
                </div>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: '#fb923c', boxShadow: '0 0 6px #fb923c' }} />
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Maintenance</span>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#fb923c' }}>
                        {maintPct}% <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>${maint.toLocaleString()}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Main Component ──────────────────────────────────────── */
export default function Analytics() {
    const {
        vehicles, drivers, trips, maintenance, fuelLogs,
        vehicleTotalFuel, vehicleTotalMaintenance,
    } = useFleet();

    const completedTrips = trips.filter(t => t.state === 'completed');

    /* ── KPIs ──────────────────────────────────────────────── */
    const tripCompletionRate = trips.length
        ? Math.round((completedTrips.length / trips.length) * 100) : 0;
    const totalFuelSpend  = fuelLogs.reduce((s, f) => s + (f.cost || 0), 0);
    const totalMaintCost  = maintenance.reduce((s, m) => s + (m.cost || 0), 0);
    const totalOpCost     = totalFuelSpend + totalMaintCost;
    const avgCostPerTrip  = completedTrips.length
        ? Math.round(totalOpCost / completedTrips.length) : 0;

    const animRate  = useCountUp(tripCompletionRate);
    const animFuel  = useCountUp(Math.round(totalFuelSpend));
    const animMaint = useCountUp(Math.round(totalMaintCost));
    const animTotal = useCountUp(Math.round(totalOpCost));

    /* ── ROI ───────────────────────────────────────────────── */
    const vehicleROI = vehicles.map(v => {
        const vid = sid(v);
        const fuel    = vehicleTotalFuel(vid);
        const maint   = vehicleTotalMaintenance(vid);
        const revenue = completedTrips
            .filter(t => sid(t.vehicle) === vid)
            .reduce((s, t) => s + (t.revenue ?? 500), 0);
        const opCost  = fuel + maint;
        const acqCost = v.acquisitionCost ?? v.acquisition_cost ?? 0;
        const roi = acqCost > 0
            ? Number(((revenue - opCost) / acqCost) * 100).toFixed(1)
            : null;
        return { ...v, revenue, fuel, maint, cost: opCost, roi: roi !== null ? Number(roi) : null };
    })
        .filter(v => (v.acquisitionCost ?? v.acquisition_cost ?? 0) > 0)
        .sort((a, b) => (b.roi ?? -Infinity) - (a.roi ?? -Infinity));

    const maxRoi = vehicleROI.length ? Math.max(...vehicleROI.map(v => Math.abs(v.roi ?? 0))) : 1;

    /* ── Heatmap ───────────────────────────────────────────── */
    const weeks = Array.from({ length: 8 }, (_, i) => {
        const start = getWeekStart(7 - i);
        const end   = new Date(start);
        end.setDate(end.getDate() + 7);
        return {
            start, end,
            label: start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        };
    });

    const heatData = vehicles.map(v => {
        const vid = sid(v);
        const cells = weeks.map(({ start, end }) => {
            const weekLogs = fuelLogs.filter(f => {
                const d = new Date(f.date);
                return sid(f.vehicle) === vid && d >= start && d < end;
            });
            const totalLiters = weekLogs.reduce((s, f) => s + (f.liters || 0), 0);
            const odometers   = weekLogs.map(f => f.odometer).filter(Boolean).sort((a, b) => a - b);
            const km = odometers.length >= 2 ? odometers.at(-1) - odometers[0] : 0;
            if (totalLiters < 0.1 || km < 1) return null;
            return Math.round((km / totalLiters) * 10) / 10;
        });
        return { vehicle: v, cells };
    });

    const allVals = heatData.flatMap(r => r.cells).filter(v => v !== null);
    const minEff  = allVals.length ? Math.min(...allVals) : 0;
    const maxEff  = allVals.length ? Math.max(...allVals) : 1;

    /* ── Driver Stats ──────────────────────────────────────── */
    const driverStats = drivers
        .map(d => {
            const did   = sid(d);
            const dTrips = trips.filter(t => sid(t.driver) === did);
            const done  = dTrips.filter(t => t.state === 'completed').length;
            const rate  = dTrips.length ? Math.round((done / dTrips.length) * 100) : 0;
            return { ...d, totalTrips: dTrips.length, completedCount: done, completionRate: rate };
        })
        .sort((a, b) => (b.safetyScore ?? b.safety_score ?? 0) - (a.safetyScore ?? a.safety_score ?? 0));

    return (
        <div className="fade-in">
            {/* ── Page Header ───────────────────────────────── */}
            <div className="page-header">
                <div>
                    <div className="page-title">Analytics &amp; Reports</div>
                    <div className="page-sub">Operational insights · financial performance · fleet health</div>
                </div>
                <div className="page-actions">
                    <button className="btn btn-secondary" onClick={() => showToast({ message: 'CSV export coming soon!', type: 'info' })}>
                        ⬇ Export CSV
                    </button>
                    <button className="btn btn-secondary" onClick={() => showToast({ message: 'PDF export coming soon!', type: 'info' })}>
                        ⬇ Export PDF
                    </button>
                </div>
            </div>

            {/* ── KPI Cards ─────────────────────────────────── */}
            <div className="kpi-grid" style={{ marginBottom: 28 }}>
                <div className="kpi-card green ff-card">
                    <div className="kpi-icon">✅</div>
                    <div className="kpi-label">Trip Completion</div>
                    <div className="kpi-value">{animRate}%</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div className="kpi-sub">{completedTrips.length} / {trips.length} trips</div>
                        <TrendBadge value={tripCompletionRate > 70 ? 8 : -3} />
                    </div>
                </div>
                <div className="kpi-card blue ff-card">
                    <div className="kpi-icon">⛽</div>
                    <div className="kpi-label">Total Fuel Spend</div>
                    <div className="kpi-value">${animFuel.toLocaleString()}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div className="kpi-sub">Across {vehicles.length} vehicles</div>
                        <TrendBadge value={-4} inverse />
                    </div>
                </div>
                <div className="kpi-card orange ff-card">
                    <div className="kpi-icon">🔧</div>
                    <div className="kpi-label">Maintenance Cost</div>
                    <div className="kpi-value">${animMaint.toLocaleString()}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div className="kpi-sub">{maintenance.length} service records</div>
                        <TrendBadge value={12} inverse />
                    </div>
                </div>
                <div className="kpi-card red ff-card">
                    <div className="kpi-icon">💸</div>
                    <div className="kpi-label">Total Op. Cost</div>
                    <div className="kpi-value">${animTotal.toLocaleString()}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div className="kpi-sub">~${avgCostPerTrip.toLocaleString()}/trip avg</div>
                        <TrendBadge value={-2} inverse />
                    </div>
                </div>
            </div>

            {/* ── Bento Row: Cost Donut + Quick Stats ──────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, marginBottom: 24 }}>
                {/* Donut */}
                <div className="table-wrapper ff-card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <SectionHeader icon="📊" title="Cost Split" subtitle="Fuel vs Maintenance" />
                    <CostDonut fuel={totalFuelSpend} maint={totalMaintCost} />
                </div>

                {/* Fleet health quick stats */}
                <div className="table-wrapper ff-card">
                    <SectionHeader icon="🚛" title="Fleet Status Snapshot" />
                    <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {[
                            { label: 'Available', count: vehicles.filter(v => v.status === 'available').length, total: vehicles.length, color: 'var(--green-t)' },
                            { label: 'On Trip',   count: vehicles.filter(v => v.status === 'on_trip').length,   total: vehicles.length, color: 'var(--blue-t)' },
                            { label: 'In Shop',   count: vehicles.filter(v => v.status === 'in_shop').length,   total: vehicles.length, color: 'var(--orange-t)' },
                            { label: 'Retired',   count: vehicles.filter(v => v.status === 'retired').length,   total: vehicles.length, color: 'var(--gray-t)' },
                        ].map(({ label, count, total, color }) => (
                            <div key={label}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
                                    <span style={{ fontWeight: 700, color }}>
                                        {count} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/ {total}</span>
                                    </span>
                                </div>
                                <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 999, overflow: 'hidden' }}>
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

            {/* ── ROI Leaderboard ───────────────────────────── */}
            <div className="table-wrapper" style={{ marginBottom: 24 }}>
                <SectionHeader
                    icon="🏆"
                    title="Vehicle ROI Leaderboard"
                    subtitle="Revenue vs. (Fuel + Maintenance) ÷ Acquisition Cost"
                />
                {vehicleROI.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px 0' }}>
                        <div className="empty-state-icon">📊</div>
                        <div className="empty-state-text">Add vehicle acquisition costs to see ROI</div>
                        <div className="empty-state-sub">Set acquisition_cost when adding a vehicle</div>
                    </div>
                ) : (
                    <>
                        <table className="data-table ff-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 40 }}>#</th>
                                    <th>Vehicle</th>
                                    <th>Type</th>
                                    <th>Revenue</th>
                                    <th>Fuel</th>
                                    <th>Maint.</th>
                                    <th style={{ minWidth: 180 }}>ROI</th>
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
                            <span>ℹ</span>
                            <span>Revenue uses <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 4 }}>trip.revenue</code> if set, otherwise $500/trip estimate</span>
                        </div>
                    </>
                )}
            </div>

            {/* ── Fuel Efficiency Heatmap ───────────────────── */}
            <div className="table-wrapper ff-card" style={{ marginBottom: 24, overflow: 'auto' }}>
                <SectionHeader
                    icon="⛽"
                    title="Fuel Efficiency Heatmap"
                    subtitle="km/L per vehicle per week · last 8 weeks"
                />
                {heatData.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px 0' }}>
                        <div className="empty-state-icon">🗺</div>
                        <div className="empty-state-text">No fuel log data yet</div>
                        <div className="empty-state-sub">Start logging fuel to see weekly efficiency</div>
                    </div>
                ) : (
                    <div style={{ padding: '4px 20px 20px', overflowX: 'auto' }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: `170px repeat(8, minmax(64px, 1fr))`,
                            gap: 5,
                            minWidth: 700,
                        }}>
                            {/* Column headers */}
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, padding: '8px 0' }}>
                                Vehicle
                            </div>
                            {weeks.map((w, i) => (
                                <div key={i} style={{
                                    fontSize: 10, color: 'var(--text-muted)',
                                    textAlign: 'center', fontWeight: 600,
                                    padding: '8px 0',
                                }}>
                                    {w.label}
                                </div>
                            ))}

                            {/* Data rows */}
                            {heatData.map(({ vehicle, cells }) => (
                                <>
                                    <div
                                        key={`label-${sid(vehicle)}`}
                                        style={{
                                            fontSize: 12, fontWeight: 600,
                                            color: 'var(--text-primary)',
                                            overflow: 'hidden', textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap', alignSelf: 'center',
                                            paddingRight: 8,
                                        }}
                                    >
                                        {vehicle.name}
                                    </div>
                                    {cells.map((eff, wi) => {
                                        const tip = eff !== null
                                            ? `${eff} km/L · ${weeks[wi].label}`
                                            : `No data · ${weeks[wi].label}`;
                                        return (
                                            <Tooltip key={`${sid(vehicle)}-${wi}`} text={tip}>
                                                <div style={{
                                                    height: 38,
                                                    borderRadius: 7,
                                                    background: eff !== null
                                                        ? heatColor(eff, minEff, maxEff)
                                                        : 'rgba(255,255,255,0.03)',
                                                    border: `1px solid ${eff !== null ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'}`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    color: eff !== null ? '#fff' : 'var(--text-muted)',
                                                    cursor: 'default',
                                                    transition: 'opacity 0.15s, transform 0.15s',
                                                }}
                                                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                                                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                                >
                                                    {eff !== null ? eff : '—'}
                                                </div>
                                            </Tooltip>
                                        );
                                    })}
                                </>
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
                                Range: {minEff} – {maxEff} km/L
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Driver Performance ────────────────────────── */}
            <div className="table-wrapper">
                <SectionHeader
                    icon="👤"
                    title="Driver Performance"
                    subtitle={`${driverStats.length} drivers · ranked by safety score`}
                />
                {driverStats.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px 0' }}>
                        <div className="empty-state-icon">🧑‍✈️</div>
                        <div className="empty-state-text">No drivers added yet</div>
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
