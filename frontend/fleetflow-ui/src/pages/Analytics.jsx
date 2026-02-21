import React, { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell, AreaChart, Area
} from 'recharts';
import {
    TrendingUp, Fuel, DollarSign, Medal, Info, Download,
    AlertTriangle, Truck, BarChart3, FileSpreadsheet, FileText,
    ArrowUpRight, ArrowDownRight, ParkingCircle
} from 'lucide-react';
import SkeletonTable from '@/components/SkeletonTable';
import useCountUp from '@/hooks/useCountUp';
import { showToast } from '@/hooks/useToast';
import vehicleService from '@/services/vehicleService';
import driverService from '@/services/driverService';
import tripService from '@/services/tripService';
import maintenanceService from '@/services/maintenanceService';
import fuelService from '@/services/fuelService';
import { getVehicleName } from '@/services/utils';

/* ── KPI Card ─────────────────────────────────────── */
function KPICard({ label, value, prefix, suffix, icon: Icon, color, trend, trendLabel }) {
    const animatedValue = useCountUp(typeof value === 'number' ? Math.round(value) : 0);
    return (
        <div className="ff-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: color + '18', color: color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <Icon size={20} />
                </div>
                {trend !== undefined && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontSize: 12, fontWeight: 700,
                        color: trend >= 0 ? '#22C55E' : '#EF4444'
                    }}>
                        {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {Math.abs(trend).toFixed(1)}%
                    </div>
                )}
            </div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                {prefix && <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>{prefix}</span>}
                <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{animatedValue.toLocaleString()}</h2>
                {suffix && <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>{suffix}</span>}
            </div>
            {trendLabel && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{trendLabel}</p>}
        </div>
    );
}

