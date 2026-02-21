import { useState } from 'react';
import { useFleet } from '../context/FleetContext';
import Modal from '../components/Modal';

const EMPTY = { vehicleId: '', tripId: '', date: '', liters: '', cost: '', odometer: '' };

export default function FuelLogs() {
    const { fuelLogs, vehicles, trips, addFuelLog } = useFleet();
    const [modal, setModal] = useState(false);
    const [form, setForm] = useState(EMPTY);

    const vehicleName = (id) => vehicles.find(v => v.id === id)?.name || `#${id}`;
    const tripRef = (id) => trips.find(t => t.id === id)?.reference || '—';

    const totalCost = fuelLogs.reduce((s, f) => s + f.cost, 0);
    const totalLiters = fuelLogs.reduce((s, f) => s + f.liters, 0);

    const sortedLogs = [...fuelLogs].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Per-vehicle totals
    const perVehicle = vehicles.map(v => {
        const logs = fuelLogs.filter(f => f.vehicleId === v.id);
        return { ...v, totalCost: logs.reduce((s, f) => s + f.cost, 0), totalLiters: logs.reduce((s, f) => s + f.liters, 0) };
    }).filter(v => v.totalCost > 0);

    const handleSave = () => {
        addFuelLog({ ...form, vehicleId: Number(form.vehicleId), tripId: form.tripId ? Number(form.tripId) : null, liters: Number(form.liters), cost: Number(form.cost), odometer: Number(form.odometer) });
        setModal(false); setForm(EMPTY);
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <div className="page-title">Fuel & Expense Logs</div>
                    <div className="page-sub">{fuelLogs.length} entries · {totalLiters.toFixed(1)}L · ${totalCost.toLocaleString()} total</div>
                </div>
                <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setModal(true); }}>+ Add Entry</button>
            </div>

            {/* Per-vehicle summary */}
            {perVehicle.length > 0 && (
                <div className="stat-card" style={{ marginBottom: 20 }}>
                    <div className="stat-card-title">Fuel Cost by Vehicle</div>
                    <div className="stat-bar-list">
                        {perVehicle.sort((a, b) => b.totalCost - a.totalCost).map(v => (
                            <div key={v.id} className="stat-bar-item">
                                <div className="stat-bar-label">
                                    <span>{v.name}</span>
                                    <span><strong>${v.totalCost.toLocaleString()}</strong> · {v.totalLiters.toFixed(1)}L</span>
                                </div>
                                <div className="stat-bar-track">
                                    <div className="stat-bar-fill" style={{ width: `${(v.totalCost / totalCost) * 100}%`, background: 'var(--blue-t)' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="table-wrapper">
                <div className="table-toolbar">
                    <span className="table-toolbar-title">All Entries</span>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Date</th><th>Vehicle</th><th>Trip</th>
                            <th>Liters</th><th>Cost</th><th>Cost/L</th><th>Odometer</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedLogs.length === 0 ? (
                            <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-icon">⛽</div><div className="empty-state-text">No fuel records yet</div></div></td></tr>
                        ) : sortedLogs.map(f => (
                            <tr key={f.id}>
                                <td>{f.date}</td>
                                <td>{vehicleName(f.vehicleId)}</td>
                                <td className="font-mono text-muted">{f.tripId ? tripRef(f.tripId) : '—'}</td>
                                <td>{f.liters.toFixed(2)} L</td>
                                <td style={{ fontWeight: 600 }}>${f.cost.toLocaleString()}</td>
                                <td className="text-secondary">${(f.cost / f.liters).toFixed(2)}/L</td>
                                <td className="text-muted">{f.odometer.toLocaleString()} km</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modal && (
                <Modal
                    title="Add Fuel Entry"
                    onClose={() => setModal(false)}
                    footer={<>
                        <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSave}>Save Entry</button>
                    </>}
                >
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Vehicle</label>
                            <select className="form-control" value={form.vehicleId} onChange={e => setForm({ ...form, vehicleId: e.target.value })}>
                                <option value="">Select…</option>
                                {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Related Trip (optional)</label>
                            <select className="form-control" value={form.tripId} onChange={e => setForm({ ...form, tripId: e.target.value })}>
                                <option value="">No trip</option>
                                {trips.filter(t => !form.vehicleId || t.vehicleId === Number(form.vehicleId)).map(t => <option key={t.id} value={t.id}>{t.reference}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Date</label>
                            <input className="form-control" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Liters</label>
                            <input className="form-control" type="number" step="0.01" value={form.liters} onChange={e => setForm({ ...form, liters: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Cost ($)</label>
                            <input className="form-control" type="number" step="0.01" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Odometer (km)</label>
                            <input className="form-control" type="number" value={form.odometer} onChange={e => setForm({ ...form, odometer: e.target.value })} />
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
