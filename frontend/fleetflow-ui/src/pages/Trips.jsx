import { useState } from 'react';
import { useFleet } from '../context/FleetContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

const EMPTY = { vehicleId: '', driverId: '', origin: '', destination: '', cargoWeight: '', dateStart: '', odometerStart: '' };
const STATES = ['draft', 'dispatched', 'completed', 'cancelled'];

export default function Trips() {
    const { trips, vehicles, drivers, addTrip, dispatchTrip, completeTrip, cancelTrip, isLicenseExpired } = useFleet();
    const [view, setView] = useState('kanban');
    const [modal, setModal] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    const availableVehicles = vehicles.filter(v => v.status === 'available');
    const availableDrivers = drivers.filter(d => d.status !== 'suspended' && !isLicenseExpired(d));

    const handleCreate = () => {
        setError('');
        const vehicle = vehicles.find(v => v.id === Number(form.vehicleId));
        if (!vehicle) { setError('Select a vehicle.'); return; }
        if (!form.driverId) { setError('Select a driver.'); return; }
        if (Number(form.cargoWeight) > vehicle.maxCapacity) {
            setError(`⚠ Cargo weight (${form.cargoWeight} kg) exceeds vehicle capacity (${vehicle.maxCapacity} kg)!`);
            return;
        }
        addTrip({ ...form, vehicleId: Number(form.vehicleId), driverId: Number(form.driverId), cargoWeight: Number(form.cargoWeight), odometerStart: Number(form.odometerStart) });
        setModal(false);
        setForm(EMPTY);
    };

    const filtered = trips.filter(t => {
        const q = search.toLowerCase();
        return !q || t.reference?.toLowerCase().includes(q) || t.origin?.toLowerCase().includes(q) || t.destination?.toLowerCase().includes(q);
    });

    const vehicleName = (id) => vehicles.find(v => v.id === id)?.name || `Vehicle #${id}`;
    const driverName = (id) => drivers.find(d => d.id === id)?.name || `Driver #${id}`;

    const KanbanCard = ({ trip }) => (
        <div className="kanban-card">
            <div className="kanban-card-ref">{trip.reference}</div>
            <div className="kanban-card-route">{trip.origin} → {trip.destination}</div>
            <div className="kanban-card-meta">
                <span>🚛 {vehicleName(trip.vehicleId)}</span>
                <span>👤 {driverName(trip.driverId)}</span>
                <span>📦 {trip.cargoWeight} kg</span>
                {trip.dateStart && <span>📅 {trip.dateStart?.slice(0, 10)}</span>}
            </div>
            <div className="kanban-card-actions">
                {trip.state === 'draft' && <button className="btn btn-primary btn-sm" onClick={() => dispatchTrip(trip.id)}>Dispatch</button>}
                {trip.state === 'dispatched' && <button className="btn btn-success btn-sm" onClick={() => completeTrip(trip.id)}>Complete</button>}
                {trip.state === 'dispatched' && <button className="btn btn-danger  btn-sm" onClick={() => cancelTrip(trip.id)}>Cancel</button>}
            </div>
        </div>
    );

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <div className="page-title">Trip Dispatcher</div>
                    <div className="page-sub">{trips.length} total trips</div>
                </div>
                <div className="page-actions">
                    <div style={{ display: 'flex', gap: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 3 }}>
                        {['kanban', 'list'].map(v => (
                            <button key={v} className={`btn btn-sm ${view === v ? 'btn-primary' : 'btn-secondary'}`} style={{ border: 'none' }} onClick={() => setView(v)}>
                                {v === 'kanban' ? '⬛ Board' : '☰ List'}
                            </button>
                        ))}
                    </div>
                    <button className="btn btn-primary" onClick={() => setModal(true)}>+ New Trip</button>
                </div>
            </div>

            {view === 'kanban' ? (
                <div className="kanban-board">
                    {STATES.map(state => {
                        const col = trips.filter(t => t.state === state);
                        const colColors = { draft: 'var(--gray-t)', dispatched: 'var(--blue-t)', completed: 'var(--green-t)', cancelled: 'var(--red-t)' };
                        return (
                            <div key={state} className="kanban-col">
                                <div className="kanban-col-header">
                                    <span className="kanban-col-title" style={{ color: colColors[state] }}>
                                        {state.charAt(0).toUpperCase() + state.slice(1)}
                                    </span>
                                    <span className="kanban-col-count">{col.length}</span>
                                </div>
                                <div className="kanban-cards">
                                    {col.length === 0
                                        ? <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>No trips</div>
                                        : col.map(t => <KanbanCard key={t.id} trip={t} />)}
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
                            <input className="search-input" placeholder="Search trips…" value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                    </div>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Reference</th><th>Vehicle</th><th>Driver</th>
                                <th>Route</th><th>Cargo</th><th>Date</th><th>Status</th><th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(t => (
                                <tr key={t.id}>
                                    <td className="font-mono">{t.reference}</td>
                                    <td>{vehicleName(t.vehicleId)}</td>
                                    <td>{driverName(t.driverId)}</td>
                                    <td style={{ fontSize: 12 }}>{t.origin} → {t.destination}</td>
                                    <td>{t.cargoWeight} kg</td>
                                    <td className="text-muted">{t.dateStart?.slice(0, 10) || '—'}</td>
                                    <td><StatusBadge status={t.state} /></td>
                                    <td>
                                        <div className="actions">
                                            {t.state === 'draft' && <button className="btn btn-primary btn-sm" onClick={() => dispatchTrip(t.id)}>Dispatch</button>}
                                            {t.state === 'dispatched' && <button className="btn btn-success btn-sm" onClick={() => completeTrip(t.id)}>Complete</button>}
                                            {t.state === 'dispatched' && <button className="btn btn-danger  btn-sm" onClick={() => cancelTrip(t.id)}>Cancel</button>}
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
                    onClose={() => { setModal(false); setError(''); setForm(EMPTY); }}
                    footer={<>
                        <button className="btn btn-secondary" onClick={() => { setModal(false); setError(''); setForm(EMPTY); }}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleCreate}>Create Trip</button>
                    </>}
                >
                    {error && <div className="alert alert-danger mb-4">{error}</div>}
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Vehicle (Available)</label>
                            <select className="form-control" value={form.vehicleId} onChange={e => setForm({ ...form, vehicleId: e.target.value })}>
                                <option value="">Select vehicle…</option>
                                {availableVehicles.map(v => (
                                    <option key={v.id} value={v.id}>{v.name} – {v.licensePlate} (max {v.maxCapacity} kg)</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Driver (Available)</label>
                            <select className="form-control" value={form.driverId} onChange={e => setForm({ ...form, driverId: e.target.value })}>
                                <option value="">Select driver…</option>
                                {availableDrivers.map(d => (
                                    <option key={d.id} value={d.id}>{d.name} – {d.licenseCategory}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Origin</label>
                            <input className="form-control" placeholder="Pickup location" value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Destination</label>
                            <input className="form-control" placeholder="Drop location" value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Cargo Weight (kg)</label>
                            <input className="form-control" type="number" placeholder="kg" value={form.cargoWeight} onChange={e => setForm({ ...form, cargoWeight: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Departure Date</label>
                            <input className="form-control" type="datetime-local" value={form.dateStart} onChange={e => setForm({ ...form, dateStart: e.target.value })} />
                        </div>
                        <div className="form-group form-grid-full">
                            <label className="form-label">Odometer at Start (km)</label>
                            <input className="form-control" type="number" value={form.odometerStart} onChange={e => setForm({ ...form, odometerStart: e.target.value })} />
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