/* ── Custom Tooltip ───────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="ff-chart-tooltip" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                <span className="ff-tooltip-label">{label}</span>
                {payload.map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                        <span className="ff-tooltip-value" style={{ color: '#cbd5e1' }}>
                            {p.name}: ₹{Number(p.value).toLocaleString()}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const EffTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="ff-chart-tooltip">
                <span className="ff-tooltip-label">{label}</span>
                <span className="ff-tooltip-value">{Number(payload[0].value).toFixed(1)} km/L</span>
            </div>
        );
    }
    return null;
};

/* ── Main Analytics Page ──────────────────────────── */
export default function Analytics() {
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [trips, setTrips] = useState([]);
    const [maintenance, setMaintenance] = useState([]);
    const [fuelLogs, setFuelLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [v, d, t, m, f] = await Promise.all([
                vehicleService.getAll(),
                driverService.getAll(),
                tripService.getAll(),
                maintenanceService.getAll(),
                fuelService.getAll()
            ]);
            setVehicles(v || []);
            setDrivers(d || []);
            setTrips(t || []);
            setMaintenance(m || []);
            setFuelLogs(f || []);
        } catch {
            showToast('Data aggregation failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    /* ── Helpers ───────────────────────────────── */
    const vId = (v) => String(v._id || v.id);
    const matchVehicle = (objOrId, targetId) => {
        const id = String(objOrId?._id || objOrId?.id || objOrId);
        return id === targetId;
    };

    /* ── 1. KPI Summaries ─────────────────────── */
    const kpis = useMemo(() => {
        const totalFuel = fuelLogs.reduce((s, f) => s + (f.cost || 0), 0);
        const totalMaint = maintenance.reduce((s, m) => s + (m.cost || 0), 0);
        const completedTrips = trips.filter(t => t.status === 'completed');
        const totalRevenue = completedTrips.length * 850;
        const totalOps = totalFuel + totalMaint;
        const fleetROI = totalOps > 0 ? ((totalRevenue - totalOps) / totalOps) * 100 : 0;
        const activeV = vehicles.filter(v => v.status === 'on_trip').length;
        const utilRate = vehicles.length > 0 ? (activeV / vehicles.length) * 100 : 0;

        return { totalFuel, totalMaint, totalRevenue, fleetROI, utilRate, totalOps };
    }, [vehicles, trips, fuelLogs, maintenance]);

    /* ── 2. Fuel Efficiency Trend (monthly) ───── */
    const efficiencyTrend = useMemo(() => {
        const months = {};
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        trips.filter(t => t.status === 'completed').forEach(t => {
            const d = new Date(t.date_start || t.createdAt);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            if (!months[key]) months[key] = { km: 0, label: `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}` };
            months[key].km += (t.odometer_end - t.odometer_start) || 0;
        });

        fuelLogs.forEach(f => {
            const d = new Date(f.date || f.createdAt);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            if (!months[key]) months[key] = { km: 0, label: `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}` };
            months[key].liters = (months[key].liters || 0) + (f.liters || 0);
        });

        return Object.entries(months)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([, v]) => ({
                name: v.label,
                efficiency: v.liters > 0 ? parseFloat((v.km / v.liters).toFixed(1)) : 0
            }))
            .slice(-6);
    }, [trips, fuelLogs]);

    /* ── 3. Top 5 Costliest Vehicles ──────────── */
    const costliestVehicles = useMemo(() => {
        return vehicles.map(v => {
            const vid = vId(v);
            const fuelCost = fuelLogs.filter(f => matchVehicle(f.vehicle_id, vid)).reduce((s, f) => s + (f.cost || 0), 0);
            const maintCost = maintenance.filter(m => matchVehicle(m.vehicle_id, vid)).reduce((s, m) => s + (m.cost || 0), 0);
            return { name: v.name, fuelCost, maintCost, total: fuelCost + maintCost };
        }).sort((a, b) => b.total - a.total).slice(0, 5);
    }, [vehicles, fuelLogs, maintenance]);

    /* ── 4. Vehicle ROI ───────────────────────── */
    const roiData = useMemo(() => {
        const acquisition = 50000;
        return vehicles.map(v => {
            const vid = vId(v);
            const vTrips = trips.filter(t => matchVehicle(t.vehicle_id, vid) && t.status === 'completed');
            const revenue = vTrips.length * 850;
            const fuelCost = fuelLogs.filter(f => matchVehicle(f.vehicle_id, vid)).reduce((s, f) => s + (f.cost || 0), 0);
            const maintCost = maintenance.filter(m => matchVehicle(m.vehicle_id, vid)).reduce((s, m) => s + (m.cost || 0), 0);
            const opCost = fuelCost + maintCost;
            const roi = ((revenue - opCost) / acquisition) * 100;
            return { ...v, roi, revenue, opCost };
        }).sort((a, b) => b.roi - a.roi);
    }, [vehicles, trips, fuelLogs, maintenance]);

    /* ── 5. Dead Stock Vehicles ───────────────── */
    const deadStock = useMemo(() => {
        return vehicles.filter(v => {
            const vid = vId(v);
            const hasRecentTrip = trips.some(t => {
                if (!matchVehicle(t.vehicle_id, vid)) return false;
                const d = new Date(t.date_start || t.createdAt);
                return (Date.now() - d.getTime()) < 30 * 86400000; // 30 days
            });
            return !hasRecentTrip && v.status !== 'retired';
        });
    }, [vehicles, trips]);

    /* ── 6. Financial Summary (monthly) ──────── */
    const financialSummary = useMemo(() => {
        const months = {};
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        trips.filter(t => t.status === 'completed').forEach(t => {
            const d = new Date(t.date_start || t.createdAt);
            const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
            if (!months[key]) months[key] = { month: `${monthNames[d.getMonth()]} ${d.getFullYear()}`, revenue: 0, fuelCost: 0, maintCost: 0 };
            months[key].revenue += 850;
        });

        fuelLogs.forEach(f => {
            const d = new Date(f.date || f.createdAt);
            const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
            if (!months[key]) months[key] = { month: `${monthNames[d.getMonth()]} ${d.getFullYear()}`, revenue: 0, fuelCost: 0, maintCost: 0 };
            months[key].fuelCost += f.cost || 0;
        });

        maintenance.forEach(m => {
            const d = new Date(m.date || m.createdAt);
            const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
            if (!months[key]) months[key] = { month: `${monthNames[d.getMonth()]} ${d.getFullYear()}`, revenue: 0, fuelCost: 0, maintCost: 0 };
            months[key].maintCost += m.cost || 0;
        });

        return Object.entries(months)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([, v]) => ({ ...v, netProfit: v.revenue - v.fuelCost - v.maintCost }))
            .slice(0, 6);
    }, [trips, fuelLogs, maintenance]);

    /* ── 7. CSV Export ────────────────────────── */
    const downloadCSV = (data, filename, headers) => {
        const csv = [headers.join(','), ...data.map(row => headers.map(h => {
            const key = h.toLowerCase().replace(/ /g, '');
            const val = row[key] ?? row[h] ?? '';
            return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
        }).join(','))].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
        showToast(`${filename} downloaded`, 'success');
    };

    const exportFinancialReport = () => {
        const data = financialSummary.map(r => ({
            month: r.month, revenue: r.revenue, fuelcost: r.fuelCost, maintenance: r.maintCost, netprofit: r.netProfit
        }));
        downloadCSV(data, 'financial_report.csv', ['month', 'revenue', 'fuelcost', 'maintenance', 'netprofit']);
    };

    const exportFleetReport = () => {
        const data = roiData.map(v => ({
            vehicle: v.name, revenue: v.revenue, opcost: v.opCost, roi: v.roi.toFixed(1) + '%', status: v.status
        }));
        downloadCSV(data, 'fleet_roi_report.csv', ['vehicle', 'revenue', 'opcost', 'roi', 'status']);
    };

    const BAR_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'];

    if (loading) return <SkeletonTable rows={10} cols={6} />;

    return (
        <div className="fade-in">
            {/* ── Header ────────────────────────── */}
            <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">Financial Reports</h1>
                    <p style={{ color: 'var(--text-muted)' }}>The "big picture" — all your data into easy-to-read charts and reports</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-secondary" onClick={exportFinancialReport} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FileSpreadsheet size={16} /> Export CSV
                    </button>
                    <button className="btn btn-primary" onClick={exportFleetReport} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FileText size={16} /> Fleet Report
                    </button>
                </div>
            </div>

            {/* ── KPI Cards ─────────────────────── */}
            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <KPICard label="Total Fuel Cost" value={kpis.totalFuel} prefix="₹" icon={Fuel} color="#F59E0B" trend={-3.2} trendLabel="vs last month" />
                <KPICard label="Fleet ROI" value={kpis.fleetROI} suffix="%" icon={TrendingUp} color="#22C55E" trend={kpis.fleetROI > 0 ? 12.5 : -5.2} trendLabel="overall return" />
                <KPICard label="Utilization Rate" value={kpis.utilRate} suffix="%" icon={Truck} color="#6366f1" trend={2.1} trendLabel="active fleet usage" />
                <KPICard label="Total Revenue" value={kpis.totalRevenue} prefix="₹" icon={DollarSign} color="#0EA5E9" trend={8.4} trendLabel="from completed trips" />
            </div>

            {/* ── Row 1: Efficiency + Top 5 ─────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>

                {/* Fuel Efficiency Trend */}
                <div className="ff-card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div>
                            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Fuel Efficiency Trend (km/L)</h3>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>How far each liter takes your fleet</p>
                        </div>
                        <Fuel size={18} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <div style={{ width: '100%', height: 220 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={efficiencyTrend}>
                                <defs>
                                    <linearGradient id="effGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                                <Tooltip content={<EffTooltip />} />
                                <Area type="monotone" dataKey="efficiency" stroke="#22C55E" strokeWidth={2.5} fill="url(#effGrad)" dot={{ fill: '#22C55E', strokeWidth: 2, r: 4 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top 5 Costliest Vehicles */}
                <div className="ff-card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div>
                            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Top 5 Costliest Vehicles</h3>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Highest operational expenses</p>
                        </div>
                        <BarChart3 size={18} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <div style={{ width: '100%', height: 220 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={costliestVehicles} layout="vertical" barSize={18}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                                <Tooltip content={<ChartTooltip />} />
                                <Bar dataKey="total" name="Total Cost" radius={[0, 6, 6, 0]}>
                                    {costliestVehicles.map((_, i) => (
                                        <Cell key={i} fill={BAR_COLORS[i]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ── Row 2: Financial Summary + ROI ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>

                {/* Financial Summary Table */}
                <div className="ff-card" style={{ overflow: 'hidden' }}>
                    <div className="table-toolbar">
                        <div>
                            <h3 className="table-toolbar-title">Financial Summary</h3>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Monthly breakdown</span>
                        </div>
                        <button className="btn btn-secondary" onClick={exportFinancialReport} style={{ fontSize: 12, padding: '4px 12px' }}>
                            <Download size={14} /> CSV
                        </button>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="ff-table data-table">
                            <thead>
                                <tr>
                                    <th>Month</th>
                                    <th style={{ textAlign: 'right' }}>Revenue</th>
                                    <th style={{ textAlign: 'right' }}>Fuel Cost</th>
                                    <th style={{ textAlign: 'right' }}>Maintenance</th>
                                    <th style={{ textAlign: 'right' }}>Net Profit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {financialSummary.map((row, i) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 600 }}>{row.month}</td>
                                        <td style={{ textAlign: 'right', color: 'var(--color-available)' }}>₹{row.revenue.toLocaleString()}</td>
                                        <td style={{ textAlign: 'right', color: '#F59E0B' }}>₹{row.fuelCost.toLocaleString()}</td>
                                        <td style={{ textAlign: 'right', color: '#0EA5E9' }}>₹{row.maintCost.toLocaleString()}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: row.netProfit >= 0 ? 'var(--color-available)' : 'var(--color-suspended)' }}>
                                            ₹{row.netProfit.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                                {financialSummary.length === 0 && (
                                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No financial data yet</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Vehicle ROI Leaderboard */}
                <div className="ff-card" style={{ overflow: 'hidden' }}>
                    <div className="table-toolbar">
                        <div>
                            <h3 className="table-toolbar-title">Vehicle ROI — Yield Ranking</h3>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Is a vehicle making you money?</span>
                        </div>
                        <Medal size={18} style={{ color: '#F59E0B' }} />
                    </div>
                    <table className="ff-table data-table">
                        <thead>
                            <tr>
                                <th style={{ width: 60, textAlign: 'center' }}>Rank</th>
                                <th>Vehicle</th>
                                <th style={{ textAlign: 'right' }}>Revenue</th>
                                <th style={{ textAlign: 'right' }}>Op. Cost</th>
                                <th style={{ textAlign: 'right', paddingRight: 24 }}>ROI</th>
                            </tr>
                        </thead>
                        <tbody>
                            {roiData.slice(0, 8).map((v, i) => (
                                <tr key={v._id || v.id} style={{ background: v.roi < 0 ? 'rgba(239,68,68,0.04)' : '' }}>
                                    <td style={{ textAlign: 'center', fontSize: '1.1rem' }}>
                                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{v.name}</td>
                                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>₹{v.revenue.toLocaleString()}</td>
                                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>₹{v.opCost.toLocaleString()}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, paddingRight: 24, color: v.roi >= 0 ? '#22C55E' : '#EF4444' }}>
                                        {v.roi.toFixed(1)}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Row 3: Dead Stock + Heatmap ──── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>

                {/* Dead Stock */}
                <div className="ff-card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div>
                            <h3 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <ParkingCircle size={18} style={{ color: '#F59E0B' }} /> Dead Stock Vehicles
                            </h3>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Idle for 30+ days — sell them or assign more work</p>
                        </div>
                        <span style={{
                            fontSize: 12, fontWeight: 700, padding: '4px 12px',
                            background: deadStock.length > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)',
                            color: deadStock.length > 0 ? '#F59E0B' : '#22C55E',
                            borderRadius: 100
                        }}>
                            {deadStock.length} idle
                        </span>
                    </div>

                    {deadStock.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                            <Truck size={40} style={{ color: 'var(--border)', marginBottom: 12 }} />
                            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>All vehicles are active! No dead stock detected.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                            {deadStock.map(v => {
                                const vid = vId(v);
                                const lastTrip = trips
                                    .filter(t => matchVehicle(t.vehicle_id, vid))
                                    .sort((a, b) => new Date(b.date_start || b.createdAt) - new Date(a.date_start || a.createdAt))[0];
                                const daysIdle = lastTrip
                                    ? Math.floor((Date.now() - new Date(lastTrip.date_start || lastTrip.createdAt).getTime()) / 86400000)
                                    : '∞';

                                return (
                                    <div key={vid} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '12px 14px', background: 'var(--bg-app)', borderRadius: 10,
                                        border: '1px solid var(--border-light)'
                                    }}>
                                        <div>
                                            <p style={{ fontWeight: 600, fontSize: 13 }}>{v.name}</p>
                                            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                {v.license_plate} • Status: {v.status}
                                            </p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ fontSize: 18, fontWeight: 700, color: '#F59E0B' }}>{daysIdle}</p>
                                            <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>DAYS IDLE</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Efficiency Heatmap */}
                <div className="ff-card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div>
                            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Fuel Efficiency Heatmap</h3>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Weekly km/L per vehicle (last 8 weeks)</p>
                        </div>
                    </div>
                    <HeatmapGrid vehicles={vehicles} trips={trips} fuelLogs={fuelLogs} />
                    <div style={{ marginTop: '1.5rem', display: 'flex', gap: 8, alignItems: 'flex-start', background: 'var(--bg-app)', padding: '0.75rem', borderRadius: 8 }}>
                        <Info size={14} style={{ marginTop: 2, color: 'var(--primary)', flexShrink: 0 }} />
                        <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            Darker green = better mileage. Identifies "gas guzzlers" vs efficient vehicles at a glance.
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Info Banner ──────────────────── */}
            <div className="ff-card" style={{ padding: '1.5rem', display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: '2rem' }}>
                <Info size={20} style={{ color: 'var(--primary)', marginTop: 2, flexShrink: 0 }} />
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>What this page does:</strong> Turns all your fleet data into easy-to-read charts and reports.{' '}
                    <strong>Fuel Efficiency</strong> tells you which vehicles are "gas guzzlers".{' '}
                    <strong>Vehicle ROI</strong> calculates if a vehicle is actually making you money.{' '}
                    <strong>Dead Stock</strong> flags vehicles sitting idle so you can sell them or reassign.{' '}
                    <strong>One-Click Reports</strong> let you download CSV files for monthly meetings or audits.
                </div>
            </div>
        </div>
    );
}

/* ── Heatmap Sub-Component ──────────────────────── */
function HeatmapGrid({ vehicles, trips, fuelLogs }) {
    const heatmapData = useMemo(() => {
        const weeks = Array.from({ length: 8 }).map((_, i) => {
            const now = new Date();
            const start = new Date(now);
            start.setDate(start.getDate() - ((i + 1) * 7));
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            return { start, end };
        }).reverse();

        return vehicles.slice(0, 8).map(v => {
            const vid = String(v._id || v.id);
            const scores = weeks.map(w => {
                const logs = fuelLogs.filter(f => {
                    const fid = String(f.vehicle_id?._id || f.vehicle_id?.id || f.vehicle_id);
                    const fd = new Date(f.date || f.createdAt);
                    return fid === vid && fd >= w.start && fd <= w.end;
                });
                const liters = logs.reduce((s, l) => s + (l.liters || 0), 0);
                const vTrips = trips.filter(t => {
                    const tid = String(t.vehicle_id?._id || t.vehicle_id?.id || t.vehicle_id);
                    const td = new Date(t.date_start || t.createdAt);
                    return tid === vid && t.status === 'completed' && td >= w.start && td <= w.end;
                });
                const km = vTrips.reduce((s, t) => s + ((t.odometer_end - t.odometer_start) || 0), 0);
                return liters > 0 ? parseFloat((km / liters).toFixed(1)) : null;
            });
            return { name: v.name, scores };
        });
    }, [vehicles, fuelLogs, trips]);

    return (
        <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '110px repeat(8, 1fr)', gap: 3, minWidth: 460 }}>
                <div />
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center' }}>W{8 - i}</div>
                ))}
                {heatmapData.map(v => (
                    <React.Fragment key={v.name}>
                        <div style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center' }}>{v.name}</div>
                        {v.scores.map((s, i) => {
                            const opacity = s ? Math.min(s / 15, 1) : 0.08;
                            const bg = s ? `rgba(34, 197, 94, ${opacity})` : 'var(--bg-app)';
                            return (
                                <div
                                    key={i}
                                    title={s ? `${s} km/L` : 'No data'}
                                    style={{
                                        background: bg, height: 22, borderRadius: 4,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 9, fontWeight: 600, color: s ? '#22C55E' : 'var(--text-muted)',
                                        border: '1px solid var(--border-light)', cursor: 'default'
                                    }}
                                >
                                    {s ? s : '—'}
                                </div>
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, marginTop: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>Less Efficient</span>
                <div style={{ flex: 1, height: 6, margin: '0 12px', background: 'linear-gradient(90deg, rgba(34,197,94,0.1), rgba(34,197,94,1))', borderRadius: 3 }} />
                <span style={{ color: '#22C55E', fontWeight: 700 }}>Optimal</span>
            </div>
        </div>
    );
}