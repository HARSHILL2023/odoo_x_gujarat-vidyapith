import { useState, useEffect } from 'react';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import driverService from '../services/driverService';

const EMPTY = { 
    name: '', 
    license_number: '',  // Note: changed from licenseNumber to license_number
    license_expiry: '',  // Changed from licenseExpiry
    license_category: 'van', 
    status: 'Off Duty',  // Changed format
    safety_score: 100,   // Changed from safetyScore
    phone: '', 
    email: '' 
};

export default function Drivers() {
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [editId, setEditId] = useState(null);

    // Fetch drivers from backend on component mount
    useEffect(() => {
        fetchDrivers();
    }, []);

    const fetchDrivers = async () => {
        try {
            setLoading(true);
            const data = await driverService.getAll();
            setDrivers(data);
            setError('');
        } catch (err) {
            setError('Failed to fetch drivers');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const openAdd = () => { 
        setForm(EMPTY); 
        setModal('add'); 
    };

    const openEdit = (d) => { 
        setForm({
            name: d.name,
            license_number: d.license_number,
            license_expiry: d.license_expiry ? d.license_expiry.split('T')[0] : '', // Format date for input
            license_category: d.license_category || 'van',
            status: d.status,
            safety_score: d.safety_score,
            phone: d.phone || '',
            email: d.email || ''
        }); 
        setEditId(d._id || d.id); 
        setModal('edit'); 
    };

    const closeModal = () => { 
        setModal(null); 
        setEditId(null); 
        setForm(EMPTY);
    };

    const handleSave = async () => {
        try {
            // Validate required fields
            if (!form.name || !form.license_number || !form.license_expiry) {
                setError('Name, License Number, and Expiry Date are required');
                return;
            }

            const data = { 
                ...form, 
                safety_score: Number(form.safety_score),
                license_expiry: new Date(form.license_expiry).toISOString()
            };

            if (modal === 'add') {
                const newDriver = await driverService.create(data);
                setDrivers([newDriver, ...drivers]);
            } else {
                // For edit, update status and other fields
                await driverService.updateStatus(editId, data.status);
                // Refresh the list to get updated data
                fetchDrivers();
            }
            closeModal();
            setError('');
        } catch (err) {
            setError('Failed to save driver: ' + (err.message || 'Unknown error'));
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this driver?')) {
            try {
                await driverService.delete(id);
                setDrivers(drivers.filter(d => d._id !== id && d.id !== id));
            } catch (err) {
                setError('Failed to delete driver');
                console.error(err);
            }
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            await driverService.updateStatus(id, newStatus);
            // Refresh the list
            fetchDrivers();
        } catch (err) {
            setError('Failed to update status');
            console.error(err);
        }
    };

    // Check if license is expired
    const isLicenseExpired = (expiryDate) => {
        if (!expiryDate) return false;
        const today = new Date();
        const expiry = new Date(expiryDate);
        return expiry < today;
    };

    // Check if license is expiring soon (within 30 days)
    const isExpiringSoon = (expiryDate) => {
        if (!expiryDate) return false;
        const today = new Date();
        const expiry = new Date(expiryDate);
        const diffTime = expiry - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 && diffDays <= 30;
    };

    // Filter drivers based on search and filters
    const filtered = drivers.filter(d => {
        const q = search.toLowerCase();
        const matchSearch = !q || 
            (d.name?.toLowerCase().includes(q) || 
             d.license_number?.toLowerCase().includes(q) ||
             d.email?.toLowerCase().includes(q));
        
        const matchStatus = filterStatus === 'all' || 
            d.status?.toLowerCase().replace(' ', '_') === filterStatus;
        
        return matchSearch && matchStatus;
    });

    const fld = (k, label, type = 'text', opts = null) => (
        <div className="form-group">
            <label className="form-label">{label}</label>
            {opts ? (
                <select 
                    className="form-control" 
                    value={form[k] || ''} 
                    onChange={e => setForm({ ...form, [k]: e.target.value })}
                >
                    {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
            ) : (
                <input 
                    className="form-control" 
                    type={type} 
                    value={form[k] || ''} 
                    onChange={e => setForm({ ...form, [k]: e.target.value })}
                />
            )}
        </div>
    );

    if (loading) {
        return <div className="loading">Loading drivers...</div>;
    }

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <div className="page-title">Driver Profiles</div>
                    <div className="page-sub">{drivers.length} registered drivers</div>
                </div>
                <div className="page-actions">
                    <select 
                        className="form-control" 
                        style={{ width: 140 }} 
                        value={filterStatus} 
                        onChange={e => setFilterStatus(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        <option value="on_duty">On Duty</option>
                        <option value="off_duty">Off Duty</option>
                        <option value="suspended">Suspended</option>
                    </select>
                    <button className="btn btn-primary" onClick={openAdd}>+ Add Driver</button>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger" style={{ margin: '1rem 0' }}>
                    {error}
                </div>
            )}

            <div className="table-wrapper">
                <div className="table-toolbar">
                    <span className="table-toolbar-title">Drivers ({filtered.length})</span>
                    <div className="search-wrap">
                        <span className="search-icon">🔍</span>
                        <input 
                            className="search-input" 
                            placeholder="Search drivers…" 
                            value={search} 
                            onChange={e => setSearch(e.target.value)} 
                        />
                    </div>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Driver</th><th>License #</th><th>Category</th>
                            <th>License Expiry</th><th>Safety Score</th>
                            <th>Status</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={7}>
                                    <div className="empty-state">
                                        <div className="empty-state-icon">👤</div>
                                        <div className="empty-state-text">No drivers found</div>
                                    </div>
                                </td>
                            </tr>
                        ) : filtered.map(d => {
                            const expired = isLicenseExpired(d.license_expiry);
                            const expiringSoon = isExpiringSoon(d.license_expiry);
                            return (
                                <tr key={d._id || d.id}>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{d.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.email}</div>
                                    </td>
                                    <td className="font-mono">{d.license_number}</td>
                                    <td>
                                        <span className="tag">{d.license_category || 'van'}</span>
                                    </td>
                                    <td>
                                        <span style={{ 
                                            color: expired ? 'var(--red-t)' : 
                                                   expiringSoon ? 'var(--orange-t)' : 
                                                   'var(--text-primary)' 
                                        }}>
                                            {d.license_expiry ? new Date(d.license_expiry).toLocaleDateString() : 'N/A'}
                                            {expired && ' ⚠ Expired'}
                                            {expiringSoon && !expired && ' ⚠ Soon'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ 
                                                width: 60, 
                                                height: 6, 
                                                background: 'var(--bg-hover)', 
                                                borderRadius: 999, 
                                                overflow: 'hidden' 
                                            }}>
                                                <div style={{ 
                                                    width: `${d.safety_score}%`, 
                                                    height: '100%', 
                                                    background: d.safety_score > 80 ? 'var(--green-t)' : 
                                                               d.safety_score > 60 ? 'var(--orange-t)' : 
                                                               'var(--red-t)', 
                                                    borderRadius: 999 
                                                }} />
                                            </div>
                                            <span style={{ fontSize: 12 }}>{d.safety_score}</span>
                                        </div>
                                    </td>
                                    <td>
                                        {expired ? (
                                            <StatusBadge status="expired" />
                                        ) : (
                                            <StatusBadge status={d.status} />
                                        )}
                                    </td>
                                    <td>
                                        <div className="actions">
                                            <select 
                                                className="btn btn-secondary btn-sm"
                                                value={d.status}
                                                onChange={(e) => handleStatusChange(d._id || d.id, e.target.value)}
                                                style={{ marginRight: '0.5rem' }}
                                            >
                                                <option value="On Duty">On Duty</option>
                                                <option value="Off Duty">Off Duty</option>
                                                <option value="Suspended">Suspended</option>
                                            </select>
                                            <button 
                                                className="btn btn-secondary btn-sm" 
                                                onClick={() => openEdit(d)}
                                                style={{ marginRight: '0.5rem' }}
                                            >
                                                Edit
                                            </button>
                                            <button 
                                                className="btn btn-danger btn-sm" 
                                                onClick={() => handleDelete(d._id || d.id)}
                                            >
                                                Del
                                            </button>
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
                    footer={
                        <>
                            <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave}>Save Driver</button>
                        </>
                    }
                >
                    <div className="form-grid">
                        {fld('name', 'Full Name')}
                        {fld('license_number', 'License Number')}
                        {fld('license_expiry', 'License Expiry', 'date')}
                        {fld('license_category', 'License Category', 'text', [
                            { v: 'van', l: 'Van' }, 
                            { v: 'truck', l: 'Truck' }, 
                            { v: 'bike', l: 'Bike' }
                        ])}
                        {fld('status', 'Status', 'text', [
                            { v: 'On Duty', l: 'On Duty' }, 
                            { v: 'Off Duty', l: 'Off Duty' }, 
                            { v: 'Suspended', l: 'Suspended' }
                        ])}
                        {fld('safety_score', 'Safety Score (0–100)', 'number')}
                        {fld('phone', 'Phone')}
                        {fld('email', 'Email', 'email')}
                    </div>
                </Modal>
            )}
        </div>
    );
}