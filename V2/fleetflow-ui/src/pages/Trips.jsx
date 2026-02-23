import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useFleet } from '../context/FleetContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import SkeletonTable from '../components/SkeletonTable';
import Skeleton from '../components/Skeleton';
import useCountUp from '../hooks/useCountUp';
import { showToast } from '../hooks/useToast';
import {
    Layout, List, ClipboardList, FileText,
    Truck, CheckCircle2, Package, X,
    ArrowRight, Search, Zap, AlertTriangle,
    Play, Plus, Bike, Car, Boxes
} from 'lucide-react';

/* ════════════════════════════════════════════════════════════
   CONSTANTS
   ════════════════════════════════════════════════════════════ */
const EMPTY = {
    vehicleId: '', driverId: '', origin: '', destination: '',
    cargo_weight: '', date_start: '', odometer_start: '', region: '',
};

const COLUMNS = [
    { key: 'draft', label: 'Draft', color: '#94a3b8', Icon: FileText, bg: 'rgba(148,163,184,0.08)' },
    { key: 'dispatched', label: 'Dispatched', color: '#38bdf8', Icon: Truck, bg: 'rgba(56,189,248,0.06)' },
    { key: 'completed', label: 'Completed', color: '#22c55e', Icon: CheckCircle2, bg: 'rgba(34,197,94,0.06)' },
    { key: 'cancelled', label: 'Cancelled', color: '#ef4444', Icon: X, bg: 'rgba(239,68,68,0.06)' },
];

const ALLOWED = {
    draft: ['dispatched'],
    dispatched: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
};

const VIEW_TABS = [
    { key: 'kanban', label: 'Board', Icon: Layout },
    { key: 'list', label: 'List', Icon: List },
];

/* ── Inject ff-spin keyframe once at module load ────────────── */
(function injectSpinStyle() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('ff-trips-spin')) return;
    const s = document.createElement('style');
    s.id = 'ff-trips-spin';
    s.textContent = '@keyframes ff-spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(s);
})();

/* ════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════ */
const sid = (val) => String(val?._id ?? val ?? '');

const getVehicleIcon = (type) => {
    switch (type) {
        case 'truck': return Truck;
        case 'van': return Boxes;
        case 'bike': return Bike;
        default: return Car;
    }
};

function driverAvatar(name) {
    if (!name) return { initials: '?', bg: '#64748b' };
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const code = [...name].reduce((n, c) => n + c.charCodeAt(0), 0);
    const hues = [210, 142, 280, 0, 35, 180];
    return { initials, bg: `hsl(${hues[code % hues.length]}, 55%, 45%)` };
}

function relTime(date) {
    if (!date) return null;
    const diff = (Date.now() - new Date(date)) / 1000;
    if (diff < 0) return `in ${Math.ceil(-diff / 86400)}d`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

/* ════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ════════════════════════════════════════════════════════════ */

/* ── CargoBar ───────────────────────────────────────────────── */
const CargoBar = memo(function CargoBar({ weight, maxCapacity }) {
    if (!maxCapacity || !weight) return null;
    const pct = Math.min(100, Math.round((weight / maxCapacity) * 100));
    const color = pct > 85 ? '#ef4444' : pct > 70 ? '#f97316' : '#22c55e';
    return (
        <div aria-label={`Cargo weight: ${weight} of ${maxCapacity} kg (${pct}%)`} style={{ marginTop: 8 }}>
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 10, color: 'var(--text-muted)', marginBottom: 3,
            }}>
                <span><Package size={10} aria-hidden="true" style={{ marginRight: 4, verticalAlign: 'middle' }} /> {weight} kg</span>
                <span style={{ color, fontWeight: 600 }}>{pct}%</span>
            </div>
            <div style={{
                height: 4, background: 'rgba(255,255,255,0.06)',
                borderRadius: 999, overflow: 'hidden',
            }}>
                <div style={{
                    width: `${pct}%`, height: '100%', background: color,
                    borderRadius: 999, transition: 'width 0.4s ease',
                    boxShadow: `0 0 6px ${color}80`,
                }} />
            </div>
        </div>
    );
});

const TripVehicleDisplay = memo(function TripVehicleDisplay({ vehicle }) {
    const VehicleIcon = getVehicleIcon(vehicle?.type);
    return (
        <>
            <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <VehicleIcon size={14} /> {vehicle?.name ?? '—'}
            </div>
            {vehicle?.license_plate && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {vehicle.license_plate}
                </div>
            )}
        </>
    );
});

