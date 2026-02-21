import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import fuelService from '../services/fuelService';
import vehicleService from '../services/vehicleService';
import tripService from '../services/tripService';

const EMPTY = { vehicle_id: '', trip_id: '', date: '', liters: '', cost: '', odometer: '' };

export default function FuelLogs() {
    const [fuelLogs, setFuelLogs] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [fuelData, vehiclesData, tripsData] = await Promise.all([
                fuelService.getAll(),
                vehicleService.getAll(),
                tripService.getAll()
            ]);
            setFuelLogs(fuelData);
            setVehicles(vehiclesData);
            setTrips(tripsData);
        } catch (error) {
            console.error('Error fetching data:', error);
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const vehicleName = (idOrObj) => {
        if (!idOrObj) return 'Unknown';
        if (typeof idOrObj === 'object' && idOrObj.name) return idOrObj.name;
        const idStr = String(typeof idOrObj === 'object' ? (idOrObj._id || idOrObj.id) : idOrObj);
        const v = vehicles.find(v => String(v._id || v.id) === idStr);
        return v ? v.name : `Vehicle #${idStr.slice(-6)}`;
    };

    const tripRef = (id) => {
        const t = trips.find(t => t._id === id || t.id === id);
        return t ? `Trip #${String(t._id || t.id).slice(-6)}` : '—';
    };

    const handleSave = async () => {
        try {
            if (!form.vehicle_id || !form.liters || !form.cost) {
                setError('Please fill required fields');
                return;
            }

            const data = {
                vehicle_id: form.vehicle_id,
                trip_id: form.trip_id || null,
                date: form.date || new Date().toISOString().split('T')[0],
                liters: Number(form.liters),
                cost: Number(form.cost),
                odometer: Number(form.odometer) || 0
            };

            await fuelService.create(data);
            await fetchData();
            setModal(false);
            setForm(EMPTY);
            setError('');
        } catch (err) {
            setError('Failed to save fuel log');
            console.error(err);
        }
    };

    const totalCost = fuelLogs.reduce((s, f) => s + (f.cost || 0), 0);
    const totalLiters = fuelLogs.reduce((s, f) => s + (f.liters || 0), 0);

    const sortedLogs = [...fuelLogs].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Per-vehicle totals
    const perVehicle = vehicles.map(v => {
        const logs = fuelLogs.filter(f => f.vehicle_id === (v._id || v.id));
        const totalCost = logs.reduce((s, f) => s + (f.cost || 0), 0);
        const totalLiters = logs.reduce((s, f) => s + (f.liters || 0), 0);
        return { ...v, totalCost, totalLiters };
    }).filter(v => v.totalCost > 0);

    if (loading) {
        return <div className="loading">Loading fuel logs...</div>;
    }

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <div className="page-title">Fuel & Expense Logs</div>
                    <div className="page-sub">{fuelLogs.length} entries · {totalLiters.toFixed(1)}L · ${totalCost.toLocaleString()} total</div>
                </div>
                <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setModal(true); }}>+ Add Entry</button>
            </div>

            {error && (
                <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                    {error}
                </div>
            )}

            {/* Per-vehicle summary */}
            {perVehicle.length > 0 && (
                <div className="stat-card" style={{ marginBottom: 20 }}>
                    <div className="stat-card-title">Fuel Cost by Vehicle</div>
                    <div className="stat-bar-list">
                        {perVehicle.sort((a, b) => b.totalCost - a.totalCost).map(v => (
                            <div key={v._id || v.id} className="stat-bar-item">
                                <div className="stat-bar-label">
                                    <span>{v.name}</span>
                                    <span><strong>${v.totalCost.toLocaleString()}</strong> · {v.totalLiters.toFixed(1)}L</span>
                                </div>
                                <div className="stat-bar-track">
                                    <div className="stat-bar-fill" style={{
                                        width: `${(v.totalCost / totalCost) * 100}%`,
                                        background: 'var(--blue-t)'
                                    }} />
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
                            <tr key={f._id || f.id}>
                                <td>{new Date(f.date).toLocaleDateString()}</td>
                                <td>{vehicleName(f.vehicle_id)}</td>
                                <td className="font-mono text-muted">{f.trip_id ? tripRef(f.trip_id) : '—'}</td>
                                <td>{f.liters?.toFixed(2)} L</td>
                                <td style={{ fontWeight: 600 }}>${f.cost?.toLocaleString()}</td>
                                <td className="text-secondary">${((f.cost || 0) / (f.liters || 1)).toFixed(2)}/L</td>
                                <td className="text-muted">{f.odometer?.toLocaleString()} km</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modal && (
                <Modal
                    title="Add Fuel Entry"
                    onClose={() => setModal(false)}
                    footer={
                        <>
                            <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave}>Save Entry</button>
                        </>
                    }
                >
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Vehicle</label>
                            <select
                                className="form-control"
                                value={form.vehicle_id}
                                onChange={e => setForm({ ...form, vehicle_id: e.target.value })}
                            >
                                <option value="">Select vehicle…</option>
                                {vehicles.map(v => (
                                    <option key={v._id || v.id} value={v._id || v.id}>
                                        {v.name} - {v.license_plate}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Related Trip (optional)</label>
                            <select
                                className="form-control"
                                value={form.trip_id}
                                onChange={e => setForm({ ...form, trip_id: e.target.value })}
                            >
                                <option value="">No trip</option>
                                {trips.map(t => (
                                    <option key={t._id || t.id} value={t._id || t.id}>
                                        Trip #{String(t._id || t.id).slice(-6)} - {t.start_location} → {t.end_location}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Date</label>
                            <input
                                className="form-control"
                                type="date"
                                value={form.date}
                                onChange={e => setForm({ ...form, date: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Liters</label>
                            <input
                                className="form-control"
                                type="number"
                                step="0.01"
                                value={form.liters}
                                onChange={e => setForm({ ...form, liters: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Cost ($)</label>
                            <input
                                className="form-control"
                                type="number"
                                step="0.01"
                                value={form.cost}
                                onChange={e => setForm({ ...form, cost: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Odometer (km)</label>
                            <input
                                className="form-control"
                                type="number"
                                value={form.odometer}
                                onChange={e => setForm({ ...form, odometer: e.target.value })}
                            />
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}