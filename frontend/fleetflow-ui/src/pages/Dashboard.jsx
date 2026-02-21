import { useState, useEffect } from 'react';
import StatusBadge from '@/components/StatusBadge';
import { useNavigate } from 'react-router-dom';
import vehicleService from '../services/vehicleService';
import driverService from '../services/driverService';
import tripService from '../services/tripService';
import maintenanceService from '../services/maintenanceService';

export default function Dashboard() {
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [trips, setTrips] = useState([]);
    const [maintenance, setMaintenance] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [vehiclesData, driversData, tripsData, maintenanceData] = await Promise.all([
                vehicleService.getAll(),
                driverService.getAll(),
                tripService.getAll(),
                maintenanceService.getAll()
            ]);
            setVehicles(vehiclesData);
            setDrivers(driversData);
            setTrips(tripsData);
            setMaintenance(maintenanceData);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate KPIs
    const activeFleet = vehicles.filter(v => v.status === 'On Trip').length;
    const inShop = vehicles.filter(v => v.status === 'In Shop').length;
    const available = vehicles.filter(v => v.status === 'Available').length;
    const totalActive = vehicles.filter(v => v.status !== 'Out of Service').length;
    const utilization = totalActive ? Math.round(((totalActive - available) / totalActive) * 100) : 0;
    const pendingCargo = trips.filter(t => t.status === 'Draft').length;
    const openMaint = maintenance.filter(m => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return new Date(m.service_date) > thirtyDaysAgo;
    }).length;

    // Get recent trips
    const recentTrips = [...trips]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

    // Get drivers with expiring licenses (next 30 days)
    const alertDrivers = drivers.filter(d => {
        const exp = new Date(d.license_expiry);
        const soon = new Date();
        soon.setDate(soon.getDate() + 30);
        return exp < soon;
    });

    // Helper to get vehicle name
    const getVehicleName = (idOrObj) => {
        if (!idOrObj) return 'Unknown';
        if (typeof idOrObj === 'object' && idOrObj.name) return idOrObj.name;
        const idStr = String(typeof idOrObj === 'object' ? (idOrObj._id || idOrObj.id) : idOrObj);
        const v = vehicles.find(v => String(v._id || v.id) === idStr);
        return v ? v.name : `Vehicle #${idStr.slice(-6)}`;
    };

    // Helper to get driver name
    const getDriverName = (idOrObj) => {
        if (!idOrObj) return 'Unknown';
        if (typeof idOrObj === 'object' && idOrObj.name) return idOrObj.name;
        const idStr = String(typeof idOrObj === 'object' ? (idOrObj._id || idOrObj.id) : idOrObj);
        const d = drivers.find(d => String(d._id || d.id) === idStr);
        return d ? d.name : `Driver #${idStr.slice(-6)}`;
    };

    if (loading) {
        return <div className="loading">Loading dashboard...</div>;
    }

    return (
        <div className="fade-in">
            {/* KPI Row */}
            <div className="kpi-grid">
                <div className="kpi-card blue" onClick={() => navigate('/trips')} style={{ cursor: 'pointer' }}>
                    <div className="kpi-icon">🚛</div>
                    <div className="kpi-label">Active Fleet</div>
                    <div className="kpi-value">{activeFleet}</div>
                    <div className="kpi-sub">Vehicles currently on trip</div>
                </div>
                <div className="kpi-card orange" onClick={() => navigate('/maintenance')} style={{ cursor: 'pointer' }}>
                    <div className="kpi-icon">🔧</div>
                    <div className="kpi-label">Maintenance Alerts</div>
                    <div className="kpi-value">{inShop}</div>
                    <div className="kpi-sub">{openMaint} recent service records</div>
                </div>
                <div className="kpi-card green">
                    <div className="kpi-icon">📈</div>
                    <div className="kpi-label">Utilization Rate</div>
                    <div className="kpi-value">{utilization}%</div>
                    <div className="kpi-sub">{available} vehicles available</div>
                </div>
                <div className="kpi-card red" onClick={() => navigate('/trips')} style={{ cursor: 'pointer' }}>
                    <div className="kpi-icon">📦</div>
                    <div className="kpi-label">Pending Cargo</div>
                    <div className="kpi-value">{pendingCargo}</div>
                    <div className="kpi-sub">Trips awaiting dispatch</div>
                </div>
            </div>

            {/* Fleet Status Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

                {/* Vehicle Status Overview */}
                <div className="stat-card">
                    <div className="stat-card-title">Fleet Status Overview</div>
                    <div className="stat-bar-list">
                        {[
                            { label: 'Available', count: available, color: 'var(--green-t)', total: vehicles.length },
                            { label: 'On Trip', count: activeFleet, color: 'var(--blue-t)', total: vehicles.length },
                            { label: 'In Shop', count: inShop, color: 'var(--orange-t)', total: vehicles.length },
                            { label: 'Out of Service', count: vehicles.filter(v => v.status === 'Out of Service').length, color: 'var(--red-t)', total: vehicles.length },
                        ].map((item) => (
                            <div key={item.label} className="stat-bar-item">
                                <div className="stat-bar-label">
                                    <span>{item.label}</span>
                                    <strong>{item.count}</strong>
                                </div>
                                <div className="stat-bar-track">
                                    <div
                                        className="stat-bar-fill"
                                        style={{
                                            width: item.total ? `${(item.count / item.total) * 100}%` : '0%',
                                            background: item.color,
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Driver Compliance Alerts */}
                <div className="stat-card">
                    <div className="stat-card-title">
                        Driver Compliance Alerts
                        {alertDrivers.length > 0 && (
                            <span style={{ marginLeft: 8, color: 'var(--red-t)', fontSize: 11 }}>
                                ⚠ {alertDrivers.length} requiring attention
                            </span>
                        )}
                    </div>
                    {alertDrivers.length === 0 ? (
                        <div className="empty-state" style={{ padding: '20px 0' }}>
                            <div className="empty-state-icon">✅</div>
                            <div className="empty-state-text">All licenses valid</div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {alertDrivers.slice(0, 5).map((d) => {
                                const expired = new Date(d.license_expiry) < new Date();
                                return (
                                    <div key={d._id || d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Expires: {new Date(d.license_expiry).toLocaleDateString()}</div>
                                        </div>
                                        <StatusBadge status={expired ? 'expired' : 'scheduled'} />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Trips */}
            <div className="table-wrapper">
                <div className="table-toolbar">
                    <span className="table-toolbar-title">Recent Trips</span>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate('/trips')}>View All →</button>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Route</th>
                            <th>Driver</th>
                            <th>Cargo</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recentTrips.length === 0 ? (
                            <tr><td colSpan={5}><div className="empty-state"><div className="empty-state-icon">🚚</div><div className="empty-state-text">No recent trips</div></div></td></tr>
                        ) : recentTrips.map((t) => (
                            <tr key={t._id || t.id}>
                                <td className="font-mono">#{String(t._id || t.id).slice(-6)}</td>
                                <td>{t.start_location || '?'} → {t.end_location || '?'}</td>
                                <td className="text-secondary">{getDriverName(t.driver_id)}</td>
                                <td>{t.cargo_weight} kg</td>
                                <td><StatusBadge status={t.status} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}