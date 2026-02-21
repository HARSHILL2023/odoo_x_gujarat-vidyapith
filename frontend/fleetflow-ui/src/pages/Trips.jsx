import { useState, useEffect } from 'react';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import tripService from '../services/tripService';
import vehicleService from '../services/vehicleService';
import driverService from '../services/driverService';

const EMPTY = {
    vehicle_id: '',
    driver_id: '',
    start_location: '',
    end_location: '',
    cargo_weight: '',
    start_time: '',
    odometer_start: ''
};

const STATUSES = ['Draft', 'Dispatched', 'Completed', 'Cancelled'];

export default function Trips() {
    const [trips, setTrips] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [view, setView] = useState('kanban');
    const [modal, setModal] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [formError, setFormError] = useState('');
    const [search, setSearch] = useState('');

    // Fetch all data on component mount
    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const [tripsData, vehiclesData, driversData] = await Promise.all([
                tripService.getAll(),
                vehicleService.getAll(),
                driverService.getAll()
            ]);
            setTrips(tripsData);
            setVehicles(vehiclesData);
            setDrivers(driversData);
            setError('');
        } catch (err) {
            setError('Failed to fetch data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Filter available vehicles
    const availableVehicles = vehicles.filter(v => v.status === 'Available');

    const availableDrivers = drivers.filter(d => {
        if (!d.status) return false;
        const s = d.status.toLowerCase().trim();
        if (s !== 'on duty') return false;

        if (!d.license_expiry) return true;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiry = new Date(d.license_expiry);
        expiry.setHours(0, 0, 0, 0);
        return expiry >= today;
    });

    const handleCreate = async () => {
        setFormError('');

        // Validate form
        if (!form.vehicle_id) {
            setFormError('Please select a vehicle');
            return;
        }
        if (!form.driver_id) {
            setFormError('Please select a driver');
            return;
        }
        if (!form.start_location) {
            setFormError('Please enter origin');
            return;
        }
        if (!form.end_location) {
            setFormError('Please enter destination');
            return;
        }
        if (!form.cargo_weight || form.cargo_weight <= 0) {
            setFormError('Please enter valid cargo weight');
            return;
        }

        try {
            const tripData = {
                vehicle_id: form.vehicle_id,
                driver_id: form.driver_id,
                start_location: form.start_location,
                end_location: form.end_location,
                cargo_weight: Number(form.cargo_weight),
                start_time: form.start_time || new Date().toISOString(),
                odometer_start: form.odometer_start ? Number(form.odometer_start) : null
            };

            const newTrip = await tripService.create(tripData);
            setTrips([newTrip.trip, ...trips]);

            // Refresh vehicles and drivers to get updated statuses
            const [updatedVehicles, updatedDrivers] = await Promise.all([
                vehicleService.getAll(),
                driverService.getAll()
            ]);
            setVehicles(updatedVehicles);
            setDrivers(updatedDrivers);

            setModal(false);
            setForm(EMPTY);
        } catch (err) {
            setFormError(err.message || 'Failed to create trip');
            console.error(err);
        }
    };


    const handleComplete = async (tripId) => {
        const odometer = prompt('Enter final odometer reading:');
        if (!odometer) return;

        try {
            await tripService.complete(tripId, Number(odometer));
            fetchAllData(); // Refresh all data
            setError('');
        } catch (err) {
            setError('Failed to complete trip: ' + (err.message || 'Server error'));
            console.error(err);
        }
    };

    const handleDispatch = async (tripId) => {
        if (!window.confirm('Dispatch this trip? Only available vehicles and drivers on-duty can be dispatched.')) return;

        try {
            await tripService.dispatch(tripId);
            fetchAllData();
            setError('');
        } catch (err) {
            setError('Failed to dispatch trip: ' + (err.message || 'Server error'));
            console.error(err);
        }
    };

    const handleCancel = async (tripId) => {
        if (!window.confirm('Cancel this trip?')) return;

        try {
            // You'll need to add this to your tripService
            await tripService.cancel(tripId);
            fetchAllData();
        } catch (err) {
            setError('Failed to cancel trip');
            console.error(err);
        }
    };

    // Filter trips based on search
    const filtered = trips.filter(t => {
        const q = search.toLowerCase();
        const vehicle = vehicles.find(v => v._id === t.vehicle_id || v.id === t.vehicle_id);
        const driver = drivers.find(d => d._id === t.driver_id || d.id === t.driver_id);

        return !q ||
            (vehicle?.name?.toLowerCase().includes(q)) ||
            (driver?.name?.toLowerCase().includes(q)) ||
            (t.start_location?.toLowerCase().includes(q)) ||
            (t.end_location?.toLowerCase().includes(q));
    });

    const getVehicleName = (idOrObj) => {
        if (!idOrObj) return 'Unknown';
        if (typeof idOrObj === 'object' && idOrObj.name) return idOrObj.name;
        const idStr = String(typeof idOrObj === 'object' ? (idOrObj._id || idOrObj.id) : idOrObj);
        const v = vehicles.find(v => String(v._id || v.id) === idStr);
        return v ? `${v.name} (${v.license_plate})` : `Vehicle #${idStr.slice(-6)}`;
    };

    const getDriverName = (idOrObj) => {
        if (!idOrObj) return 'Unknown';
        if (typeof idOrObj === 'object' && idOrObj.name) return idOrObj.name;
        const idStr = String(typeof idOrObj === 'object' ? (idOrObj._id || idOrObj.id) : idOrObj);
        const d = drivers.find(d => String(d._id || d.id) === idStr);
        return d ? d.name : `Driver #${idStr.slice(-6)}`;
    };

    const KanbanCard = ({ trip }) => {
        return (
            <div className="kanban-card">
                <div className="kanban-card-ref">Trip #{trip._id?.slice(-6) || trip.id?.slice(-6) || 'N/A'}</div>
                <div className="kanban-card-route">{trip.start_location} → {trip.end_location}</div>
                <div className="kanban-card-meta">
                    <span>🚛 {getVehicleName(trip.vehicle_id)}</span>
                    <span>👤 {getDriverName(trip.driver_id)}</span>
                    <span>📦 {trip.cargo_weight} kg</span>
                    {trip.start_time && <span>📅 {new Date(trip.start_time).toLocaleDateString()}</span>}
                </div>
                <div className="kanban-card-actions">
                    {trip.status === 'Draft' && (
                        <>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleDispatch(trip._id || trip.id)}
                            >
                                Dispatch
                            </button>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleCancel(trip._id || trip.id)}
                            >
                                Cancel
                            </button>
                        </>
                    )}
                    {trip.status === 'Dispatched' && (
                        <>
                            <button
                                className="btn btn-success btn-sm"
                                onClick={() => handleComplete(trip._id || trip.id)}
                            >
                                Complete
                            </button>
                            <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleCancel(trip._id || trip.id)}
                            >
                                Cancel
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    };

    if (loading) {
        return <div className="loading">Loading trips...</div>;
    }

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <div className="page-title">Trip Dispatcher</div>
                    <div className="page-sub">{trips.length} total trips</div>
                </div>
                <div className="page-actions">
                    <div style={{
                        display: 'flex',
                        gap: 4,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: 3
                    }}>
                        {['kanban', 'list'].map(v => (
                            <button
                                key={v}
                                className={`btn btn-sm ${view === v ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ border: 'none' }}
                                onClick={() => setView(v)}
                            >
                                {v === 'kanban' ? '⬛ Board' : '☰ List'}
                            </button>
                        ))}
                    </div>
                    <button className="btn btn-primary" onClick={() => setModal(true)}>+ New Trip</button>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger" style={{ margin: '1rem 0' }}>
                    {error}
                </div>
            )}

            {view === 'kanban' ? (
                <div className="kanban-board">
                    {STATUSES.map(status => {
                        const col = filtered.filter(t => t.status === status);
                        const colColors = {
                            Draft: 'var(--gray-t)',
                            Dispatched: 'var(--blue-t)',
                            Completed: 'var(--green-t)',
                            Cancelled: 'var(--red-t)'
                        };
                        return (
                            <div key={status} className="kanban-col">
                                <div className="kanban-col-header">
                                    <span className="kanban-col-title" style={{ color: colColors[status] }}>
                                        {status}
                                    </span>
                                    <span className="kanban-col-count">{col.length}</span>
                                </div>
                                <div className="kanban-cards">
                                    {col.length === 0 ? (
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
                                            No trips
                                        </div>
                                    ) : (
                                        col.map(t => <KanbanCard key={t._id || t.id} trip={t} />)
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="table-wrapper">
                    <div className="table-toolbar">
                        <span className="table-toolbar-title">All Trips</span>
                        <div className="search-wrap">
                            <span className="search-icon">🔍</span>
                            <input
                                className="search-input"
                                placeholder="Search trips…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th><th>Vehicle</th><th>Driver</th>
                                <th>Route</th><th>Cargo</th><th>Date</th><th>Status</th><th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(t => (
                                <tr key={t._id || t.id}>
                                    <td className="font-mono">#{String(t._id || t.id).slice(-6)}</td>
                                    <td>{getVehicleName(t.vehicle_id)}</td>
                                    <td>{getDriverName(t.driver_id)}</td>
                                    <td style={{ fontSize: 12 }}>{t.start_location} → {t.end_location}</td>
                                    <td>{t.cargo_weight} kg</td>
                                    <td className="text-muted">
                                        {t.start_time ? new Date(t.start_time).toLocaleDateString() : '—'}
                                    </td>
                                    <td><StatusBadge status={t.status} /></td>
                                    <td>
                                        <div className="actions">
                                            {t.status === 'Dispatched' && (
                                                <>
                                                    <button
                                                        className="btn btn-success btn-sm"
                                                        onClick={() => handleComplete(t._id || t.id)}
                                                    >
                                                        Complete
                                                    </button>
                                                    <button
                                                        className="btn btn-danger btn-sm"
                                                        onClick={() => handleCancel(t._id || t.id)}
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {modal && (
                <Modal
                    title="Create New Trip"
                    onClose={() => {
                        setModal(false);
                        setFormError('');
                        setForm(EMPTY);
                    }}
                    footer={
                        <>
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    setModal(false);
                                    setFormError('');
                                    setForm(EMPTY);
                                }}
                            >
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleCreate}>
                                Create Trip
                            </button>
                        </>
                    }
                >
                    {formError && <div className="alert alert-danger mb-4">{formError}</div>}
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Vehicle (Available)</label>
                            <select
                                className="form-control"
                                value={form.vehicle_id}
                                onChange={e => setForm({ ...form, vehicle_id: e.target.value })}
                            >
                                <option value="">Select vehicle…</option>
                                {availableVehicles.map(v => (
                                    <option key={v._id || v.id} value={v._id || v.id}>
                                        {v.name} – {v.license_plate} (max {v.max_load} kg)
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Driver (Available)</label>
                            <select
                                className="form-control"
                                value={form.driver_id}
                                onChange={e => setForm({ ...form, driver_id: e.target.value })}
                            >
                                <option value="">Select driver…</option>
                                {availableDrivers.map(d => (
                                    <option key={d._id || d.id} value={d._id || d.id}>
                                        {d.name} – {d.license_category} (Exp: {new Date(d.license_expiry).toLocaleDateString()})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Origin</label>
                            <input
                                className="form-control"
                                placeholder="Pickup location"
                                value={form.start_location}
                                onChange={e => setForm({ ...form, start_location: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Destination</label>
                            <input
                                className="form-control"
                                placeholder="Drop location"
                                value={form.end_location}
                                onChange={e => setForm({ ...form, end_location: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Cargo Weight (kg)</label>
                            <input
                                className="form-control"
                                type="number"
                                placeholder="kg"
                                value={form.cargo_weight}
                                onChange={e => setForm({ ...form, cargo_weight: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Departure Date</label>
                            <input
                                className="form-control"
                                type="datetime-local"
                                value={form.start_time}
                                onChange={e => setForm({ ...form, start_time: e.target.value })}
                            />
                        </div>
                        <div className="form-group form-grid-full">
                            <label className="form-label">Odometer at Start (km)</label>
                            <input
                                className="form-control"
                                type="number"
                                value={form.odometer_start}
                                onChange={e => setForm({ ...form, odometer_start: e.target.value })}
                            />
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}