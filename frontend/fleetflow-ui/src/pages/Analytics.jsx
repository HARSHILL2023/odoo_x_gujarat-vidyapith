import { useFleet } from '../context/FleetContext';

export default function Analytics() {
    const { vehicles, drivers, trips, maintenance, fuelLogs, vehicleTotalFuel, vehicleTotalMaintenance } = useFleet();

    const completedTrips = trips.filter(t => t.state === 'completed');

    // Fuel efficiency: km / L per vehicle
    const fuelEfficiency = vehicles.map(v => {
        const logs = fuelLogs.filter(f => f.vehicleId === v.id);
        const totalLiters = logs.reduce((s, f) => s + f.liters, 0);
        const vTrips = completedTrips.filter(t => t.vehicleId === v.id);
        const totalKm = vTrips.reduce((s, t) => {
            if (t.odometerStart && t.odometerEnd) return s + (t.odometerEnd - t.odometerStart);
            return s;
        }, 0);
        return { ...v, totalLiters, totalKm, efficiency: totalLiters > 0 ? (totalKm / totalLiters).toFixed(2) : 'N/A' };
    }).filter(v => v.totalLiters > 0);

    // Vehicle ROI
    const vehicleROI = vehicles.map(v => {
        const fuel = vehicleTotalFuel(v.id);
        const maint = vehicleTotalMaintenance(v.id);
        const revenue = completedTrips.filter(t => t.vehicleId === v.id).length * 500; // mock $500/trip
        const cost = fuel + maint;
        const roi = v.acquisitionCost > 0 ? (((revenue - cost) / v.acquisitionCost) * 100).toFixed(1) : 'N/A';
        return { ...v, revenue, fuel, maint, cost, roi };
    }).filter(v => v.acquisitionCost > 0);

    // Trip stats
    const tripCompletionRate = trips.length ? Math.round((completedTrips.length / trips.length) * 100) : 0;
    const totalFuelSpend = fuelLogs.reduce((s, f) => s + f.cost, 0);
    const totalMaintCost = maintenance.reduce((s, m) => s + m.cost, 0);

    // Driver performance table
    const driverStats = drivers.map(d => {
        const dTrips = trips.filter(t => t.driverId === d.id);
        const done = dTrips.filter(t => t.state === 'completed').length;
        const rate = dTrips.length ? Math.round((done / dTrips.length) * 100) : 0;
        return { ...d, totalTrips: dTrips.length, completedTrips: done, completionRate: rate };
    });

    const maxEff = Math.max(...fuelEfficiency.map(v => Number(v.efficiency) || 0), 1);

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <div className="page-title">Analytics & Reports</div>
                    <div className="page-sub">Operational insights and financial performance</div>
                </div>
                <div className="page-actions">
                    <button className="btn btn-secondary" onClick={() => alert('CSV export coming in backend integration!')}>⬇ Export CSV</button>
                    <button className="btn btn-secondary" onClick={() => alert('PDF export coming in backend integration!')}>⬇ Export PDF</button>
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
                                <div key={v.id} className="stat-bar-item">
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
                            <div className="empty-state-text">No acquisition cost data</div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {vehicleROI.map(v => (
                                <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
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
                        {driverStats.sort((a, b) => b.safetyScore - a.safetyScore).map(d => (
                            <tr key={d.id}>
                                <td><strong>{d.name}</strong></td>
                                <td>{d.totalTrips}</td>
                                <td>{d.completedTrips}</td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 60, height: 6, background: 'var(--bg-hover)', borderRadius: 999, overflow: 'hidden' }}>
                                            <div style={{ width: `${d.completionRate}%`, height: '100%', background: d.completionRate > 80 ? 'var(--green-t)' : 'var(--orange-t)', borderRadius: 999 }} />
                                        </div>
                                        <span style={{ fontSize: 12 }}>{d.completionRate}%</span>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 60, height: 6, background: 'var(--bg-hover)', borderRadius: 999, overflow: 'hidden' }}>
                                            <div style={{ width: `${d.safetyScore}%`, height: '100%', background: d.safetyScore > 80 ? 'var(--green-t)' : d.safetyScore > 60 ? 'var(--orange-t)' : 'var(--red-t)', borderRadius: 999 }} />
                                        </div>
                                        <span style={{ fontSize: 12 }}>{d.safetyScore}</span>
                                    </div>
                                </td>
                                <td>
                                    <span style={{
                                        fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
                                        background: new Date(d.licenseExpiry) < new Date() ? 'var(--red-bg)' : 'var(--green-bg)',
                                        color: new Date(d.licenseExpiry) < new Date() ? 'var(--red-t)' : 'var(--green-t)',
                                    }}>
                                        {new Date(d.licenseExpiry) < new Date() ? 'Expired' : 'Valid'}
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
