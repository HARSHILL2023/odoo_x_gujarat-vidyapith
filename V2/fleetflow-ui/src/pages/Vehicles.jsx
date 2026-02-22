import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useFleet } from '../context/FleetContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import SkeletonTable from '../components/SkeletonTable';
import useCountUp from '../hooks/useCountUp';
import { showToast } from '../hooks/useToast';
import {
    LayoutGrid, List, Plus, Search,
    Filter, MoreHorizontal, Truck, CheckCircle2,
    Map, Wrench, MapPin, Edit2, Trash2,
    Bike, Bus, Package, Slash, AlertCircle,
    Archive, Navigation, HelpCircle
} from 'lucide-react';

/* ─── Constants ───────────────────────────────────────────── */
const EMPTY = {
    name: '', license_plate: '', type: 'van', max_capacity: '',
    odometer: '', status: 'available', region: '', acquisition_cost: '',
};

const STATUS_META = {
    available: { color: '#22c55e', label: 'Available', Icon: CheckCircle2 },
    on_trip: { color: '#38bdf8', label: 'On Trip', Icon: Navigation },
    in_shop: { color: '#f59e0b', label: 'In Shop', Icon: Wrench },
    retired: { color: '#94a3b8', label: 'Retired', Icon: Archive },
    suspended: { color: '#ef4444', label: 'Suspended', Icon: AlertCircle },
};

const TYPE_OPTS = [
    { v: 'van', l: 'Van', Icon: Bus },
    { v: 'truck', l: 'Truck', Icon: Truck },
    { v: 'bike', l: 'Bike', Icon: Bike },
];

const STATUS_OPTS = [
    { v: 'available', l: 'Available', Icon: CheckCircle2 },
    { v: 'on_trip', l: 'On Trip', Icon: Navigation },
    { v: 'in_shop', l: 'In Shop', Icon: Wrench },
    { v: 'retired', l: 'Retired', Icon: Archive },
];

const SORT_OPTS = [
    { v: 'name', l: 'Name A–Z' },
    { v: 'capacity_desc', l: 'Capacity ↓' },
    { v: 'odometer_desc', l: 'Odometer ↓' },
    { v: 'cost_desc', l: 'Acq. Cost ↓' },
    { v: 'status', l: 'Status' },
];

const sid = val => String(val?._id ?? val ?? '');
const getVehicleIcon = t => {
    const opt = TYPE_OPTS.find(o => o.v === t);
    return opt ? <opt.Icon size={16} /> : <Truck size={16} />;
};

function VehicleTypeBadge({ type }) {
    const Icon = TYPE_OPTS.find(o => o.v === type)?.Icon ?? Truck;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontWeight: 600,
            padding: '3px 9px', borderRadius: 999,
            background: 'rgba(255,255,255,0.06)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--glass-border)',
            textTransform: 'capitalize',
        }}>
            <Icon size={12} /> {type}
        </span>
    );
}

/* ─── Inline capacity bar ─────────────────────────────────── */
function CapBar({ value, max, label = true }) {
    const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
    const color = pct > 90 ? '#22c55e' : pct > 60 ? '#38bdf8' : '#94a3b8';
    return (
        <div aria-label={`Storage capacity: ${value} of ${max} kg (${pct}%)`} style={{ minWidth: 90 }}>
            {label && (
                <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: 10, color: 'var(--text-muted)', marginBottom: 3,
                }}>
                    <span>{value.toLocaleString()} kg</span>
                    <span style={{ color, fontWeight: 600 }}>{pct}%</span>
                </div>
            )}
            <div style={{
                height: 5, background: 'rgba(255,255,255,0.06)',
                borderRadius: 999, overflow: 'hidden',
            }}>
                <div style={{
                    width: `${pct}%`, height: '100%', borderRadius: 999,
                    background: color,
                    boxShadow: `0 0 6px ${color}80`,
                    transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                }} />
            </div>
        </div>
    );
}

