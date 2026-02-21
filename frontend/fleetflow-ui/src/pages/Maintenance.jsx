import { useState } from 'react';
import { useFleet } from '../context/FleetContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

const EMPTY = { vehicleId: '', name: '', serviceType: 'oil_change', serviceDate: '', cost: '', mechanic: '', state: 'scheduled' };

const SERVICE_TYPES = [
    { v: 'oil_change', l: 'Oil Change' }, { v: 'tire', l: 'Tire Service' }, { v: 'brake', l: 'Brake Service' },
    { v: 'engine', l: 'Engine Repair' }, { v: 'electrical', l: 'Electrical' }, { v: 'bodywork', l: 'Bodywork' },
    { v: 'scheduled', l: 'Scheduled Service' }, { v: 'other', l: 'Other' },
];

export default function Maintenance() {
    const { maintenance, vehicles, addMaintenance, updateMaintenance, completeMaintenance } = useFleet();
    const [modal, setModal] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [search, setSearch] = useState('');

    const vehicleName = (id) => vehicles.find(v => v.id === id)?.name || `Vehicle #${id}`;

    const handleSave = () => {
        addMaintenance({ ...form, vehicleId: Number(form.vehicleId), cost: Number(form.cost) });
        setModal(false); setForm(EMPTY);
    };

    const filtered = maintenance.filter(m => {
        const q = search.toLowerCase();
        return !q || m.name.toLowerCase().includes(q) || vehicleName(m.vehicleId).toLowerCase().includes(q);
    });

    const totalCost = maintenance.reduce((s, m) => s + m.cost, 0);
    const openCount = maintenance.filter(m => m.state !== 'done').length;

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <div className="page-title">Maintenance Logs</div>
                    <div className="page-sub">{openCount} open · ${totalCost.toLocaleString()} total cost</div>
                </div>
                <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setModal(true); }}>+ Log Service</button>
            </div>

            {/* Quick stats */}
            <div className="kpi-grid" style={{ marginBottom: 20 }}>
                {[
                    { label: 'Scheduled', count: maintenance.filter(m => m.state === 'scheduled').length, color: 'orange' },
                    { label: 'In Progress', count: maintenance.filter(m => m.state === 'in_progress').length, color: 'blue' },
                    { label: 'Completed', count: maintenance.filter(m => m.state === 'done').length, color: 'green' },
                    { label: 'Total Cost', count: `$${totalCost.toLocaleString()}`, color: 'red' },
                ].map(k => (
                    <div key={k.label} className={`kpi-card ${k.color}`}>
                        <div className="kpi-label">{k.label}</div>
                        <div className="kpi-value" style={{ fontSize: 24 }}>{k.count}</div>
                    </div>
                ))}
            </div>

            <div className="table-wrapper">
                <div className="table-toolbar">
                    <span className="table-toolbar-title">Service Records ({filtered.length})</span>
                    <div className="search-wrap">
                        <span className="search-icon">🔍</span>
                        <input className="search-input" placeholder="Search records…" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Description</th><th>Vehicle</th><th>Type</th>
                            <th>Date</th><th>Mechanic</th><th>Cost</th><th>Status</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={8}><div className="empty-state"><div className="empty-state-icon">🔧</div><div className="empty-state-text">No service records</div></div></td></tr>
                        ) : filtered.map(m => (
                            <tr key={m.id}>
                                <td><strong>{m.name}</strong></td>
                                <td>{vehicleName(m.vehicleId)}</td>
                                <td><span className="tag">{SERVICE_TYPES.find(t => t.v === m.serviceType)?.l || m.serviceType}</span></td>
                                <td className="text-muted">{m.serviceDate}</td>
                                <td className="text-secondary">{m.mechanic || '—'}</td>
                                <td style={{ fontWeight: 600 }}>${m.cost.toLocaleString()}</td>
                                <td><StatusBadge status={m.state} /></td>
                                <td>
                                    <div className="actions">
                                        {m.state === 'scheduled' && <button className="btn btn-warning btn-sm" onClick={() => updateMaintenance(m.id, { state: 'in_progress' })}>Start</button>}
                                        {m.state === 'in_progress' && <button className="btn btn-success btn-sm" onClick={() => completeMaintenance(m.id)}>Done</button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modal && (
                <Modal
                    title="Log New Service"
                    onClose={() => setModal(false)}
                    footer={<>
                        <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSave}>Save Record</button>
                    </>}
                >
                    <div className="alert alert-warning mb-4" style={{ marginBottom: 16 }}>
                        ⚠ Adding a service record will automatically set the vehicle status to <strong>In Shop</strong>.
                    </div>
                    <div className="form-grid">
                        <div className="form-group form-grid-full">
                            <label className="form-label">Service Description</label>
                            <input className="form-control" placeholder="e.g. Oil Change + Filter" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Vehicle</label>
                            <select className="form-control" value={form.vehicleId} onChange={e => setForm({ ...form, vehicleId: e.target.value })}>
                                <option value="">Select…</option>
                                {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Service Type</label>
                            <select className="form-control" value={form.serviceType} onChange={e => setForm({ ...form, serviceType: e.target.value })}>
                                {SERVICE_TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Service Date</label>
                            <input className="form-control" type="date" value={form.serviceDate} onChange={e => setForm({ ...form, serviceDate: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Cost ($)</label>
                            <input className="form-control" type="number" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} />
                        </div>
                        <div className="form-group form-grid-full">
                            <label className="form-label">Mechanic / Vendor</label>
                            <input className="form-control" placeholder="Name or shop" value={form.mechanic} onChange={e => setForm({ ...form, mechanic: e.target.value })} />
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
