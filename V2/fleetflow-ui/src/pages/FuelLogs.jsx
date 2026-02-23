import { memo, useCallback, useMemo, useState } from 'react';
import { useFleet } from '../context/FleetContext';
import Modal from '../components/Modal';
import SkeletonTable from '../components/SkeletonTable';
import Skeleton from '../components/Skeleton';
import useCountUp from '../hooks/useCountUp';
import toast from '../hooks/useToast';
import {
    ClipboardList, Droplet, IndianRupee, Calendar,
    Search, X, TrendingDown, TrendingUp,
    Fuel, Trash2, CheckCircle2, AlertTriangle,
    History, MapPin, Plus, List
} from 'lucide-react';

/* ════════════════════════════════════════════════════════════
   CONSTANTS
   ════════════════════════════════════════════════════════════ */
const EMPTY = {
    vehicleId: '', tripId: '', date: '',
    liters: '', cost: '', odometer: '',
};

const sid = (val) => String(val?._id ?? val ?? '');

const GRADIENT_COLORS = [
    'linear-gradient(90deg,#38bdf8,#3b82f6)',
    'linear-gradient(90deg,#a78bfa,#6366f1)',
    'linear-gradient(90deg,#34d399,#22c55e)',
    'linear-gradient(90deg,#fb923c,#f59e0b)',
    'linear-gradient(90deg,#f87171,#ef4444)',
];

/* Typical Indian fuel cost threshold (₹/L) */
const COST_THRESHOLD = 100;

/* ════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ════════════════════════════════════════════════════════════ */

