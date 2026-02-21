import { useState } from 'react';
import { useFleet } from '../context/FleetContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

const EMPTY = { name: '', licensePlate: '', type: 'van', maxCapacity: '', odometer: '', status: 'available', region: '', acquisitionCost: '' };

export default function Vehicles() {
    const { vehicles, addVehicle, updateVehicle, deleteVehicle } = useFleet();
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [modal, setModal] = useState(null); // null | 'add' | 'edit'
    const [form, setForm] = useState(EMPTY);
    const [editId, setEditId] = useState(null);

    const openAdd = () => { setForm(EMPTY); setModal('add'); };
    const openEdit = (v) => { setForm(v); setEditId(v.id); setModal('edit'); };
    const closeModal = () => { setModal(null); setEditId(null); };

    const handleSave = () => {
        const data = { ...form, maxCapacity: Number(form.maxCapacity), odometer: Number(form.odometer), acquisitionCost: Number(form.acquisitionCost) };
        if (modal === 'add') addVehicle(data);
        else updateVehicle(editId, data);
        closeModal();
    };

    const filtered = vehicles.filter((v) => {
        const q = search.toLowerCase();
        const matchSearch = !q || v.name.toLowerCase().includes(q) || v.licensePlate.toLowerCase().includes(q) || (v.region || '').toLowerCase().includes(q);
        const matchType = filterType === 'all' || v.type === filterType;
        const matchStatus = filterStatus === 'all' || v.status === filterStatus;
        return matchSearch && matchType && matchStatus;
    });

    const field = (key, label, type = 'text', opts = null) => (
        <div className="form-group">
            <label className="form-label">{label}</label>
            {opts ? (
                <select className="form-control" value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}>
                    {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
            ) : (
                <input className="form-control" type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} />
            )}
        </div>
    );

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <div className="page-title">Vehicle Registry</div>
                    <div className="page-sub">{vehicles.length} total vehicles</div>
                </div>
                <div className="page-actions">
                    <select className="form-control" style={{ width: 120 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                        <option value="all">All Types</option>
                        <option value="truck">Truck</option>
                        <option value="van">Van</option>
                        <option value="bike">Bike</option>
                    </select>
                    <select className="form-control" style={{ width: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="all">All Status</option>
                        <option value="available">Available</option>
                        <option value="on_trip">On Trip</option>
                        <option value="in_shop">In Shop</option>
                        <option value="retired">Retired</option>
                    </select>
                    <button className="btn btn-primary" onClick={openAdd}>+ Add Vehicle</button>
                </div>
            </div>

            <div className="table-wrapper">
                <div className="table-toolbar">
                    <span className="table-toolbar-title">Fleet Assets ({filtered.length})</span>
                    <div className="search-wrap">
                        <span className="search-icon">🔍</span>
                        <input className="search-input" placeholder="Search vehicles…" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Vehicle</th><th>License Plate</th><th>Type</th>
                            <th>Capacity (kg)</th><th>Odometer</th><th>Region</th>
                            <th>Status</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={8}><div className="empty-state"><div className="empty-state-icon">🚛</div><div className="empty-state-text">No vehicles found</div></div></td></tr>
                        ) : filtered.map(v => (
                            <tr key={v.id}>
                                <td><strong>{v.name}</strong></td>
                                <td className="font-mono">{v.licensePlate}</td>
                                <td><span className="tag">{v.type}</span></td>
                                <td>{v.maxCapacity.toLocaleString()}</td>
                                <td>{v.odometer.toLocaleString()} km</td>
                                <td className="text-muted">{v.region || '—'}</td>
                                <td><StatusBadge status={v.status} /></td>
                                <td>
                                    <div className="actions">
                                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(v)}>Edit</button>
                                        <button className="btn btn-danger btn-sm" onClick={() => { if (window.confirm('Delete this vehicle?')) deleteVehicle(v.id); }}>Del</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modal && (
                <Modal
                    title={modal === 'add' ? 'Register New Vehicle' : 'Edit Vehicle'}
                    onClose={closeModal}
                    footer={<>
                        <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSave}>Save Vehicle</button>
                    </>}
                >
                    <div className="form-grid">
                        {field('name', 'Vehicle Name / Model')}
                        {field('licensePlate', 'License Plate')}
                        {field('type', 'Type', 'text', [{ v: 'van', l: 'Van' }, { v: 'truck', l: 'Truck' }, { v: 'bike', l: 'Bike' }])}
                        {field('status', 'Status', 'text', [
                            { v: 'available', l: 'Available' }, { v: 'on_trip', l: 'On Trip' },
                            { v: 'in_shop', l: 'In Shop' }, { v: 'retired', l: 'Retired' },
                        ])}
                        {field('maxCapacity', 'Max Capacity (kg)', 'number')}
                        {field('odometer', 'Odometer (km)', 'number')}
                        {field('region', 'Region')}
                        {field('acquisitionCost', 'Acquisition Cost ($)', 'number')}
                    </div>
                </Modal>
            )}
        </div>
    );
}
