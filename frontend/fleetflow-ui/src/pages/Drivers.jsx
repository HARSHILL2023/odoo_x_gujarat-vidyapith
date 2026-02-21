import { useState } from 'react';
import { useFleet } from '../context/FleetContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

const EMPTY = { name: '', licenseNumber: '', licenseExpiry: '', licenseCategory: 'van', status: 'off_duty', safetyScore: 100, tripsCompleted: 0, phone: '', email: '' };

export default function Drivers() {
    const { drivers, addDriver, updateDriver, deleteDriver, isLicenseExpired } = useFleet();
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [editId, setEditId] = useState(null);

    const openAdd = () => { setForm(EMPTY); setModal('add'); };
    const openEdit = (d) => { setForm(d); setEditId(d.id); setModal('edit'); };
    const closeModal = () => { setModal(null); setEditId(null); };

    const handleSave = () => {
        const data = { ...form, safetyScore: Number(form.safetyScore), tripsCompleted: Number(form.tripsCompleted) };
        if (modal === 'add') addDriver(data); else updateDriver(editId, data);
        closeModal();
    };

    const filtered = drivers.filter(d => {
        const q = search.toLowerCase();
        const ms = !q || d.name.toLowerCase().includes(q) || d.licenseNumber.toLowerCase().includes(q);
        const mf = filterStatus === 'all' || d.status === filterStatus;
        return ms && mf;
    });

    const fld = (k, label, type = 'text', opts = null) => (
        <div className="form-group">
            <label className="form-label">{label}</label>
            {opts ? (
                <select className="form-control" value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })}>
                    {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
            ) : (
                <input className="form-control" type={type} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} />
            )}
        </div>
    );

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <div className="page-title">Driver Profiles</div>
                    <div className="page-sub">{drivers.length} registered drivers</div>
                </div>
                <div className="page-actions">
                    <select className="form-control" style={{ width: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="all">All Status</option>
                        <option value="on_duty">On Duty</option>
                        <option value="off_duty">Off Duty</option>
                        <option value="suspended">Suspended</option>
                    </select>
                    <button className="btn btn-primary" onClick={openAdd}>+ Add Driver</button>
                </div>
            </div>

            <div className="table-wrapper">
                <div className="table-toolbar">
                    <span className="table-toolbar-title">Drivers ({filtered.length})</span>
                    <div className="search-wrap">
                        <span className="search-icon">🔍</span>
                        <input className="search-input" placeholder="Search drivers…" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Driver</th><th>License #</th><th>Category</th>
                            <th>License Expiry</th><th>Safety Score</th><th>Trips Done</th>
                            <th>Status</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={8}><div className="empty-state"><div className="empty-state-icon">👤</div><div className="empty-state-text">No drivers found</div></div></td></tr>
                        ) : filtered.map(d => {
                            const expired = isLicenseExpired(d);
                            const expiringSoon = !expired && (new Date(d.licenseExpiry) - new Date()) < 30 * 24 * 3600 * 1000;
                            return (
                                <tr key={d.id}>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{d.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.email}</div>
                                    </td>
                                    <td className="font-mono">{d.licenseNumber}</td>
                                    <td><span className="tag">{d.licenseCategory}</span></td>
                                    <td>
                                        <span style={{ color: expired ? 'var(--red-t)' : expiringSoon ? 'var(--orange-t)' : 'var(--text-primary)' }}>
                                            {d.licenseExpiry}
                                            {expired && ' ⚠ Expired'}
                                            {expiringSoon && !expired && ' ⚠ Soon'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ width: 60, height: 6, background: 'var(--bg-hover)', borderRadius: 999, overflow: 'hidden' }}>
                                                <div style={{ width: `${d.safetyScore}%`, height: '100%', background: d.safetyScore > 80 ? 'var(--green-t)' : d.safetyScore > 60 ? 'var(--orange-t)' : 'var(--red-t)', borderRadius: 999 }} />
                                            </div>
                                            <span style={{ fontSize: 12 }}>{d.safetyScore}</span>
                                        </div>
                                    </td>
                                    <td>{d.tripsCompleted}</td>
                                    <td>
                                        {expired ? <StatusBadge status="expired" /> : <StatusBadge status={d.status} />}
                                    </td>
                                    <td>
                                        <div className="actions">
                                            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(d)}>Edit</button>
                                            <button className="btn btn-danger btn-sm" onClick={() => { if (window.confirm('Delete driver?')) deleteDriver(d.id) }}>Del</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {modal && (
                <Modal
                    title={modal === 'add' ? 'Add Driver Profile' : 'Edit Driver'}
                    onClose={closeModal}
                    footer={<>
                        <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSave}>Save Driver</button>
                    </>}
                >
                    <div className="form-grid">
                        {fld('name', 'Full Name')}
                        {fld('licenseNumber', 'License Number')}
                        {fld('licenseExpiry', 'License Expiry', 'date')}
                        {fld('licenseCategory', 'License Category', 'text', [{ v: 'van', l: 'Van' }, { v: 'truck', l: 'Truck' }, { v: 'bike', l: 'Bike' }])}
                        {fld('status', 'Status', 'text', [{ v: 'on_duty', l: 'On Duty' }, { v: 'off_duty', l: 'Off Duty' }, { v: 'suspended', l: 'Suspended' }])}
                        {fld('safetyScore', 'Safety Score (0–100)', 'number')}
                        {fld('phone', 'Phone')}
                        {fld('email', 'Email', 'email')}
                    </div>
                </Modal>
            )}
        </div>
    );
}