/* ── EffBadge ──────────────────────────────────────────────── */
/* ── EffBadge (Memoized) ────────────────────────────────────── */
const EffBadge = memo(function EffBadge({ costPerL }) {
    if (!costPerL || isNaN(costPerL)) return null;
    const isGood = costPerL < COST_THRESHOLD;
    return (
        <span
            aria-label={`Fuel cost: ₹${costPerL.toFixed(2)} per litre (${isGood ? 'Good' : 'High'})`}
            style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                background: isGood ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                color: isGood ? 'var(--green-t)' : 'var(--red-t)',
                border: `1px solid ${isGood ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
            }}
        >
            {isGood ? <TrendingDown size={10} aria-hidden="true" /> : <TrendingUp size={10} aria-hidden="true" />} ₹{costPerL.toFixed(2)}/L
        </span>
    );
});

/* ── VehicleBar (Memoized) ──────────────────────────────────── */
const VehicleBar = memo(function VehicleBar({ v, totalCost, rank }) {
    const pct = totalCost > 0 ? (v.totalCost / totalCost) * 100 : 0;
    const bg = GRADIENT_COLORS[rank % GRADIENT_COLORS.length];

    return (
        <div className="stat-bar-item" style={{ gap: 6 }} aria-label={`${v.name} fuel cost: ₹${v.totalCost.toLocaleString()} (${pct.toFixed(0)}% of total)`}>
            <div className="stat-bar-label" style={{ fontSize: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: bg, flexShrink: 0,
                        boxShadow: `0 0 6px ${rank === 0 ? '#38bdf880' : '#a78bfa80'}`,
                    }} aria-hidden="true" />
                    <span style={{ fontWeight: 600 }}>{v.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                        {v.totalLiters.toFixed(1)} L
                    </span>
                    <strong style={{ color: 'var(--text-primary)' }}>
                        ₹{v.totalCost.toLocaleString()}
                    </strong>
                    <span style={{
                        fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '1px 6px', borderRadius: 999,
                    }}>
                        {pct.toFixed(0)}%
                    </span>
                </div>
            </div>
            <div className="stat-bar-track" aria-hidden="true">
                <div className="stat-bar-fill" style={{ width: `${pct}%`, background: bg }} />
            </div>
        </div>
    );
});

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════ */
export default function FuelLogs() {
    const {
        fuelLogs, vehicles, trips,
        addFuelLog, deleteFuelLog, loading,
    } = useFleet();

    const [modal, setModal] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [search, setSearch] = useState('');
    const [deleteId, setDeleteId] = useState(null);
    const [saving, setSaving] = useState(false);

    /* ── Lookup maps — FIX: original used .find() in render loop (O(n²)) ── */
    const vehicleMap = useMemo(() =>
        Object.fromEntries(vehicles.map(v => [sid(v), v])),
        [vehicles]
    );
    const tripMap = useMemo(() =>
        Object.fromEntries(trips.map(t => [sid(t), t])),
        [trips]
    );

    /* ── Resolved name helpers ──────────────────────────────── */
    const vehicleName = useCallback((log) => {
        /* FIX: vehicle field is a string _id — resolve via map */
        const v = vehicleMap[sid(log.vehicle)];
        return v?.name ?? `#${sid(log.vehicle).slice(-4) || '?'}`;
    }, [vehicleMap]);

    const tripRef = useCallback((log) => {
        if (!log.trip) return '—';
        const t = tripMap[sid(log.trip)];
        return t?.reference ?? '—';
    }, [tripMap]);

    /* ── Aggregates ─────────────────────────────────────────── */
    const totalCost = useMemo(
        () => fuelLogs.reduce((s, f) => s + (f.cost || 0), 0),
        [fuelLogs]
    );
    const totalLiters = useMemo(
        () => fuelLogs.reduce((s, f) => s + (f.liters || 0), 0),
        [fuelLogs]
    );
    const avgCostPerL = totalLiters > 0 ? totalCost / totalLiters : 0;

    const thisMonth = useMemo(() => {
        const now = new Date();
        return fuelLogs.filter(f => {
            const d = new Date(f.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
    }, [fuelLogs]);

    const monthCost = useMemo(
        () => thisMonth.reduce((s, f) => s + (f.cost || 0), 0),
        [thisMonth]
    );

    /* ── Animated KPIs ──────────────────────────────────────── */
    const animLogs = useCountUp(fuelLogs.length, { delay: 0, easing: 'ease-out-expo' });
    const animLiters = useCountUp(Math.round(totalLiters), { delay: 60, easing: 'ease-out-expo' });
    const animCost = useCountUp(Math.round(totalCost), { delay: 120, easing: 'ease-out-expo' });
    const animMonth = useCountUp(Math.round(monthCost), { delay: 180, easing: 'ease-out-expo' });

    /* ── Per-vehicle breakdown ──────────────────────────────── */
    const perVehicle = useMemo(() =>
        vehicles
            .map(v => {
                const vid = sid(v);
                const logs = fuelLogs.filter(f => sid(f.vehicle) === vid);
                return {
                    ...v,
                    totalCost: logs.reduce((s, f) => s + (f.cost || 0), 0),
                    totalLiters: logs.reduce((s, f) => s + (f.liters || 0), 0),
                };
            })
            .filter(v => v.totalCost > 0)
            .sort((a, b) => b.totalCost - a.totalCost),
        [vehicles, fuelLogs]
    );

    /* ── Sorted + filtered logs ─────────────────────────────── */
    const sortedLogs = useMemo(() =>
        [...fuelLogs].sort((a, b) => new Date(b.date) - new Date(a.date)),
        [fuelLogs]
    );

    const filtered = useMemo(() => {
        if (!search) return sortedLogs;
        const q = search.toLowerCase();
        return sortedLogs.filter(f =>
            vehicleName(f).toLowerCase().includes(q) ||
            tripRef(f).toLowerCase().includes(q) ||
            String(f.date).includes(q)
        );
    }, [sortedLogs, search, vehicleName, tripRef]);

    /* ── Live cost-per-litre preview ────────────────────────── */
    const previewCostPerL = useMemo(() => {
        const l = Number(form.liters);
        const c = Number(form.cost);
        return l > 0 && c > 0 ? (c / l).toFixed(2) : null;
    }, [form.liters, form.cost]);

    /* ── Filtered totals (for tfoot) ────────────────────────── */
    const filteredTotalLiters = useMemo(
        () => filtered.reduce((s, f) => s + (f.liters || 0), 0),
        [filtered]
    );
    const filteredTotalCost = useMemo(
        () => filtered.reduce((s, f) => s + (f.cost || 0), 0),
        [filtered]
    );

    /* ── Handlers ───────────────────────────────────────────── */
    const openModal = useCallback(() => {
        setForm(EMPTY);
        setModal(true);
    }, []);

    const closeModal = useCallback(() => {
        setModal(false);
        setForm(EMPTY);
        setSaving(false);
    }, []);

    const handleSave = useCallback(async () => {
        if (!form.vehicleId) {
            toast.error('Select a vehicle first.');
            return;
        }
        if (!form.liters || Number(form.liters) <= 0) {
            toast.error('Enter litres filled.');
            return;
        }
        if (!form.cost || Number(form.cost) <= 0) {
            toast.error('Enter total cost.');
            return;
        }
        setSaving(true);
        try {
            await addFuelLog({
                vehicle: form.vehicleId,
                trip: form.tripId || undefined,
                date: form.date || new Date().toISOString().slice(0, 10),
                liters: Number(form.liters),
                cost: Number(form.cost),
                odometer: form.odometer ? Number(form.odometer) : undefined,
            });
            closeModal();
            toast.success('Fuel entry added!');
        } catch (e) {
            toast.error(e.message ?? 'Failed to save.');
        } finally {
            setSaving(false);
        }
    }, [form, addFuelLog, closeModal]);

    const handleDelete = useCallback(async (id) => {
        try {
            await deleteFuelLog(id);
            setDeleteId(null);
            toast.warning('Entry deleted.');
        } catch (e) {
            toast.error(e.message ?? 'Delete failed.');
        }
    }, [deleteFuelLog]);

    /* ── Trips filtered by selected vehicle ─────────────────── */
    const tripsForVehicle = useMemo(() =>
        form.vehicleId
            ? trips.filter(t => sid(t.vehicle) === form.vehicleId)
            : trips,
        [trips, form.vehicleId]
    );

    if (loading) return (
        <div className="fade-in">
            <div className="kpi-grid" style={{ marginBottom: 20 }}>
                {Array.from({ length: 4 }).map((_, i) => <Skeleton.Stat key={i} />)}
            </div>
            <div className="table-wrapper ff-card" style={{ marginBottom: 20, padding: '16px 20px' }}>
                <Skeleton width="160px" height="14px" style={{ marginBottom: 12 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Skeleton width="120px" height="10px" />
                                <Skeleton width="60px" height="10px" />
                            </div>
                            <Skeleton width="100%" height="6px" borderRadius="10px" />
                        </div>
                    ))}
                </div>
            </div>
            <SkeletonTable rows={7} cols={8} />
        </div>
    );

    /* ════════════════════════════════════════════════════════
       RENDER
       ════════════════════════════════════════════════════════ */
    return (
        <div className="fade-in">

            {/* ── Page Actions ────────────────────────────────── */}
            <div className="page-header">
                <div className="page-sub">
                    Operational cost tracking
                </div>
                <div className="page-actions">
                    <button className="btn btn-primary" onClick={openModal}>
                        <Plus size={14} /> Add Entry
                    </button>
                </div>
            </div>

            {/* ── KPI Cards ───────────────────────────────── */}
            <div className="kpi-grid" style={{ marginBottom: 20 }}>

                <div className="kpi-card blue ff-card fade-in-scale"
                    style={{ animationDelay: '0ms' }}>
                    <div className="kpi-icon"><ClipboardList size={20} /></div>
                    <div className="kpi-label">Total Entries</div>
                    <div className="kpi-value">{animLogs}</div>
                    <div className="kpi-sub">fuel log records</div>
                </div>

                <div className="kpi-card green ff-card fade-in-scale"
                    style={{ animationDelay: '60ms' }}>
                    <div className="kpi-icon"><Fuel size={20} /></div>
                    <div className="kpi-label">Total Litres</div>
                    <div className="kpi-value">
                        {animLiters.toLocaleString()}
                        <span style={{ fontSize: 16, fontWeight: 500 }}>L</span>
                    </div>
                    <div className="kpi-sub">
                        avg ₹{avgCostPerL.toFixed(2)}/L
                    </div>
                </div>

                <div className="kpi-card orange ff-card fade-in-scale"
                    style={{ animationDelay: '120ms' }}>
                    <div className="kpi-icon"><IndianRupee size={20} /></div>
                    <div className="kpi-label">Total Spend</div>
                    <div className="kpi-value">₹{animCost.toLocaleString()}</div>
                    <div className="kpi-sub">all time</div>
                </div>

                <div className="kpi-card red ff-card fade-in-scale"
                    style={{ animationDelay: '180ms' }}>
                    <div className="kpi-icon"><Calendar size={20} /></div>
                    <div className="kpi-label">This Month</div>
                    <div className="kpi-value">₹{animMonth.toLocaleString()}</div>
                    <div className="kpi-sub">{thisMonth.length} entries</div>
                </div>

            </div>

            {/* ── Per-vehicle breakdown ────────────────────── */}
            {perVehicle.length > 0 && (
                <div className="table-wrapper ff-card"
                    style={{ marginBottom: 20, padding: '16px 20px' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', marginBottom: 16,
                    }}>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>
                                <Fuel size={14} className="text-muted" /> Fuel Cost by Vehicle
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                Share of total ₹{totalCost.toLocaleString()}
                            </div>
                        </div>
                        <span style={{
                            fontSize: 11, fontWeight: 600,
                            color: 'var(--text-muted)',
                            background: 'rgba(255,255,255,0.05)',
                            padding: '3px 10px', borderRadius: 999,
                        }}>
                            {perVehicle.length} vehicles
                        </span>
                    </div>
                    <div className="stat-bar-list">
                        {perVehicle.map((v, i) => (
                            <VehicleBar
                                key={sid(v)}
                                v={v}
                                totalCost={totalCost}
                                rank={i}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* ── All Entries Table ────────────────────────── */}
            <div className="table-wrapper">
                <div className="table-toolbar">
                    <span className="table-toolbar-title">
                        All Entries
                        <span style={{
                            marginLeft: 6, fontSize: 12,
                            fontWeight: 400, color: 'var(--text-muted)',
                        }}>
                            ({filtered.length})
                        </span>
                    </span>

                    {/* Search with clear button */}
                    <div className="search-wrap" style={{ position: 'relative', flex: '1 1 200px' }}>
                        <span className="search-icon"><Search size={14} /></span>
                        <input
                            className="search-input"
                            placeholder="Search..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ paddingRight: search ? 28 : undefined, width: '100%' }}
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                style={{
                                    position: 'absolute', right: 8, top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none', border: 'none',
                                    color: 'var(--text-muted)', cursor: 'pointer',
                                    fontSize: 14, lineHeight: 1, padding: '2px 4px',
                                    borderRadius: 4, transition: 'color 0.15s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                                title="Clear search"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                <table className="data-table ff-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Vehicle</th>
                            <th>Trip</th>
                            <th>Litres</th>
                            <th>Cost</th>
                            <th>Rate</th>
                            <th>Odometer</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={8}>
                                    <div className="empty-state">
                                        <div className="empty-state-icon"><Fuel size={40} opacity={0.2} /></div>
                                        <div className="empty-state-text">
                                            {search
                                                ? 'No entries match your search'
                                                : 'No fuel records yet'}
                                        </div>
                                        {!search && (
                                            <button
                                                className="btn btn-primary btn-sm"
                                                style={{ marginTop: 12 }}
                                                onClick={openModal}
                                            >
                                                <Plus size={14} /> Add First Entry
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ) : filtered.map(f => {
                            const liters = f.liters || 0;
                            const cost = f.cost || 0;
                            const costPerL = liters > 0 ? cost / liters : null;

                            return (
                                <tr key={sid(f)}>
                                    <td>
                                        <div style={{ fontSize: 13, fontWeight: 500 }}>
                                            {f.date
                                                ? new Date(f.date).toLocaleDateString(undefined, {
                                                    day: 'numeric', month: 'short', year: '2-digit',
                                                })
                                                : '—'}
                                        </div>
                                    </td>

                                    <td>
                                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                                            {vehicleName(f)}
                                        </div>
                                    </td>

                                    <td>
                                        {tripRef(f) !== '—' ? (
                                            <code style={{
                                                fontFamily: 'var(--font-mono)', fontSize: 11,
                                                background: 'var(--accent-glow)',
                                                color: 'var(--accent)',
                                                padding: '2px 6px', borderRadius: 4,
                                            }}>
                                                {tripRef(f)}
                                            </code>
                                        ) : (
                                            <span className="text-muted">—</span>
                                        )}
                                    </td>

                                    <td>
                                        <span style={{ fontWeight: 600 }}>{liters.toFixed(1)}</span>
                                        <span style={{
                                            fontSize: 11, color: 'var(--text-muted)', marginLeft: 3,
                                        }}>
                                            L
                                        </span>
                                    </td>

                                    <td>
                                        <span style={{
                                            fontWeight: 700, color: 'var(--text-primary)',
                                        }}>
                                            ₹{cost.toLocaleString()}
                                        </span>
                                    </td>

                                    <td>
                                        <EffBadge costPerL={costPerL} />
                                    </td>

                                    <td>
                                        {f.odometer ? (
                                            <span style={{
                                                fontSize: 12, color: 'var(--text-secondary)',
                                            }}>
                                                {Number(f.odometer).toLocaleString()}
                                                <span style={{
                                                    color: 'var(--text-muted)', marginLeft: 2,
                                                }}>
                                                    km
                                                </span>
                                            </span>
                                        ) : (
                                            <span className="text-muted">—</span>
                                        )}
                                    </td>

                                    <td>
                                        <button
                                            className="btn btn-danger btn-sm"
                                            title="Delete entry"
                                            onClick={() => setDeleteId(sid(f))}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>

                    {/* Totals footer */}
                    {filtered.length > 0 && (
                        <tfoot>
                            <tr style={{
                                background: 'rgba(255,255,255,0.03)',
                                borderTop: '2px solid var(--glass-border)',
                            }}>
                                <td colSpan={3} style={{
                                    padding: '10px 16px', fontSize: 12,
                                    fontWeight: 700, color: 'var(--text-muted)',
                                    textTransform: 'uppercase', letterSpacing: '0.5px',
                                }}>
                                    Totals ({filtered.length} entries)
                                </td>
                                <td style={{ padding: '10px 16px', fontWeight: 700 }}>
                                    {filteredTotalLiters.toFixed(1)} L
                                </td>
                                <td style={{
                                    padding: '10px 16px', fontWeight: 700,
                                    color: 'var(--orange-t)',
                                }}>
                                    ₹{filteredTotalCost.toLocaleString()}
                                </td>
                                <td colSpan={3} />
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {/* ── Delete Confirm Modal ─────────────────────── */}
            {deleteId && (
                <Modal
                    title={<span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Trash2 size={18} /> Delete Fuel Entry?</span>}
                    onClose={() => setDeleteId(null)}
                    footer={
                        <>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setDeleteId(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={() => handleDelete(deleteId)}
                            >
                                Delete
                            </button>
                        </>
                    }
                >
                    <div style={{
                        textAlign: 'center', padding: '16px 0',
                        color: 'var(--text-secondary)', fontSize: 14,
                    }}>
                        <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}><Trash2 size={48} /></div>
                        This fuel entry will be permanently removed.
                        <br />
                        <span style={{ color: 'var(--red-t)', fontWeight: 600 }}>
                            This cannot be undone.
                        </span>
                    </div>
                </Modal>
            )}

            {/* ── Add Entry Modal ──────────────────────────── */}
            {modal && (
                <Modal
                    title={<span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Fuel size={18} /> Add Fuel Entry</span>}
                    onClose={closeModal}
                    footer={
                        <>
                            <button
                                className="btn btn-secondary"
                                onClick={closeModal}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving ? 'Saving…' : 'Save Entry'}
                            </button>
                        </>
                    }
                >
                    {/* Live cost-per-litre preview banner */}
                    {previewCostPerL && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 14px', marginBottom: 16,
                            background: Number(previewCostPerL) < COST_THRESHOLD
                                ? 'rgba(34,197,94,0.1)'
                                : 'rgba(239,68,68,0.1)',
                            border: `1px solid ${Number(previewCostPerL) < COST_THRESHOLD
                                ? 'rgba(34,197,94,0.2)'
                                : 'rgba(239,68,68,0.2)'}`,
                            borderRadius: 8,
                            animation: 'fadeIn 0.2s ease',
                        }}>
                            <span style={{ fontSize: 18 }}>
                                {Number(previewCostPerL) < COST_THRESHOLD ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                            </span>
                            <div>
                                <div style={{
                                    fontSize: 13, fontWeight: 700,
                                    color: Number(previewCostPerL) < COST_THRESHOLD
                                        ? 'var(--green-t)' : 'var(--red-t)',
                                }}>
                                    ₹{previewCostPerL}/L cost rate
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                    {Number(previewCostPerL) < COST_THRESHOLD
                                        ? 'Efficient fill-up'
                                        : 'Above average rate'}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="form-grid">

                        {/* Vehicle */}
                        <div className="form-group">
                            <label className="form-label">Vehicle *</label>
                            <select
                                className="form-control"
                                value={form.vehicleId}
                                onChange={e => setForm(f => ({
                                    ...f, vehicleId: e.target.value, tripId: '',
                                }))}
                            >
                                <option value="">Select vehicle…</option>
                                {vehicles.map(v => (
                                    <option key={sid(v)} value={sid(v)}>{v.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Related Trip — filtered by vehicle */}
                        <div className="form-group">
                            <label className="form-label">
                                Related Trip
                                <span style={{
                                    fontSize: 10, color: 'var(--text-muted)',
                                    marginLeft: 5, fontWeight: 400,
                                }}>
                                    optional
                                </span>
                            </label>
                            <select
                                className="form-control"
                                value={form.tripId}
                                onChange={e => setForm(f => ({ ...f, tripId: e.target.value }))}
                            >
                                <option value="">No trip</option>
                                {tripsForVehicle.map(t => (
                                    <option key={sid(t)} value={sid(t)}>
                                        {t.reference} — {t.origin} → {t.destination}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Date */}
                        <div className="form-group">
                            <label className="form-label">Date *</label>
                            <input
                                className="form-control"
                                type="date"
                                value={form.date}
                                max={new Date().toISOString().slice(0, 10)}
                                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                            />
                        </div>

                        {/* Odometer */}
                        <div className="form-group">
                            <label className="form-label">
                                Odometer (km)
                                <span style={{
                                    fontSize: 10, color: 'var(--text-muted)',
                                    marginLeft: 5, fontWeight: 400,
                                }}>
                                    optional
                                </span>
                            </label>
                            <input
                                className="form-control"
                                type="number" min="0"
                                placeholder="e.g. 45000"
                                value={form.odometer}
                                onChange={e => setForm(f => ({ ...f, odometer: e.target.value }))}
                            />
                        </div>

                        {/* Litres */}
                        <div className="form-group">
                            <label className="form-label">Litres Filled *</label>
                            <input
                                className="form-control"
                                type="number" step="0.01" min="0"
                                placeholder="0.00 L"
                                value={form.liters}
                                onChange={e => setForm(f => ({ ...f, liters: e.target.value }))}
                            />
                        </div>

                        {/* Cost */}
                        <div className="form-group">
                            <label className="form-label">Total Cost (₹) *</label>
                            <input
                                className="form-control"
                                type="number" step="0.01" min="0"
                                placeholder="0.00"
                                value={form.cost}
                                onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                            />
                        </div>

                    </div>
                </Modal>
            )}

        </div>
    );
}