/* ── TripCard (Memoized) ────────────────────────────────────── */
const TripCard = memo(function TripCard({ trip, vehicleMap, loadingId, colColor }) {
    const vehicle = vehicleMap[sid(trip.vehicle)];
    const driverName = trip.driver?.name ?? '—';
    const avatar = driverAvatar(driverName);
    const dateStart = trip.dateStart ?? trip.date_start;
    const isOverdue = trip.state === 'dispatched' && dateStart && new Date(dateStart) < new Date();
    const isLoading = loadingId === sid(trip);

    return (
        <div
            className="kanban-card ff-card"
            style={{
                position: 'relative',
                background: 'var(--bg-card)',
                border: '1px solid var(--glass-border)',
                borderTop: `2px solid ${colColor}`,
                borderRadius: 10, padding: 12, marginBottom: 8,
                opacity: isLoading ? 0.6 : 1,
                transition: 'opacity 0.2s, box-shadow 0.2s',
                boxShadow: isOverdue
                    ? '0 0 0 1px rgba(239,68,68,0.3), 0 2px 12px rgba(239,68,68,0.1)'
                    : '0 2px 8px rgba(0,0,0,0.1)',
            }}
        >
            {/* Loading overlay */}
            {isLoading && (
                <div style={{
                    position: 'absolute', inset: 0, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.4)', borderRadius: 9, zIndex: 5,
                }}>
                    <span style={{
                        width: 20, height: 20, border: '2px solid rgba(255,255,255,0.2)',
                        borderTopColor: '#fff', borderRadius: '50%',
                        display: 'inline-block',
                        animation: 'ff-spin 0.7s linear infinite',
                    }} />
                </div>
            )}

            {/* Top row */}
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 8,
            }}>
                <code style={{
                    fontSize: 12, fontWeight: 700, color: 'var(--accent)',
                    background: 'var(--accent-glow)', padding: '2px 7px',
                    borderRadius: 5, fontFamily: 'var(--font-mono)',
                }}>
                    {trip.reference}
                </code>
                {isOverdue ? (
                    <span style={{
                        fontSize: 9, fontWeight: 800, letterSpacing: '0.05em',
                        background: 'rgba(239,68,68,0.18)', color: '#ef4444',
                        border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4,
                        padding: '2px 7px', textTransform: 'uppercase',
                        animation: 'pulse-dot 1.8s ease-in-out infinite',
                    }}>
                        OVERDUE
                    </span>
                ) : (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {relTime(dateStart)}
                    </span>
                )}
            </div>

            {/* Vehicle */}
            {vehicle && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6,
                }}>
                    <Truck size={14} />
                    <span style={{ fontWeight: 600 }}>{vehicle.name}</span>
                    {vehicle.license_plate && (
                        <span style={{
                            fontSize: 10, color: 'var(--text-muted)',
                            background: 'rgba(255,255,255,0.05)',
                            padding: '1px 5px', borderRadius: 4,
                        }}>
                            {vehicle.license_plate}
                        </span>
                    )}
                </div>
            )}

            {/* Driver */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <div style={{
                    width: 22, height: 22, borderRadius: '50%', background: avatar.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0,
                    boxShadow: `0 0 6px ${avatar.bg}80`,
                }}>
                    {avatar.initials}
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{driverName}</span>
            </div>

            {/* Cargo bar */}
            <CargoBar
                weight={trip.cargoWeight ?? trip.cargo_weight ?? 0}
                maxCapacity={vehicle?.maxCapacity ?? vehicle?.max_capacity}
            />

            {/* Route */}
            <div style={{
                marginTop: 8, fontSize: 11, color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', gap: 4,
                overflow: 'hidden', whiteSpace: 'nowrap',
            }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {trip.origin ?? '?'}
                </span>
                <ArrowRight size={10} style={{ color: colColor, flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {trip.destination ?? '?'}
                </span>
            </div>
        </div>
    );
});

/* ── TripActions ────────────────────────────────────────────── */
const TripActions = memo(function TripActions({ trip, dispatchTrip, completeTrip, cancelTrip }) {
    const id = sid(trip);
    const [busy, setBusy] = useState(false);

    const run = useCallback(async (fn, successMsg, type = 'success') => {
        setBusy(true);
        try {
            await fn(id);
            showToast({ message: successMsg, type });
        } catch (e) {
            showToast({
                message: e?.response?.message ?? e?.message ?? 'Action failed.',
                type: 'error',
            });
        } finally {
            setBusy(false);
        }
    }, [id]);

    if (busy) return (
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Processing…</span>
    );

    return (
        <div className="actions">
            {trip.state === 'draft' && (
                <button
                    className="btn btn-primary btn-sm"
                    onClick={() => run(dispatchTrip, 'Trip dispatched!')}
                    aria-label="Dispatch trip"
                >
                    <Play size={12} fill="currentColor" aria-hidden="true" /> Dispatch
                </button>
            )}
            {trip.state === 'dispatched' && (<>
                <button
                    className="btn btn-success btn-sm"
                    onClick={() => run(tid => completeTrip(tid, 0), 'Trip completed!')}
                    aria-label="Mark trip as completed"
                >
                    <CheckCircle2 size={12} aria-hidden="true" /> Complete
                </button>
                <button
                    className="btn btn-danger btn-sm"
                    onClick={() => run(cancelTrip, 'Trip cancelled.', 'warning')}
                    aria-label="Cancel trip"
                >
                    <X size={12} aria-hidden="true" /> Cancel
                </button>
            </>)}
        </div>
    );
});

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════ */
export default function Trips() {
    const {
        trips, vehicles, drivers, loading,
        addTrip, dispatchTrip, completeTrip, cancelTrip, isLicenseExpired,
    } = useFleet();
    const location = useLocation();

    const [view, setView] = useState(() => localStorage.getItem('ff-trips-view') ?? 'kanban');
    const [modal, setModal] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [filterState, setFilterState] = useState('all');
    const [loadingCard, setLoadingCard] = useState(null);
    const [saving, setSaving] = useState(false);

    /* FIX: useRef guard prevents modal re-opening on back-navigation */
    const didHandleNavState = useRef(false);
    useEffect(() => {
        if (location.state?.openCreate && !didHandleNavState.current) {
            didHandleNavState.current = true;
            setModal(true);
        }
    }, [location.state?.openCreate]);

    const persistView = useCallback((v) => {
        setView(v);
        localStorage.setItem('ff-trips-view', v);
    }, []);

    /* ── O(1) vehicle lookup map ────────────────────────────── */
    const vehicleMap = useMemo(
        () => Object.fromEntries(vehicles.map(v => [sid(v), v])),
        [vehicles]
    );

    /* ── Aggregates ─────────────────────────────────────────── */
    const draftCount = useMemo(
        () => trips.filter(t => t.state === 'draft').length,
        [trips]
    );
    const dispatchCount = useMemo(
        () => trips.filter(t => t.state === 'dispatched').length,
        [trips]
    );
    const completedCount = useMemo(
        () => trips.filter(t => t.state === 'completed').length,
        [trips]
    );
    const overdueCount = useMemo(
        () => trips.filter(t => {
            const d = t.dateStart ?? t.date_start;
            return t.state === 'dispatched' && d && new Date(d) < new Date();
        }).length,
        [trips]
    );

    const animDraft = useCountUp(draftCount);
    const animDispatch = useCountUp(dispatchCount);
    const animDone = useCountUp(completedCount);
    const animTotal = useCountUp(trips.length);

    /* ── Smart dispatch ─────────────────────────────────────── */
    const cw = useMemo(() => Number(form.cargo_weight), [form.cargo_weight]);

    const smartVehicles = useMemo(() => {
        if (!(cw > 0) || !form.region) return [];
        return vehicles
            .filter(v =>
                v.status === 'available' &&
                (v.max_capacity ?? v.maxCapacity ?? 0) >= cw &&
                (v.region ?? '').toLowerCase() === form.region.toLowerCase()
            )
            .sort((a, b) => {
                const capA = a.max_capacity ?? a.maxCapacity;
                const capB = b.max_capacity ?? b.maxCapacity;
                return (capA - cw) / capA - (capB - cw) / capB;
            });
    }, [cw, form.region, vehicles]);

    const bestVehicle = smartVehicles[0] ?? null;

    const selectedVehicle = useMemo(
        () => (form.vehicleId ? vehicleMap[form.vehicleId] ?? null : null),
        [form.vehicleId, vehicleMap]
    );

    const vehicleCapacity = selectedVehicle?.max_capacity ?? selectedVehicle?.maxCapacity ?? 0;
    const cargoPct = vehicleCapacity > 0 && cw > 0
        ? Math.min(100, Math.round((cw / vehicleCapacity) * 100))
        : null;
    const cargoOverCapacity = vehicleCapacity > 0 && cw > vehicleCapacity;
    const cargoColor = (cargoPct ?? 0) > 85 ? '#ef4444' : (cargoPct ?? 0) > 70 ? '#f97316' : '#22c55e';

    /* ── Available pools ────────────────────────────────────── */
    const availableVehicles = useMemo(
        () => vehicles.filter(v => v.status === 'available'),
        [vehicles]
    );
    const availableDrivers = useMemo(
        () => drivers.filter(d => d.status !== 'suspended' && !isLicenseExpired(d)),
        [drivers, isLicenseExpired]
    );

    /* ── Filtered list view trips ───────────────────────────── */
    const filtered = useMemo(() =>
        trips.filter(t => {
            const q = search.toLowerCase();
            const ms = !q ||
                (t.reference ?? '').toLowerCase().includes(q) ||
                (t.origin ?? '').toLowerCase().includes(q) ||
                (t.destination ?? '').toLowerCase().includes(q) ||
                (t.vehicle?.name ?? '').toLowerCase().includes(q) ||
                (t.driver?.name ?? '').toLowerCase().includes(q);
            const mf = filterState === 'all' || t.state === filterState;
            return ms && mf;
        }),
        [trips, search, filterState]
    );

    /* ── Modal handlers ─────────────────────────────────────── */
    const openModal = useCallback(() => {
        setForm(EMPTY);
        setError('');
        setModal(true);
    }, []);

    const closeModal = useCallback(() => {
        setModal(false);
        setError('');
        setForm(EMPTY);
        setSaving(false);
    }, []);

    /* ── Create trip ────────────────────────────────────────── */
    const handleCreate = useCallback(async () => {
        setError('');
        if (!form.vehicleId) { setError('Select a vehicle.'); return; }
        if (!form.driverId) { setError('Select a driver.'); return; }
        if (!form.origin) { setError('Enter an origin.'); return; }
        if (!form.destination) { setError('Enter a destination.'); return; }
        if (!form.cargo_weight) { setError('Enter cargo weight.'); return; }
        if (cargoOverCapacity) {
            setError(`Cargo (${cw} kg) exceeds vehicle capacity (${vehicleCapacity} kg).`);
            return;
        }
        setSaving(true);
        try {
            await addTrip({
                vehicle: form.vehicleId,
                driver: form.driverId,
                origin: form.origin,
                destination: form.destination,
                cargo_weight: cw,
                date_start: form.date_start || undefined,
                odometer_start: Number(form.odometer_start) || 0,
            });
            closeModal();
            showToast({ message: 'Trip created!', type: 'success' });
        } catch (e) {
            const msg = e?.response?.message ?? e?.message ?? 'Failed to create trip.';
            setError(msg);
            showToast({ message: msg, type: 'error' });
        } finally {
            setSaving(false);
        }
    }, [form, cw, cargoOverCapacity, vehicleCapacity, addTrip, closeModal]);

    /* ── Drag and drop ──────────────────────────────────────── */
    const onDragEnd = useCallback(async ({ source, destination, draggableId }) => {
        if (!destination) return;
        const from = source.droppableId;
        const to = destination.droppableId;
        if (from === to) return;

        if (!(ALLOWED[from] ?? []).includes(to)) {
            showToast({ message: `Cannot move ${from} → ${to}`, type: 'warning' });
            return;
        }

        const trip = trips.find(t => sid(t) === draggableId);
        if (!trip) return;
        const id = sid(trip);

        setLoadingCard(id);
        try {
            if (to === 'dispatched') await dispatchTrip(id);
            else if (to === 'completed') await completeTrip(id, 0);
            else if (to === 'cancelled') await cancelTrip(id);
            const col = COLUMNS.find(c => c.key === to);
            showToast({ message: `Trip moved to ${col?.label}`, type: 'success' });
        } catch (e) {
            showToast({
                message: e?.response?.message ?? e?.message ?? 'Action failed.',
                type: 'error',
            });
        } finally {
            setLoadingCard(null);
        }
    }, [trips, dispatchTrip, completeTrip, cancelTrip]);

    if (loading) return (
        <div className="fade-in">
            <div className="kpi-grid" style={{ marginBottom: 20 }}>
                {Array.from({ length: 4 }).map((_, i) => <Skeleton.Stat key={i} />)}
            </div>
            {view === 'kanban' ? (
                <div className="kanban-board">
                    {COLUMNS.map(col => (
                        <div key={col.key} className="kanban-col" style={{ background: col.bg, border: '1px solid var(--glass-border)', borderRadius: 14 }}>
                            <div style={{ padding: '12px 14px' }}>
                                <Skeleton width="80px" height="12px" style={{ opacity: 0.5 }} />
                            </div>
                            <div style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {Array.from({ length: 3 }).map((_, i) => <Skeleton.TripCard key={i} />)}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <SkeletonTable rows={6} cols={5} />
            )}
        </div>
    );

    /* ════════════════════════════════════════════════════════
       RENDER
       ════════════════════════════════════════════════════════ */
    return (
        <div className="fade-in">

            {/* ── Page Actions ────────────────────────────────── */}
            <div className="page-header">
                <div className="page-actions">
                    {/* View toggle */}
                    <div className="ff-view-toggle">
                        {VIEW_TABS.map(({ key, label, Icon: TabIcon }) => (
                            <button
                                key={key}
                                className={`ff-view-btn ${view === key ? 'active' : ''}`}
                                onClick={() => persistView(key)}
                                aria-label={`Switch to ${label} view`}
                                aria-pressed={view === key}
                            >
                                <TabIcon size={14} aria-hidden="true" />
                                <span className="desktop-only">{label}</span>
                            </button>
                        ))}
                    </div>
                    <button className="btn btn-primary" onClick={openModal}>
                        <Plus size={14} /> <span className="desktop-only">New Trip</span><span className="mobile-only">New</span>
                    </button>
                </div>
            </div>

            {/* ── KPI Strip ───────────────────────────────── */}
            <div className="kpi-grid" style={{ marginBottom: 20 }}>
                <div className="kpi-card blue ff-card fade-in-scale"
                    style={{ animationDelay: '0ms' }}>
                    <div className="kpi-icon"><ClipboardList size={20} strokeWidth={2} /></div>
                    <div className="kpi-label">Total Trips</div>
                    <div className="kpi-value">{animTotal}</div>
                    <div className="kpi-sub">all records</div>
                </div>
                <div className="kpi-card orange ff-card fade-in-scale"
                    style={{ animationDelay: '60ms' }}>
                    <div className="kpi-icon"><FileText size={20} strokeWidth={2} /></div>
                    <div className="kpi-label">Draft</div>
                    <div className="kpi-value">{animDraft}</div>
                    <div className="kpi-sub">awaiting dispatch</div>
                </div>
                <div className="kpi-card blue ff-card fade-in-scale"
                    style={{ animationDelay: '120ms' }}>
                    <div className="kpi-icon"><Truck size={20} strokeWidth={2} /></div>
                    <div className="kpi-label">Dispatched</div>
                    <div className="kpi-value">{animDispatch}</div>
                    <div className="kpi-sub">currently on route</div>
                </div>
                <div className="kpi-card green ff-card fade-in-scale"
                    style={{ animationDelay: '180ms' }}>
                    <div className="kpi-icon"><CheckCircle2 size={20} strokeWidth={2} /></div>
                    <div className="kpi-label">Completed</div>
                    <div className="kpi-value">{animDone}</div>
                    <div className="kpi-sub">
                        {trips.length > 0
                            ? `${Math.round((completedCount / trips.length) * 100)}% rate`
                            : 'no trips yet'}
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════
                KANBAN VIEW
                ══════════════════════════════════════════════ */}
            {view === 'kanban' && (
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="kanban-board">
                        {COLUMNS.map(col => {
                            const cards = trips.filter(t => t.state === col.key);
                            return (
                                <Droppable droppableId={col.key} key={col.key}>
                                    {(provided, snapshot) => (
                                        <div
                                            className="kanban-col"
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            style={{
                                                background: snapshot.isDraggingOver
                                                    ? `${col.color}12` : col.bg,
                                                border: `1px solid ${snapshot.isDraggingOver
                                                    ? col.color + '40' : 'var(--glass-border)'}`,
                                                borderRadius: 14,
                                                transition: 'background 0.2s ease, border-color 0.2s ease',
                                            }}
                                        >
                                            {/* Column header */}
                                            <div style={{
                                                display: 'flex', alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '12px 14px 8px',
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                                    <col.Icon size={15} color={col.color} />
                                                    <span style={{ fontWeight: 700, fontSize: 13, color: col.color }}>
                                                        {col.label}
                                                    </span>
                                                </div>
                                                <div style={{
                                                    minWidth: 22, height: 22, borderRadius: 999,
                                                    display: 'flex', alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: `${col.color}20`, color: col.color,
                                                    fontSize: 11, fontWeight: 700, padding: '0 6px',
                                                }}>
                                                    {cards.length}
                                                </div>
                                            </div>

                                            {/* Cards */}
                                            <div style={{ padding: '0 10px 10px' }}>
                                                {cards.length === 0 ? (
                                                    <div style={{
                                                        fontSize: 12, color: 'var(--text-muted)',
                                                        textAlign: 'center', padding: '28px 0',
                                                        border: `2px dashed ${col.color}25`,
                                                        borderRadius: 10, margin: '4px 0',
                                                    }}>
                                                        {snapshot.isDraggingOver
                                                            ? `Drop to mark ${col.label.toLowerCase()}`
                                                            : 'No trips here'}
                                                    </div>
                                                ) : cards.map((t, index) => (
                                                    <Draggable
                                                        key={sid(t)}
                                                        draggableId={sid(t)}
                                                        index={index}
                                                        isDragDisabled={
                                                            col.key === 'completed' ||
                                                            col.key === 'cancelled'
                                                        }
                                                    >
                                                        {(prov, snap) => (
                                                            <div
                                                                ref={prov.innerRef}
                                                                {...prov.draggableProps}
                                                                {...prov.dragHandleProps}
                                                                style={{
                                                                    ...prov.draggableProps.style,
                                                                    transform: snap.isDragging
                                                                        ? prov.draggableProps.style?.transform
                                                                        : undefined,
                                                                    boxShadow: snap.isDragging
                                                                        ? `0 8px 32px rgba(0,0,0,0.35), 0 0 0 2px ${col.color}60`
                                                                        : undefined,
                                                                    borderRadius: snap.isDragging ? 12 : undefined,
                                                                    opacity: snap.isDragging ? 0.95 : 1,
                                                                    rotate: snap.isDragging ? '1.5deg' : '0deg',
                                                                    cursor: col.key === 'completed' || col.key === 'cancelled'
                                                                        ? 'default' : 'grab',
                                                                    transition: snap.isDragging ? 'none' : 'rotate 0.2s ease',
                                                                }}
                                                            >
                                                                <TripCard
                                                                    trip={t}
                                                                    vehicleMap={vehicleMap}
                                                                    loadingId={loadingCard}
                                                                    colColor={col.color}
                                                                />
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </div>
                                        </div>
                                    )}
                                </Droppable>
                            );
                        })}
                    </div>
                </DragDropContext>
            )}

            {/* ══════════════════════════════════════════════
                LIST VIEW
                ══════════════════════════════════════════════ */}
            {view === 'list' && (
                <div className="table-wrapper">
                    <div className="table-toolbar">
                        <span className="table-toolbar-title">
                            All Trips
                            <span style={{
                                marginLeft: 6, fontSize: 12,
                                fontWeight: 400, color: 'var(--text-muted)',
                            }}>
                                ({filtered.length})
                            </span>
                        </span>
                        <div className="page-actions" style={{ marginLeft: 'auto', width: 'auto' }}>
                            {/* State filter */}
                            <select
                                className="form-control"
                                style={{ flex: 1, height: 32, fontSize: 12, minWidth: 100 }}
                                value={filterState}
                                onChange={e => setFilterState(e.target.value)}
                            >
                                <option value="all">States</option>
                                {COLUMNS.map(c => (
                                    <option key={c.key} value={c.key}>{c.label}</option>
                                ))}
                            </select>

                            {/* Search */}
                            <div className="search-wrap" style={{ position: 'relative', flex: '1 1 120px' }}>
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
                    </div>

                    <table className="data-table ff-table">
                        <thead>
                            <tr>
                                <th>Reference</th>
                                <th>Vehicle</th>
                                <th>Driver</th>
                                <th>Route</th>
                                <th>Cargo</th>
                                <th>Started</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8}>
                                        <div className="empty-state">
                                            <div className="empty-state-icon"><Truck size={40} opacity={0.2} /></div>
                                            <div className="empty-state-text">
                                                {search || filterState !== 'all'
                                                    ? 'No trips match your filters'
                                                    : 'No trips created yet'}
                                            </div>
                                            {!search && filterState === 'all' && (
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    style={{ marginTop: 12 }}
                                                    onClick={openModal}
                                                >
                                                    <Plus size={14} /> Create First Trip
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.map(t => {
                                const dateStart = t.dateStart ?? t.date_start;
                                const isOverdue = t.state === 'dispatched' &&
                                    dateStart && new Date(dateStart) < new Date();
                                /* FIX: compute avatar once per row — was called twice in JSX */
                                const avatar = driverAvatar(t.driver?.name);
                                return (
                                    <tr
                                        key={sid(t)}
                                        style={isOverdue ? { background: 'rgba(239,68,68,0.04)' } : undefined}
                                    >
                                        <td>
                                            <code style={{
                                                fontFamily: 'var(--font-mono)', fontSize: 12,
                                                color: 'var(--accent)', background: 'var(--accent-glow)',
                                                padding: '2px 7px', borderRadius: 5,
                                            }}>
                                                {t.reference}
                                            </code>
                                        </td>

                                        <td>
                                            <TripVehicleDisplay vehicle={t.vehicle} />
                                        </td>

                                        <td>
                                            {t.driver?.name ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                                    <div style={{
                                                        width: 22, height: 22, borderRadius: '50%',
                                                        background: avatar.bg,
                                                        display: 'flex', alignItems: 'center',
                                                        justifyContent: 'center', fontSize: 9,
                                                        fontWeight: 700, color: '#fff', flexShrink: 0,
                                                        boxShadow: `0 0 6px ${avatar.bg}80`,
                                                    }}>
                                                        {avatar.initials}
                                                    </div>
                                                    <span style={{ fontSize: 13 }}>{t.driver.name}</span>
                                                </div>
                                            ) : <span className="text-muted">—</span>}
                                        </td>

                                        <td>
                                            <div style={{
                                                fontSize: 12, display: 'flex',
                                                alignItems: 'center', gap: 5,
                                            }}>
                                                <span style={{ color: 'var(--text-secondary)' }}>
                                                    {t.origin ?? '?'}
                                                </span>
                                                <ArrowRight size={10} style={{ color: 'var(--text-muted)' }} />
                                                <span style={{ color: 'var(--text-secondary)' }}>
                                                    {t.destination ?? '?'}
                                                </span>
                                            </div>
                                        </td>

                                        <td>
                                            {(t.cargoWeight ?? t.cargo_weight) != null ? (
                                                <span style={{ fontSize: 12 }}>
                                                    {(t.cargoWeight ?? t.cargo_weight).toLocaleString()}
                                                    <span style={{ color: 'var(--text-muted)', marginLeft: 2 }}>
                                                        kg
                                                    </span>
                                                </span>
                                            ) : <span className="text-muted">—</span>}
                                        </td>

                                        <td>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                                {relTime(dateStart) ?? '—'}
                                            </div>
                                            {isOverdue && (
                                                <div style={{
                                                    fontSize: 9, fontWeight: 700,
                                                    color: '#ef4444', textTransform: 'uppercase',
                                                    letterSpacing: '0.05em',
                                                }}>
                                                    OVERDUE
                                                </div>
                                            )}
                                        </td>

                                        <td><StatusBadge status={t.state} /></td>

                                        <td>
                                            <TripActions
                                                trip={t}
                                                dispatchTrip={dispatchTrip}
                                                completeTrip={completeTrip}
                                                cancelTrip={cancelTrip}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>

                        {filtered.length > 0 && (
                            <tfoot>
                                <tr style={{
                                    background: 'rgba(255,255,255,0.02)',
                                    borderTop: '2px solid var(--glass-border)',
                                }}>
                                    <td colSpan={4} style={{
                                        padding: '10px 16px', fontSize: 12, fontWeight: 700,
                                        color: 'var(--text-muted)',
                                        textTransform: 'uppercase', letterSpacing: '0.5px',
                                    }}>
                                        {filtered.length} trip{filtered.length !== 1 ? 's' : ''} shown
                                    </td>
                                    <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                                        {filtered.reduce((s, t) =>
                                            s + (t.cargoWeight ?? t.cargo_weight ?? 0), 0
                                        ).toLocaleString()} kg total
                                    </td>
                                    <td colSpan={3} />
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            )}

            {/* ══════════════════════════════════════════════
                CREATE TRIP MODAL
                ══════════════════════════════════════════════ */}
            {modal && (
                <Modal
                    title={<span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Truck size={18} /> New Trip</span>}
                    onClose={closeModal}
                    footer={
                        <>
                            <button className="btn btn-secondary" onClick={closeModal}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleCreate}
                                disabled={saving || cargoOverCapacity}
                            >
                                {saving ? 'Creating…' : 'Create Trip'}
                            </button>
                        </>
                    }
                >
                    {/* Error banner */}
                    {error && (
                        <div style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                            padding: '10px 14px', marginBottom: 16,
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.25)',
                            borderRadius: 9, fontSize: 13, color: 'var(--red-t)',
                            animation: 'fadeInScale 0.2s ease',
                        }}
                            role="alert"
                        >
                            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="form-grid">

                        {/* Vehicle */}
                        <div className="form-group">
                            <label className="form-label">
                                Vehicle *
                                <span style={{
                                    marginLeft: 8, fontSize: 10, fontWeight: 400,
                                    color: 'var(--text-muted)',
                                }}>
                                    {availableVehicles.length} available
                                </span>
                            </label>
                            <select
                                className="form-control"
                                value={form.vehicleId}
                                onChange={e => setForm(f => ({ ...f, vehicleId: e.target.value }))}
                            >
                                <option value="">Select vehicle…</option>
                                {availableVehicles.map(v => (
                                    <option key={sid(v)} value={sid(v)}>
                                        {v.name}
                                        {v.max_capacity ? ` (${v.max_capacity} kg)` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Driver */}
                        <div className="form-group">
                            <label className="form-label">
                                Driver *
                                <span style={{
                                    marginLeft: 8, fontSize: 10, fontWeight: 400,
                                    color: 'var(--text-muted)',
                                }}>
                                    {availableDrivers.length} available
                                </span>
                            </label>
                            <select
                                className="form-control"
                                value={form.driverId}
                                onChange={e => setForm(f => ({ ...f, driverId: e.target.value }))}
                            >
                                <option value="">Select driver…</option>
                                {availableDrivers.map(d => (
                                    <option key={sid(d)} value={sid(d)}>{d.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Origin */}
                        <div className="form-group">
                            <label className="form-label">Origin *</label>
                            <input
                                className="form-control"
                                placeholder="e.g. Mumbai"
                                value={form.origin}
                                autoFocus
                                onChange={e => setForm(f => ({ ...f, origin: e.target.value }))}
                            />
                        </div>

                        {/* Destination */}
                        <div className="form-group">
                            <label className="form-label">Destination *</label>
                            <input
                                className="form-control"
                                placeholder="e.g. Delhi"
                                value={form.destination}
                                onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
                            />
                        </div>

                        {/* Cargo weight */}
                        <div className="form-group">
                            <label className="form-label">
                                Cargo Weight (kg) *
                                {vehicleCapacity > 0 && (
                                    <span style={{
                                        marginLeft: 8, fontSize: 10, fontWeight: 400,
                                        color: 'var(--text-muted)',
                                    }}>
                                        max {vehicleCapacity.toLocaleString()} kg
                                    </span>
                                )}
                            </label>
                            <input
                                className="form-control"
                                type="number" min="0" step="1"
                                placeholder="e.g. 2500"
                                value={form.cargo_weight}
                                onChange={e => setForm(f => ({ ...f, cargo_weight: e.target.value }))}
                                style={cargoOverCapacity
                                    ? { borderColor: '#ef4444', color: '#ef4444' }
                                    : undefined}
                            />
                            {/* Live cargo bar inside modal */}
                            {cargoPct !== null && (
                                <div style={{ marginTop: 8 }}>
                                    <div style={{
                                        display: 'flex', justifyContent: 'space-between',
                                        fontSize: 11, marginBottom: 4,
                                    }}>
                                        <span style={{ color: 'var(--text-muted)' }}>
                                            Capacity used
                                        </span>
                                        <span style={{
                                            fontWeight: 700, color: cargoColor,
                                        }}>
                                            {cargoPct}%
                                            {cargoOverCapacity && ' — EXCEEDS LIMIT'}
                                        </span>
                                    </div>
                                    <div style={{
                                        height: 5, background: 'rgba(255,255,255,0.06)',
                                        borderRadius: 999, overflow: 'hidden',
                                    }}>
                                        <div style={{
                                            width: `${Math.min(cargoPct, 100)}%`,
                                            height: '100%', borderRadius: 999,
                                            background: cargoColor,
                                            boxShadow: `0 0 6px ${cargoColor}80`,
                                            transition: 'width 0.3s ease, background 0.3s ease',
                                        }} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Region (for smart suggest) */}
                        <div className="form-group">
                            <label className="form-label">
                                Region
                                <span style={{
                                    marginLeft: 6, fontSize: 10, fontWeight: 400,
                                    color: 'var(--text-muted)',
                                }}>
                                    for smart vehicle suggest
                                </span>
                            </label>
                            <input
                                className="form-control"
                                placeholder="e.g. North"
                                value={form.region}
                                onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                            />
                        </div>

                        {/* Date start */}
                        <div className="form-group">
                            <label className="form-label">Start Date</label>
                            <input
                                className="form-control"
                                type="date"
                                value={form.date_start}
                                onChange={e => setForm(f => ({ ...f, date_start: e.target.value }))}
                            />
                        </div>

                        {/* Odometer */}
                        <div className="form-group">
                            <label className="form-label">
                                Odometer Start (km)
                                <span style={{
                                    marginLeft: 6, fontSize: 10, fontWeight: 400,
                                    color: 'var(--text-muted)',
                                }}>
                                    optional
                                </span>
                            </label>
                            <input
                                className="form-control"
                                type="number" min="0" step="1"
                                placeholder="e.g. 45000"
                                value={form.odometer_start}
                                onChange={e => setForm(f => ({ ...f, odometer_start: e.target.value }))}
                            />
                        </div>

                    </div>

                    {/* Smart vehicle suggestion */}
                    {bestVehicle && !form.vehicleId && (
                        <div style={{
                            marginTop: 16, padding: '12px 14px',
                            background: 'rgba(56,189,248,0.07)',
                            border: '1px solid rgba(56,189,248,0.25)',
                            borderRadius: 10, fontSize: 12,
                        }}>
                            <div style={{
                                fontWeight: 700, color: '#38bdf8',
                                marginBottom: 6, display: 'flex',
                                alignItems: 'center', gap: 6,
                            }}>
                                <Zap size={14} /> Suggested vehicle for {cw} kg in {form.region}
                            </div>
                            <div style={{
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'space-between', gap: 10,
                            }}>
                                <span style={{ color: 'var(--text-secondary)' }}>
                                    <strong>{bestVehicle.name}</strong>
                                    {' '}— capacity {(bestVehicle.max_capacity ?? bestVehicle.maxCapacity ?? 0).toLocaleString()} kg
                                </span>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setForm(f => ({ ...f, vehicleId: sid(bestVehicle) }))}
                                >
                                    Use This
                                </button>
                            </div>
                        </div>
                    )}
                </Modal>
            )}

        </div>
    );
}
