import { useState, useEffect } from 'react';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import vehicleService from '../services/vehicleService';

const EMPTY = {
    name: '',
    model: '',
    license_plate: '',
    max_load: '',
    odometer: '',
    status: 'Available'
};

export default function Vehicles() {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [editId, setEditId] = useState(null);

    // Fetch vehicles from backend on component mount
    useEffect(() => {
        fetchVehicles();
    }, []);

    const fetchVehicles = async () => {
        try {
            setLoading(true);
            const data = await vehicleService.getAll();
            setVehicles(data);
            setError('');
        } catch (err) {
            setError('Failed to fetch vehicles');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const openAdd = () => {
        setForm(EMPTY);
        setModal('add');
    };

    const openEdit = (v) => {
        setForm({
            name: v.name,
            model: v.model || '',
            license_plate: v.license_plate,
            max_load: v.max_load,
            odometer: v.odometer,
            status: v.status
        });
        setEditId(v._id || v.id);
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
            if (!form.name || !form.model || !form.license_plate || !form.max_load || !form.odometer) {
                setError('All fields are required');
                return;
            }

            const data = {
                name: form.name,
                model: form.model,  // Make sure this is not empty
                license_plate: form.license_plate,
                max_load: Number(form.max_load),
                odometer: Number(form.odometer),
                status: form.status || 'Available'
            };

            console.log('Sending data:', data); // Debug log

            if (modal === 'add') {
                const newVehicle = await vehicleService.create(data);
                setVehicles([newVehicle, ...vehicles]);
            } else {
                // For edit, you might want a different approach
                const updatedVehicle = await vehicleService.updateStatus(editId, data.status);
                // Update other fields if needed
                setVehicles(vehicles.map(v =>
                    (v._id === editId || v.id === editId) ? { ...v, ...data } : v
                ));
            }
            closeModal();
            setError('');
        } catch (err) {
            console.error('Save error:', err);
            setError('Failed to save vehicle: ' + (err.message || 'Unknown error'));
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this vehicle?')) {
            try {
                await vehicleService.delete(id);
                setVehicles(vehicles.filter(v => v._id !== id && v.id !== id));
            } catch (err) {
                setError('Failed to delete vehicle');
                console.error(err);
            }
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            await vehicleService.updateStatus(id, newStatus);
            // Refresh the list
            fetchVehicles();
        } catch (err) {
            setError('Failed to update status');
            console.error(err);
        }
    };

    // Filter vehicles based on search and filters
    const filtered = vehicles.filter((v) => {
        const q = search.toLowerCase();
        const matchSearch = !q ||
            (v.name?.toLowerCase().includes(q) ||
                v.license_plate?.toLowerCase().includes(q) ||
                v.model?.toLowerCase().includes(q));

        const vehicleType = v.model?.toLowerCase().includes('truck') ? 'truck' :
            v.model?.toLowerCase().includes('van') ? 'van' : 'bike';
        const matchType = filterType === 'all' || vehicleType === filterType;

        const matchStatus = filterStatus === 'all' ||
            v.status?.toLowerCase().replace(' ', '_') === filterStatus;

        return matchSearch && matchType && matchStatus;
    });

    const field = (key, label, type = 'text', opts = null) => (
        <div className="form-group">
            <label className="form-label">{label}</label>
            {opts ? (
                <select
                    className="form-control"
                    value={form[key] || ''}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                >
                    {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
            ) : (
                <input
                    className="form-control"
                    type={type}
                    value={form[key] || ''}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                />
            )}
        </div>
    );

    if (loading) {
        return <div className="loading">Loading vehicles...</div>;
    }

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <div className="page-title">Vehicle Registry</div>
                    <div className="page-sub">{vehicles.length} total vehicles</div>
                </div>
                <div className="page-actions">
                    <select
                        className="form-control"
                        style={{ width: 120 }}
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                    >
                        <option value="all">All Types</option>
                        <option value="truck">Truck</option>
                        <option value="van">Van</option>
                        <option value="bike">Bike</option>
                    </select>
                    <select
                        className="form-control"
                        style={{ width: 140 }}
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        <option value="available">Available</option>
                        <option value="on_trip">On Trip</option>
                        <option value="in_shop">In Shop</option>
                        <option value="out_of_service">Out of Service</option>
                    </select>
                    <button className="btn btn-primary" onClick={openAdd}>+ Add Vehicle</button>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger" style={{ margin: '1rem 0' }}>
                    {error}
                </div>
            )}

            <div className="table-wrapper">
                <div className="table-toolbar">
                    <span className="table-toolbar-title">Fleet Assets ({filtered.length})</span>
                    <div className="search-wrap">
                        <span className="search-icon">🔍</span>
                        <input
                            className="search-input"
                            placeholder="Search vehicles..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Vehicle</th><th>License Plate</th><th>Type</th>
                            <th>Capacity (kg)</th><th>Odometer</th>
                            <th>Status</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={7}>
                                    <div className="empty-state">
                                        <div className="empty-state-icon">🚛</div>
                                        <div className="empty-state-text">No vehicles found</div>
                                    </div>
                                </td>
                            </tr>
                        ) : filtered.map(v => (
                            <tr key={v._id || v.id}>
                                <td><strong>{v.name}</strong> {v.model && <span className="text-muted">({v.model})</span>}</td>
                                <td className="font-mono">{v.license_plate}</td>
                                <td>
                                    <span className="tag">
                                        {v.model?.toLowerCase().includes('truck') ? 'Truck' :
                                            v.model?.toLowerCase().includes('van') ? 'Van' : 'Bike'}
                                    </span>
                                </td>
                                <td>{v.max_load?.toLocaleString()}</td>
                                <td>{v.odometer?.toLocaleString()} km</td>
                                <td>
                                    <StatusBadge status={v.status} />
                                </td>
                                <td>
                                    <div className="actions">
                                        <select
                                            className="btn btn-secondary btn-sm"
                                            value={v.status}
                                            onChange={(e) => handleStatusChange(v._id || v.id, e.target.value)}
                                            style={{ marginRight: '0.5rem' }}
                                        >
                                            <option value="Available">Available</option>
                                            <option value="On Trip">On Trip</option>
                                            <option value="In Shop">In Shop</option>
                                            <option value="Out of Service">Out of Service</option>
                                        </select>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => openEdit(v)}
                                            style={{ marginRight: '0.5rem' }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={() => handleDelete(v._id || v.id)}
                                        >
                                            Del
                                        </button>
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
                    footer={
                        <>
                            <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave}>Save Vehicle</button>
                        </>
                    }
                >
                    <div className="form-grid">
                        {field('name', 'Vehicle Name')}
                        {field('model', 'Model')}
                        {field('license_plate', 'License Plate')}
                        {field('max_load', 'Max Capacity (kg)', 'number')}
                        {field('odometer', 'Odometer (km)', 'number')}
                        {field('status', 'Status', 'text', [
                            { v: 'Available', l: 'Available' },
                            { v: 'On Trip', l: 'On Trip' },
                            { v: 'In Shop', l: 'In Shop' },
                            { v: 'Out of Service', l: 'Out of Service' },
                        ])}
                    </div>
                </Modal>
            )}
        </div>
    );
}