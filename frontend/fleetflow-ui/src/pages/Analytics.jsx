import { useState, useEffect } from 'react';
import vehicleService from '../services/vehicleService';
import driverService from '../services/driverService';
import tripService from '../services/tripService';
import maintenanceService from '../services/maintenanceService';
import fuelService from '../services/fuelService';

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
            const [vehiclesData, driversData, tripsData, maintenanceData, fuelData] = await Promise.all([
                vehicleService.getAll(),
                driverService.getAll(),
                tripService.getAll(),
                maintenanceService.getAll(),
                fuelService.getAll()
            ]);
            setVehicles(vehiclesData);
            setDrivers(driversData);
            setTrips(tripsData);
            setMaintenance(maintenanceData);
            setFuelLogs(fuelData);
        } catch (error) {
            console.error('Error fetching analytics data:', error);
        } finally {
            setLoading(false);
        }
    };

    const completedTrips = trips.filter(t => t.status === 'Completed');

    // Fuel efficiency: km / L per vehicle
    const fuelEfficiency = vehicles.map(v => {
        const vId = v._id || v.id;
        const logs = fuelLogs.filter(f => f.vehicle_id === vId);
        const totalLiters = logs.reduce((s, f) => s + (f.liters || 0), 0);
        
        const vTrips = completedTrips.filter(t => t.vehicle_id === vId);
        const totalKm = vTrips.reduce((s, t) => {
            if (t.odometer_end && t.odometer_start) {
                return s + (t.odometer_end - t.odometer_start);
            }
            return s;
        }, 0);
        
        return { 
            ...v, 
            totalLiters, 
            totalKm, 
            efficiency: totalLiters > 0 ? (totalKm / totalLiters).toFixed(2) : 'N/A' 
        };
    }).filter(v => v.totalLiters > 0);

    // Helper to get vehicle fuel total
    const vehicleTotalFuel = (vehicleId) => {
        return fuelLogs
            .filter(f => f.vehicle_id === vehicleId)
            .reduce((s, f) => s + (f.cost || 0), 0);
    };

    // Helper to get vehicle maintenance total
    const vehicleTotalMaintenance = (vehicleId) => {
        return maintenance
            .filter(m => m.vehicle_id === vehicleId)
            .reduce((s, m) => s + (m.cost || 0), 0);
    };

    // Vehicle ROI (using mock revenue of $500 per trip)
    const vehicleROI = vehicles.map(v => {
        const vId = v._id || v.id;
        const fuel = vehicleTotalFuel(vId);
        const maint = vehicleTotalMaintenance(vId);
        const revenue = completedTrips.filter(t => t.vehicle_id === vId).length * 500;
        const cost = fuel + maint;
        const acquisitionCost = 50000; // Mock acquisition cost
        const roi = acquisitionCost > 0 ? (((revenue - cost) / acquisitionCost) * 100).toFixed(1) : 'N/A';
        return { ...v, revenue, fuel, maint, cost, roi };
    }).filter(v => v.revenue > 0 || v.cost > 0);

    // Trip stats
    const tripCompletionRate = trips.length ? Math.round((completedTrips.length / trips.length) * 100) : 0;
    const totalFuelSpend = fuelLogs.reduce((s, f) => s + (f.cost || 0), 0);
    const totalMaintCost = maintenance.reduce((s, m) => s + (m.cost || 0), 0);

    // Driver performance
    const driverStats = drivers.map(d => {
        const dId = d._id || d.id;
        const dTrips = trips.filter(t => t.driver_id === dId);
        const done = dTrips.filter(t => t.status === 'Completed').length;
        const rate = dTrips.length ? Math.round((done / dTrips.length) * 100) : 0;
        return { ...d, totalTrips: dTrips.length, completedTrips: done, completionRate: rate };
    });

    const maxEff = Math.max(...fuelEfficiency.map(v => Number(v.efficiency) || 0), 1);

    if (loading) {
        return <div className="loading">Loading analytics...</div>;
    }

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <div className="page-title">Analytics & Reports</div>
                    <div className="page-sub">Operational insights and financial performance</div>
                </div>
                <div className="page-actions">
                    <button className="btn btn-secondary" onClick={() => alert('CSV export coming soon!')}>⬇ Export CSV</button>
                    <button className="btn btn-secondary" onClick={() => alert('PDF export coming soon!')}>⬇ Export PDF</button>
                </div>
            </div>

            {/* Top KPIs */}
            <div className="kpi-grid" style={{ marginBottom: 24 }}>
                <div className="kpi-card green">
                    <div className="kpi-icon">✅</div>
                    <div className="kpi-label">Trip Completion Rate</div>
                    <div className="kpi-value">{tripCompletionRate}%</div>
                    <div className="kpi-sub">{completedTrips.length} of {trips.length} trips</div>
                </div>
                <div className="kpi-card blue">
                    <div className="kpi-icon">⛽</div>
                    <div className="kpi-label">Total Fuel Spend</div>
                    <div className="kpi-value">${(totalFuelSpend / 1000).toFixed(1)}k</div>
                    <div className="kpi-sub">Across all vehicles</div>
                </div>
                <div className="kpi-card orange">
                    <div className="kpi-icon">🔧</div>
                    <div className="kpi-label">Maintenance Cost</div>
                    <div className="kpi-value">${(totalMaintCost / 1000).toFixed(1)}k</div>
                    <div className="kpi-sub">All service records</div>
                </div>
                <div className="kpi-card red">
                    <div className="kpi-icon">💰</div>
                    <div className="kpi-label">Total Op. Cost</div>
                    <div className="kpi-value">${((totalFuelSpend + totalMaintCost) / 1000).toFixed(1)}k</div>
                    <div className="kpi-sub">Fuel + Maintenance</div>
                </div>
            </div>

            <div className="stats-grid">
                {/* Fuel Efficiency */}
                <div className="stat-card">
                    <div className="stat-card-title">⛽ Fuel Efficiency (km/L)</div>
                    {fuelEfficiency.length === 0 ? (
                        <div className="empty-state" style={{ padding: '20px 0' }}>
                            <div className="empty-state-icon">📊</div>
                            <div className="empty-state-text">Not enough data yet</div>
                        </div>
                    ) : (
                        <div className="stat-bar-list">
                            {fuelEfficiency.sort((a, b) => Number(b.efficiency) - Number(a.efficiency)).map(v => (
                                <div key={v._id || v.id} className="stat-bar-item">
                                    <div className="stat-bar-label">
                                        <span style={{ fontSize: 12 }}>{v.name}</span>
                                        <strong>{v.efficiency} km/L</strong>
                                    </div>
                                    <div className="stat-bar-track">
                                        <div className="stat-bar-fill" style={{
                                            width: `${(Number(v.efficiency) / maxEff) * 100}%`,
                                            background: 'linear-gradient(90deg,var(--blue-t),var(--green-t))'
                                        }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Vehicle ROI */}
                <div className="stat-card">
                    <div className="stat-card-title">📈 Vehicle ROI (%)</div>
                    {vehicleROI.length === 0 ? (
                        <div className="empty-state" style={{ padding: '20px 0' }}>
                            <div className="empty-state-icon">📊</div>
                            <div className="empty-state-text">No trip data yet</div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {vehicleROI.map(v => (
                                <div key={v._id || v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600 }}>{v.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                            Revenue ${v.revenue.toLocaleString()} · Cost ${v.cost.toLocaleString()}
                                        </div>
                                    </div>
                                    <span style={{
                                        fontWeight: 700, fontSize: 14,
                                        color: Number(v.roi) > 0 ? 'var(--green-t)' : 'var(--red-t)'
                                    }}>
                                        {v.roi !== 'N/A' ? `${v.roi}%` : '—'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Driver Performance Table */}
            <div className="table-wrapper" style={{ marginTop: 20 }}>
                <div className="table-toolbar">
                    <span className="table-toolbar-title">Driver Performance</span>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Driver</th><th>Total Trips</th><th>Completed</th>
                            <th>Completion Rate</th><th>Safety Score</th><th>License Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {driverStats.sort((a, b) => b.safety_score - a.safety_score).map(d => (
                            <tr key={d._id || d.id}>
                                <td><strong>{d.name}</strong></td>
                                <td>{d.totalTrips}</td>
                                <td>{d.completedTrips}</td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 60, height: 6, background: 'var(--bg-hover)', borderRadius: 999, overflow: 'hidden' }}>
                                            <div style={{ 
                                                width: `${d.completionRate}%`, 
                                                height: '100%', 
                                                background: d.completionRate > 80 ? 'var(--green-t)' : 'var(--orange-t)', 
                                                borderRadius: 999 
                                            }} />
                                        </div>
                                        <span style={{ fontSize: 12 }}>{d.completionRate}%</span>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 60, height: 6, background: 'var(--bg-hover)', borderRadius: 999, overflow: 'hidden' }}>
                                            <div style={{ 
                                                width: `${d.safety_score}%`, 
                                                height: '100%', 
                                                background: d.safety_score > 80 ? 'var(--green-t)' : d.safety_score > 60 ? 'var(--orange-t)' : 'var(--red-t)', 
                                                borderRadius: 999 
                                            }} />
                                        </div>
                                        <span style={{ fontSize: 12 }}>{d.safety_score}</span>
                                    </div>
                                </td>
                                <td>
                                    <span style={{
                                        fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
                                        background: new Date(d.license_expiry) < new Date() ? 'var(--red-bg)' : 'var(--green-bg)',
                                        color: new Date(d.license_expiry) < new Date() ? 'var(--red-t)' : 'var(--green-t)',
                                    }}>
                                        {new Date(d.license_expiry) < new Date() ? 'Expired' : 'Valid'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                ℹ Vehicle ROI uses mock revenue of $500/completed trip. Connect real revenue data via backend API.
            </div>
        </div>
    );
}