/* ─── Vehicle Card (Grid) ─────────────────────────────────── */
function VehicleCard({ vehicle, maxCapFleet, onEdit, onRetire }) {
    const [confirmRetire, setConfirmRetire] = useState(false);
    const cap = vehicle.maxCapacity ?? vehicle.max_capacity ?? 0;
    const meta = STATUS_META[vehicle.status] ?? STATUS_META.available;
    const acq = vehicle.acquisition_cost ?? vehicle.acquisitionCost ?? 0;

    return (
        <div
            className="ff-card"
            style={{
                background: 'var(--bg-card)',
                border: `1px solid var(--glass-border)`,
                borderTop: `3px solid ${meta.color}`,
                borderRadius: 14, overflow: 'hidden',
                transition: 'transform 0.22s ease, box-shadow 0.22s ease',
                cursor: 'default', position: 'relative',
            }}
            onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = `0 12px 32px rgba(0,0,0,0.25), 0 0 0 1px ${meta.color}30`;
            }}
            onMouseLeave={e => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = '';
            }}
        >
            {/* Status glow blob */}
            <div style={{
                position: 'absolute', top: -20, right: -20,
                width: 80, height: 80, borderRadius: '50%',
                background: meta.color, opacity: 0.08,
                filter: 'blur(20px)', pointerEvents: 'none',
            }} />

            <div style={{ padding: '18px 16px 16px', position: 'relative' }}>
                {/* Type emoji */}
                <div style={{
                    display: 'flex', justifyContent: 'center',
                    marginBottom: 10, color: meta.color,
                    filter: `drop-shadow(0 2px 8px ${meta.color}40)`,
                }}>
                    {getVehicleIcon(vehicle.type)}
                </div>

                {/* Name */}
                <div style={{
                    fontWeight: 800, fontSize: 15, textAlign: 'center',
                    marginBottom: 5, color: 'var(--text-primary)',
                    fontFamily: 'var(--font-heading)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                    {vehicle.name}
                </div>

                {/* License plate */}
                <div style={{ textAlign: 'center', marginBottom: 10 }}>
                    <code style={{
                        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 5, padding: '2px 9px',
                        color: 'var(--text-secondary)', letterSpacing: '0.5px',
                    }}>
                        {vehicle.licensePlate ?? vehicle.license_plate}
                    </code>
                </div>

                {/* Status badge */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                    <StatusBadge status={vehicle.status} />
                </div>

                {/* Capacity bar */}
                <div style={{ marginBottom: 10 }}>
                    <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        fontSize: 10, color: 'var(--text-muted)', marginBottom: 4,
                    }}>
                        <span>Max Cargo</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {cap.toLocaleString()} kg
                        </span>
                    </div>
                    <CapBar value={cap} max={maxCapFleet} label={false} />
                </div>

                {/* Stats row */}
                <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr',
                    gap: 8, marginBottom: 12,
                }}>
                    <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 8, padding: '7px 10px',
                    }}>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>
                            Odometer
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                            {(vehicle.odometer ?? 0).toLocaleString()}
                            <span style={{ fontWeight: 400, fontSize: 9, color: 'var(--text-muted)', marginLeft: 2 }}>km</span>
                        </div>
                    </div>
                    <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 8, padding: '7px 10px',
                    }}>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>
                            Acq. Cost
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                            {acq > 0 ? `$${(acq / 1000).toFixed(0)}k` : '—'}
                        </div>
                    </div>
                </div>

                {/* Region pill */}
                {vehicle.region && (
                    <div style={{ textAlign: 'center', marginBottom: 12 }}>
                        <span style={{
                            fontSize: 10, fontWeight: 700,
                            background: 'var(--accent-glow)', color: 'var(--accent)',
                            border: '1px solid var(--accent)',
                            borderRadius: 999, padding: '2px 10px',
                            textTransform: 'uppercase', letterSpacing: '0.5px',
                        }}>
                            <MapPin size={10} style={{ marginRight: 4 }} /> {vehicle.region}
                        </span>
                    </div>
                )}

                {/* Actions */}
                {confirmRetire ? (
                    <div style={{
                        display: 'flex', gap: 6, flexDirection: 'column',
                        padding: '10px', background: 'rgba(239,68,68,0.08)',
                        border: '1px solid rgba(239,68,68,0.25)', borderRadius: 9,
                    }}>
                        <div style={{ fontSize: 11, color: 'var(--red-t)', textAlign: 'center', fontWeight: 600 }}>
                            Retire this vehicle?
                        </div>
                        <div style={{ display: 'flex', gap: 5 }}>
                            <button
                                className="btn btn-secondary btn-sm"
                                style={{ flex: 1 }}
                                onClick={() => setConfirmRetire(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-danger btn-sm"
                                style={{ flex: 1 }}
                                onClick={() => { setConfirmRetire(false); onRetire(sid(vehicle)); }}
                            >
                                <Trash2 size={12} /> Retire
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button
                            className="btn btn-secondary btn-sm"
                            style={{ flex: 1, justifyContent: 'center' }}
                            onClick={() => onEdit(vehicle)}
                        >
                            <Edit2 size={12} /> Edit
                        </button>
                        {vehicle.status !== 'retired' && (
                            <button
                                className="btn btn-danger btn-sm"
                                style={{ flex: 1, justifyContent: 'center' }}
                                onClick={() => setConfirmRetire(true)}
                            >
                                <Archive size={12} /> Retire
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── Modal vehicle preview ───────────────────────────────── */
function VehiclePreview({ form }) {
    const meta = STATUS_META[form.status] ?? STATUS_META.available;
    if (!form.name && !form.license_plate) return null;
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px', marginBottom: 18,
            background: `${meta.color}0d`,
            border: `1px solid ${meta.color}30`,
            borderRadius: 10,
        }}>
            <div style={{
                color: meta.color,
                filter: `drop-shadow(0 2px 6px ${meta.color}60)`,
            }}>
                {getVehicleIcon(form.type)}
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                    {form.name || 'Unnamed Vehicle'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                    {form.license_plate && (
                        <code style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid var(--glass-border)',
                            padding: '1px 6px', borderRadius: 4,
                            fontSize: 10, fontFamily: 'var(--font-mono)',
                        }}>
                            {form.license_plate}
                        </code>
                    )}
                    {form.region && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={10} /> {form.region}</span>}
                </div>
            </div>
            <div style={{
                padding: '3px 10px', borderRadius: 999,
                background: `${meta.color}20`,
                color: meta.color, fontSize: 11, fontWeight: 700,
                border: `1px solid ${meta.color}35`,
                display: 'flex', alignItems: 'center', gap: 6
            }}>
                <meta.Icon size={12} /> {meta.label}
            </div>
        </div>
    );
}

/* ─── Main Component ──────────────────────────────────────── */
export default function Vehicles() {
    const { vehicles, loading, addVehicle, updateVehicle, deleteVehicle } = useFleet();
    const location = useLocation();

    const [viewMode, setViewMode] = useState(() => localStorage.getItem('ff-vehicles-view') || 'table');
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [sortBy, setSortBy] = useState('name');
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [editId, setEditId] = useState(null);
    const [confirmRetireId, setConfirmRetireId] = useState(null);

    useEffect(() => {
        if (location.state?.openCreate) { setForm(EMPTY); setModal('add'); }
    }, [location.state]);

    const persistView = v => { setViewMode(v); localStorage.setItem('ff-vehicles-view', v); };
    const openAdd = () => { setForm(EMPTY); setModal('add'); };
    const openEdit = v => { setForm({ ...EMPTY, ...v }); setEditId(sid(v)); setModal('edit'); };
    const closeModal = () => { setModal(null); setEditId(null); };

    /* ── Aggregates ───────────────────────────────────────── */
    const availCount = vehicles.filter(v => v.status === 'available').length;
    const onTripCount = vehicles.filter(v => v.status === 'on_trip').length;
    const inShopCount = vehicles.filter(v => v.status === 'in_shop').length;
    const totalCount = vehicles.length;

    const animTotal = useCountUp(totalCount);
    const animAvail = useCountUp(availCount);
    const animTrip = useCountUp(onTripCount);
    const animShop = useCountUp(inShopCount);

    const utilizationPct = totalCount > 0
        ? Math.round((onTripCount / totalCount) * 100)
        : 0;

    /* ── Filter + Sort ────────────────────────────────────── */
    const maxCapFleet = Math.max(...vehicles.map(v => v.max_capacity ?? 0), 1);

    const filtered = vehicles
        .filter(v => {
            const q = search.toLowerCase();
            const ms = !q ||
                (v.name || '').toLowerCase().includes(q) ||
                (v.license_plate || '').toLowerCase().includes(q) ||
                (v.region || '').toLowerCase().includes(q);
            const mt = filterType === 'all' || v.type === filterType;
            const mf = filterStatus === 'all' || v.status === filterStatus;
            return ms && mt && mf;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'capacity_desc': return (b.max_capacity ?? 0) - (a.max_capacity ?? 0);
                case 'odometer_desc': return (b.odometer ?? 0) - (a.odometer ?? 0);
                case 'cost_desc': return (b.acquisition_cost ?? 0) - (a.acquisition_cost ?? 0);
                case 'status': return (a.status ?? '').localeCompare(b.status ?? '');
                default: return (a.name ?? '').localeCompare(b.name ?? '');
            }
        });

    /* ── Save ─────────────────────────────────────────────── */
    const handleSave = async () => {
        if (!form.name.trim()) { showToast({ message: 'Vehicle name is required.', type: 'error' }); return; }
        if (!form.license_plate.trim()) { showToast({ message: 'License plate is required.', type: 'error' }); return; }
        const data = {
            ...form,
            max_capacity: Number(form.max_capacity) || 0,
            odometer: Number(form.odometer) || 0,
            acquisition_cost: Number(form.acquisition_cost) || 0,
        };
        try {
            if (modal === 'add') {
                await addVehicle(data);
                showToast({ message: 'Vehicle added successfully', type: 'success' });
            } else {
                await updateVehicle(editId, data);
                showToast({ message: 'Vehicle updated!', type: 'success' });
            }
            closeModal();
        } catch (e) {
            showToast({ message: e.message, type: 'error' });
        }
    };

    const handleRetire = async id => {
        try {
            await deleteVehicle(id);
            showToast({ message: 'Vehicle retired.', type: 'warning' });
        } catch (e) {
            showToast({ message: e.message, type: 'error' });
        } finally {
            setConfirmRetireId(null);
        }
    };

    if (loading) return <SkeletonTable rows={6} cols={5} />;

    return (
        <div className="fade-in">
            {/* ── Page Actions ────────────────────────────────── */}
            <div className="page-header">
                <div className="page-sub">
                    {totalCount} vehicles · {utilizationPct}% utilization
                </div>
                <div className="page-actions">
                    {/* Filters */}
                    <select
                        className="form-control"
                        style={{ flex: 1, height: 34, fontSize: 12, minWidth: 100 }}
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                    >
                        <option value="all">All Types</option>
                        {TYPE_OPTS.map(o => (
                            <option key={o.v} value={o.v}>{o.l}</option>
                        ))}
                    </select>
                    <select
                        className="form-control"
                        style={{ flex: 1, height: 34, fontSize: 12, minWidth: 100 }}
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        {STATUS_OPTS.map(o => (
                            <option key={o.v} value={o.v}>{o.l}</option>
                        ))}
                    </select>
                    {/* View toggle */}
                    <div className="ff-view-toggle">
                        {[
                            { v: 'table', label: 'Table', Icon: List },
                            { v: 'grid', label: 'Grid', Icon: LayoutGrid }
                        ].map(({ v, label, Icon }) => (
                            <button
                                key={v}
                                className={`ff-view-btn ${viewMode === v ? 'active' : ''}`}
                                onClick={() => persistView(v)}
                                aria-label={`Switch to ${label} view`}
                                aria-pressed={viewMode === v}
                            >
                                <Icon size={14} aria-hidden="true" />
                                {label}
                            </button>
                        ))}
                    </div>
                    <button className="btn btn-primary" onClick={openAdd} aria-label="Add new vehicle" style={{ flex: '1 0 100%', justifyContent: 'center', marginTop: 4 }}>
                        <Plus size={14} aria-hidden="true" /> Add Vehicle
                    </button>
                </div>
            </div>

            {/* ── KPI Strip ─────────────────────────────────── */}
            <div className="kpi-grid" style={{ marginBottom: 20 }}>
                <div
                    className="kpi-card blue ff-card"
                    style={{ animation: 'fadeInScale 0.35s ease 0ms both', cursor: 'pointer' }}
                    onClick={() => setFilterStatus('all')}
                >
                    <div className="kpi-icon"><Truck size={20} strokeWidth={2} /></div>
                    <div className="kpi-label">Total Fleet</div>
                    <div className="kpi-value">{animTotal}</div>
                    <div className="kpi-sub">registered</div>
                </div>
                <div
                    className="kpi-card green ff-card"
                    style={{ animation: 'fadeInScale 0.35s ease 60ms both', cursor: 'pointer' }}
                    onClick={() => setFilterStatus(filterStatus === 'available' ? 'all' : 'available')}
                >
                    <div className="kpi-icon"><CheckCircle2 size={20} strokeWidth={2} /></div>
                    <div className="kpi-label">Available</div>
                    <div className="kpi-value">{animAvail}</div>
                    <div className="kpi-sub">ready to dispatch</div>
                </div>
                <div
                    className="kpi-card blue ff-card"
                    style={{ animation: 'fadeInScale 0.35s ease 120ms both', cursor: 'pointer' }}
                    onClick={() => setFilterStatus(filterStatus === 'on_trip' ? 'all' : 'on_trip')}
                >
                    <div className="kpi-icon"><Map size={20} strokeWidth={2} /></div>
                    <div className="kpi-label">On Trip</div>
                    <div className="kpi-value">{animTrip}</div>
                    <div className="kpi-sub">{utilizationPct}% utilization</div>
                </div>
                <div
                    className="kpi-card orange ff-card"
                    style={{ animation: 'fadeInScale 0.35s ease 180ms both', cursor: 'pointer' }}
                    onClick={() => setFilterStatus(filterStatus === 'in_shop' ? 'all' : 'in_shop')}
                >
                    <div className="kpi-icon"><Wrench size={20} strokeWidth={2} /></div>
                    <div className="kpi-label">In Shop</div>
                    <div className="kpi-value">{animShop}</div>
                    <div className="kpi-sub">under maintenance</div>
                </div>
            </div>

            {/* ── GRID VIEW ─────────────────────────────────── */}
            {viewMode === 'grid' && (
                <>
                    {/* Grid search */}
                    <div style={{
                        display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap'
                    }}>
                        <div className="search-wrap" style={{ flex: '1 1 200px' }}>
                            <span className="search-icon"><Search size={14} /></span>
                            <input
                                className="search-input"
                                placeholder="Search vehicles…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <select
                            className="form-control"
                            style={{ width: 150, height: 34, fontSize: 12 }}
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value)}
                        >
                            {SORT_OPTS.map(o => (
                                <option key={o.v} value={o.v}>{o.l}</option>
                            ))}
                        </select>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {filtered.length} vehicle{filtered.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                        gap: 16,
                    }}>
                        {filtered.length === 0 ? (
                            <div className="empty-state" style={{ gridColumn: '1/-1', padding: '48px 0' }}>
                                <div className="empty-state-icon"><Truck size={40} opacity={0.2} /></div>
                                <div className="empty-state-text">
                                    {search || filterType !== 'all' || filterStatus !== 'all'
                                        ? 'No vehicles match your filters'
                                        : 'No vehicles registered yet'}
                                </div>
                                {!search && filterType === 'all' && filterStatus === 'all' && (
                                    <button
                                        className="btn btn-primary btn-sm"
                                        style={{ marginTop: 12 }}
                                        onClick={openAdd}
                                    >
                                        <Plus size={14} /> Add First Vehicle
                                    </button>
                                )}
                            </div>
                        ) : filtered.map(v => (
                            <VehicleCard
                                key={sid(v)} vehicle={v}
                                maxCapFleet={maxCapFleet}
                                onEdit={openEdit}
                                onRetire={handleRetire}
                            />
                        ))}
                    </div>
                </>
            )}

            {/* ── TABLE VIEW ────────────────────────────────── */}
            {viewMode === 'table' && (
                <div className="table-wrapper">
                    <div className="table-toolbar">
                        <span className="table-toolbar-title">
                            Fleet Assets
                            <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>
                                ({filtered.length})
                            </span>
                        </span>
                        <div className="page-actions" style={{ marginLeft: 'auto' }}>
                            <select
                                className="form-control"
                                style={{ width: 150, height: 32, fontSize: 12 }}
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value)}
                            >
                                {SORT_OPTS.map(o => (
                                    <option key={o.v} value={o.v}>{o.l}</option>
                                ))}
                            </select>
                            <div className="search-wrap">
                                <span className="search-icon"><Search size={14} /></span>
                                <input
                                    className="search-input"
                                    placeholder="Search name, plate, region…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <table className="data-table ff-table">
                        <thead>
                            <tr>
                                <th>Vehicle</th>
                                <th>Plate</th>
                                <th>Type</th>
                                <th>Capacity</th>
                                <th>Odometer</th>
                                <th>Region</th>
                                <th>Acq. Cost</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <div colSpan={9}>
                                        <div className="empty-state">
                                            <div className="empty-state-icon"><Truck size={40} opacity={0.2} /></div>
                                            <div className="empty-state-text">
                                                {search || filterType !== 'all' || filterStatus !== 'all'
                                                    ? 'No vehicles match your filters'
                                                    : 'No vehicles registered yet'}
                                            </div>
                                            {!search && filterType === 'all' && filterStatus === 'all' && (
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    style={{ marginTop: 12 }}
                                                    onClick={openAdd}
                                                >
                                                    <Plus size={14} /> Add First Vehicle
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </tr>
                            ) : filtered.map(v => {
                                const meta = STATUS_META[v.status] ?? STATUS_META.available;
                                const acq = v.acquisition_cost ?? 0;
                                const isRetireRow = confirmRetireId === sid(v);
                                return (
                                    <tr
                                        key={sid(v)}
                                        style={{
                                            borderLeft: `3px solid ${meta.color}`,
                                            background: isRetireRow ? 'rgba(239,68,68,0.04)' : undefined,
                                        }}
                                    >
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                                {React.createElement(TYPE_OPTS.find(o => o.v === v.type)?.Icon ?? Truck, { size: 18, style: { opacity: 0.8 } })}
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: 13 }}>{v.name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <code style={{
                                                fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid var(--glass-border)',
                                                padding: '2px 7px', borderRadius: 5,
                                                color: 'var(--text-secondary)',
                                            }}>
                                                {v.license_plate}
                                            </code>
                                        </td>
                                        <td>
                                            <VehicleTypeBadge type={v.type} />
                                        </td>
                                        <td style={{ minWidth: 110 }}>
                                            <CapBar
                                                value={v.max_capacity ?? 0}
                                                max={maxCapFleet}
                                            />
                                        </td>
                                        <td>
                                            <span style={{ fontSize: 13 }}>
                                                {(v.odometer ?? 0).toLocaleString()}
                                                <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 2 }}>km</span>
                                            </span>
                                        </td>
                                        <td>
                                            {v.region ? (
                                                <span style={{
                                                    fontSize: 10, fontWeight: 700,
                                                    background: 'var(--accent-glow)', color: 'var(--accent)',
                                                    border: '1px solid var(--accent)',
                                                    borderRadius: 999, padding: '2px 8px',
                                                    textTransform: 'uppercase', letterSpacing: '0.4px',
                                                }}>
                                                    {v.region}
                                                </span>
                                            ) : <span className="text-muted">—</span>}
                                        </td>
                                        <td>
                                            <span style={{
                                                fontWeight: 600, fontSize: 13,
                                                color: acq > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                                            }}>
                                                {acq > 0 ? `$${acq.toLocaleString()}` : '—'}
                                            </span>
                                        </td>
                                        <td><StatusBadge status={v.status} /></td>
                                        <td>
                                            {isRetireRow ? (
                                                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                                                    <span style={{ fontSize: 11, color: 'var(--red-t)', fontWeight: 600 }}>
                                                        Sure?
                                                    </span>
                                                    <button
                                                        className="btn btn-danger btn-sm"
                                                        onClick={() => handleRetire(sid(v))}
                                                    >
                                                        Yes
                                                    </button>
                                                    <button
                                                        className="btn btn-secondary btn-sm"
                                                        onClick={() => setConfirmRetireId(null)}
                                                    >
                                                        No
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="actions">
                                                    <button
                                                        className="btn btn-secondary btn-sm"
                                                        onClick={() => openEdit(v)}
                                                    >
                                                        <Edit2 size={12} /> Edit
                                                    </button>
                                                    {v.status !== 'retired' && (
                                                        <button
                                                            className="btn btn-danger btn-sm"
                                                            onClick={() => setConfirmRetireId(sid(v))}
                                                        >
                                                            <Archive size={12} /> Retire
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Add / Edit Modal ──────────────────────────── */}
            {modal && (
                <Modal
                    title={modal === 'add' ? <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Truck size={20} /> Register New Vehicle</span> : <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Edit2 size={18} /> Edit Vehicle</span>}
                    onClose={closeModal}
                    footer={<>
                        <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSave}>
                            {modal === 'add' ? 'Add Vehicle' : 'Save Changes'}
                        </button>
                    </>}
                >
                    {/* Live preview */}
                    <VehiclePreview form={form} />

                    <div className="form-grid">
                        {/* Name */}
                        <div className="form-group">
                            <label className="form-label">Vehicle Name / Model *</label>
                            <input
                                className="form-control"
                                placeholder="e.g. Tata Ace Gold"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                            />
                        </div>

                        {/* Plate */}
                        <div className="form-group">
                            <label className="form-label">License Plate *</label>
                            <input
                                className="form-control"
                                placeholder="e.g. GJ-01-AB-1234"
                                value={form.license_plate}
                                onChange={e => setForm({ ...form, license_plate: e.target.value.toUpperCase() })}
                                style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.5px' }}
                            />
                        </div>

                        {/* Type */}
                        <div className="form-group">
                            <label className="form-label">Vehicle Type</label>
                            <select
                                className="form-control"
                                value={form.type}
                                onChange={e => setForm({ ...form, type: e.target.value })}
                            >
                                {TYPE_OPTS.map(o => (
                                    <option key={o.v} value={o.v}>{o.l}</option>
                                ))}
                            </select>
                        </div>

                        {/* Status */}
                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select
                                className="form-control"
                                value={form.status}
                                onChange={e => setForm({ ...form, status: e.target.value })}
                                style={{
                                    borderColor: `${STATUS_META[form.status]?.color ?? '#94a3b8'}50`,
                                    color: STATUS_META[form.status]?.color,
                                    fontWeight: 600,
                                }}
                            >
                                {STATUS_OPTS.map(o => (
                                    <option key={o.v} value={o.v}>{o.l}</option>
                                ))}
                            </select>
                        </div>

                        {/* Max capacity */}
                        <div className="form-group">
                            <label className="form-label">
                                Max Capacity (kg)
                                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6, fontWeight: 400 }}>
                                    for cargo validation
                                </span>
                            </label>
                            <input
                                className="form-control"
                                type="number" min="0"
                                placeholder="e.g. 2000"
                                value={form.max_capacity}
                                onChange={e => setForm({ ...form, max_capacity: e.target.value })}
                            />
                        </div>

                        {/* Odometer */}
                        <div className="form-group">
                            <label className="form-label">Odometer (km)</label>
                            <input
                                className="form-control"
                                type="number" min="0"
                                placeholder="e.g. 45000"
                                value={form.odometer}
                                onChange={e => setForm({ ...form, odometer: e.target.value })}
                            />
                        </div>

                        {/* Region */}
                        <div className="form-group">
                            <label className="form-label">
                                Region
                                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6, fontWeight: 400 }}>
                                    for smart dispatch
                                </span>
                            </label>
                            <input
                                className="form-control"
                                placeholder="e.g. North, South, West"
                                value={form.region}
                                onChange={e => setForm({ ...form, region: e.target.value })}
                            />
                        </div>

                        {/* Acquisition cost */}
                        <div className="form-group">
                            <label className="form-label">
                                Acquisition Cost ($)
                                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6, fontWeight: 400 }}>
                                    for ROI tracking
                                </span>
                            </label>
                            <input
                                className="form-control"
                                type="number" min="0"
                                placeholder="e.g. 25000"
                                value={form.acquisition_cost}
                                onChange={e => setForm({ ...form, acquisition_cost: e.target.value })}
                            />
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
