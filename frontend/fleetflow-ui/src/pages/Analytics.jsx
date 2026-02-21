import React, { useState, useEffect, useMemo } from 'react';
import {
    BarChart3,
    TrendingUp,
    Fuel,
    Settings as Tools,
    DollarSign,
    Medal,
    Info,
    ChevronDown
} from 'lucide-react';
import SkeletonTable from '@/components/SkeletonTable';
import useCountUp from '@/hooks/useCountUp';
import { showToast } from '@/hooks/useToast';
import vehicleService from '@/services/vehicleService';
import driverService from '@/services/driverService';
import tripService from '@/services/tripService';
import maintenanceService from '@/services/maintenanceService';
import fuelService from '@/services/fuelService';

export default function Analytics() {
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [trips, setTrips] = useState([]);
    const [maintenance, setMaintenance] = useState([]);
    const [fuelLogs, setFuelLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

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

    const roiData = useMemo(() => {
        const acquisition_cost = 50000;
        return vehicles.map(v => {
            const vId = String(v._id || v.id);
            const vTrips = trips.filter(t => String(t.vehicle_id?._id || t.vehicle_id?.id || t.vehicle_id) === vId && t.status === 'completed');
            const revenue = vTrips.length * 850;
            const fuelCost = fuelLogs.filter(f => String(f.vehicle_id?._id || f.vehicle_id?.id || f.vehicle_id) === vId).reduce((s, f) => s + (f.cost || 0), 0);
            const maintCost = maintenance.filter(m => String(m.vehicle_id?._id || m.vehicle_id?.id || m.vehicle_id) === vId).reduce((s, m) => s + (m.cost || 0), 0);
            const opCost = fuelCost + maintCost;
            const roi = ((revenue - opCost) / acquisition_cost) * 100;
            return { ...v, roi, revenue, opCost };
        }).sort((a, b) => b.roi - a.roi);
    }, [vehicles, trips, fuelLogs, maintenance]);

    const heatmapData = useMemo(() => {
        // Last 8 weeks
        const weeks = Array.from({ length: 8 }).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (i * 7));
            return { start: new Date(d.setDate(d.getDate() - d.getDay())), end: new Date(d.setDate(d.getDate() - d.getDay() + 6)) };
        }).reverse();

        return vehicles.slice(0, 10).map(v => {
            const vId = String(v._id || v.id);
            const scores = weeks.map(w => {
                const logs = fuelLogs.filter(f => String(f.vehicle_id?._id || f.vehicle_id?.id || f.vehicle_id) === vId && new Date(f.date) >= w.start && new Date(f.date) <= w.end);
                const liters = logs.reduce((s, l) => s + (l.liters || 0), 0);
                const vTrips = trips.filter(t => String(t.vehicle_id?._id || t.vehicle_id?.id || t.vehicle_id) === vId && t.status === 'completed' && new Date(t.date_start) >= w.start && new Date(t.date_start) <= w.end);
                const km = vTrips.reduce((s, t) => s + (t.odometer_end - t.odometer_start || 0), 0);
                return liters > 0 ? (km / liters) : null;
            });
            return { name: v.name, scores };
        });
    }, [vehicles, fuelLogs, trips]);

    if (loading) return <SkeletonTable rows={10} cols={6} />;

    return (
        <div className="fade-in">
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1 className="page-title">Strategic Analytics</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Financial performance and efficiency auditing</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-secondary">Download audit</button>
                    <button className="btn btn-primary">Refresh Intel</button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

                {/* ROI Leaderboard */}
                <div className="ff-card">
                    <div className="table-toolbar">
                        <div>
                            <h3 className="table-toolbar-title">Yield Ranking (ROI)</h3>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Asset Acquisition vs. Revenue</span>
                        </div>
                    </div>
                    <table className="ff-table data-table">
                        <thead>
                            <tr>
                                <th style={{ width: '80px', textAlign: 'center' }}>Rank</th>
                                <th>Asset Details</th>
                                <th style={{ textAlign: 'right', paddingRight: '24px' }}>Yield ROI</th>
                            </tr>
                        </thead>
                        <tbody>
                            {roiData.map((v, i) => (
                                <tr key={v._id || v.id} style={{ background: v.roi < 0 ? 'rgba(239, 68, 68, 0.05)' : '' }}>
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.25rem' }}>
                                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            Rev: ${v.revenue.toLocaleString()} <span style={{ opacity: 0.3 }}>|</span> Op: ${v.opCost.toLocaleString()}
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, paddingRight: '24px', color: v.roi >= 0 ? 'var(--color-available)' : 'var(--color-suspended)' }}>
                                        {v.roi.toFixed(1)}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Efficiency Heatmap */}
                <div className="ff-card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '1.5rem' }}>Fuel Efficiency Heatmap (km/L)</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '120px repeat(8, 1fr)', gap: '4px', minWidth: '500px' }}>
                            <div />
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center' }}>
                                    W{8 - i}
                                </div>
                            ))}
                            {heatmapData.map(v => (
                                <React.Fragment key={v.name}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.name}</div>
                                    {v.scores.map((s, i) => {
                                        const opacity = s ? Math.min(s / 15, 1) : 0.1;
                                        const color = s ? `rgba(34, 197, 94, ${opacity})` : 'var(--bg-app)';
                                        return (
                                            <div
                                                key={i}
                                                style={{ background: color, height: '20px', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', border: '1px solid var(--border-light)' }}
                                                title={s ? `${s.toFixed(1)} km/L` : 'No data'}
                                            >
                                                {s ? '' : '—'}
                                            </div>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                    <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Less Efficient</span>
                            <div style={{ flex: 1, height: '8px', margin: '0 1rem', background: 'linear-gradient(90deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 1))', borderRadius: '4px' }} />
                            <span style={{ color: 'var(--color-available)', fontWeight: 700 }}>Optimal</span>
                        </div>
                    </div>
                    <div style={{ marginTop: '1.5rem', display: 'flex', gap: '8px', alignItems: 'flex-start', background: 'var(--bg-app)', padding: '0.75rem', borderRadius: '8px' }}>
                        <Info size={14} style={{ marginTop: '2px', color: 'var(--primary)' }} />
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            Heatmap correlates GPS odometer deltas against fuel consumption. Darker green indicates lower litre-to-km ratio.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}