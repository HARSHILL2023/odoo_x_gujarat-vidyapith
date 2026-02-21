import { useFleet } from '../context/FleetContext';
import StatusBadge from '../components/StatusBadge';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
    const { vehicles, drivers, trips, maintenance } = useFleet();
    const navigate = useNavigate();

    const activeFleet = vehicles.filter((v) => v.status === 'on_trip').length;
    const inShop = vehicles.filter((v) => v.status === 'in_shop').length;
    const available = vehicles.filter((v) => v.status === 'available').length;
    const totalActive = vehicles.filter((v) => v.status !== 'retired').length;
    const utilization = totalActive ? Math.round(((totalActive - available) / totalActive) * 100) : 0;
    const pendingCargo = trips.filter((t) => t.state === 'draft').length;
    const openMaint = maintenance.filter((m) => m.state !== 'done').length;

    const recentTrips = [...trips].sort((a, b) => b.id - a.id).slice(0, 5);
    const alertDrivers = drivers.filter((d) => {
        const exp = new Date(d.licenseExpiry);
        const soon = new Date();
        soon.setDate(soon.getDate() + 30);
        return exp < soon;
    });

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
                    <div className="kpi-sub">{openMaint} open service records</div>
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
                            { label: 'Available', count: available, color: 'var(--green-t)', total: totalActive },
                            { label: 'On Trip', count: activeFleet, color: 'var(--blue-t)', total: totalActive },
                            { label: 'In Shop', count: inShop, color: 'var(--orange-t)', total: totalActive },
                            { label: 'Retired', count: vehicles.filter(v => v.status === 'retired').length, color: 'var(--gray-t)', total: vehicles.length },
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
                            {alertDrivers.map((d) => {
                                const expired = new Date(d.licenseExpiry) < new Date();
                                return (
                                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Expires: {d.licenseExpiry}</div>
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
                            <th>Reference</th>
                            <th>Route</th>
                            <th>Driver</th>
                            <th>Cargo</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recentTrips.map((t) => (
                            <tr key={t.id}>
                                <td className="font-mono">{t.reference}</td>
                                <td>{t.origin} → {t.destination}</td>
                                <td className="text-secondary">Driver #{t.driverId}</td>
                                <td>{t.cargoWeight} kg</td>
                                <td><StatusBadge status={t.state} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
