import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useFleet } from '../context/FleetContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import SkeletonTable from '../components/SkeletonTable';
import useCountUp from '../hooks/useCountUp';
import { showToast } from '../hooks/useToast';

/* ─── Constants ───────────────────────────────────────────── */
const EMPTY = {
    vehicleId: '', driverId: '', origin: '', destination: '',
    cargo_weight: '', date_start: '', odometer_start: '', region: '',
};

const COLUMNS = [
    { key: 'draft',      label: 'Draft',      color: '#94a3b8', icon: '📝', bg: 'rgba(148,163,184,0.08)' },
    { key: 'dispatched', label: 'Dispatched',  color: '#38bdf8', icon: '🚛', bg: 'rgba(56,189,248,0.06)'  },
    { key: 'completed',  label: 'Completed',   color: '#22c55e', icon: '✅', bg: 'rgba(34,197,94,0.06)'   },
    { key: 'cancelled',  label: 'Cancelled',   color: '#ef4444', icon: '❌', bg: 'rgba(239,68,68,0.06)'   },
];

const ALLOWED = {
    draft:      ['dispatched'],
    dispatched: ['completed', 'cancelled'],
    completed:  [],
    cancelled:  [],
};

/* ─── Helpers ─────────────────────────────────────────────── */
const sid = val => String(val?._id ?? val ?? '');
const typeEmoji = t => ({ truck: '🚛', van: '🚐', bike: '🏍️' }[t] ?? '🚗');

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
    if (diff < 0)    return `in ${Math.ceil(-diff / 86400)}d`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

/* ─── Cargo Bar ───────────────────────────────────────────── */
function CargoBar({ weight, maxCapacity }) {
    if (!maxCapacity || !weight) return null;
    const pct   = Math.min(100, Math.round((weight / maxCapacity) * 100));
    const color = pct > 85 ? '#ef4444' : pct > 70 ? '#f97316' : '#22c55e';
    return (
        <div title={`${weight} / ${maxCapacity} kg`} style={{ marginTop: 8 }}>
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 10, color: 'var(--text-muted)', marginBottom: 3,
            }}>
                <span>📦 {weight} kg</span>
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
}

/* ─── Kanban Card ─────────────────────────────────────────── */
function TripCard({ trip, vehicles, loadingId, colColor }) {
    const vehicle = vehicles.find(v =>
        sid(v) === sid(trip.vehicle)
    );
    const driverName = trip.driver?.name || '—';
    const avatar     = driverAvatar(driverName);
    const dateStart  = trip.dateStart || trip.date_start;
    const isOverdue  = trip.state === 'dispatched' && dateStart && new Date(dateStart) < new Date();
    const isLoading  = loadingId === sid(trip);

    return (
        <div
            className="kanban-card ff-card"
            style={{
                position: 'relative',
                background: 'var(--bg-card)',
                border: `1px solid var(--glass-border)`,
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
                        display: 'inline-block', animation: 'spin 0.7s linear infinite',
                    }} />
                </div>
            )}

            {/* Top row: reference + overdue */}
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
                        background: 'rgba(239,68,68,0.18)',
                        color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: 4, padding: '2px 7px',
                        animation: 'pulse-dot 1.8s ease-in-out infinite',
                        textTransform: 'uppercase',
                    }}>
                        OVERDUE
                    </span>
                ) : (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {relTime(dateStart)}
                    </span>
                )}
            </div>

            {/* Vehicle row */}
            {vehicle && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6,
                }}>
                    <span style={{ fontSize: 14 }}>{typeEmoji(vehicle.type)}</span>
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
                    width: 22, height: 22, borderRadius: '50%',
                    background: avatar.bg, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
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
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{trip.origin || '?'}</span>
                <span style={{ color: colColor, flexShrink: 0 }}>→</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{trip.destination || '?'}</span>
            </div>
        </div>
    );
}

/* ─── List Action Buttons ─────────────────────────────────── */
function TripActions({ trip, dispatchTrip, completeTrip, cancelTrip }) {
    const id = sid(trip);
    const [busy, setBusy] = useState(false);

    const run = async (fn, successMsg, type = 'success') => {
        setBusy(true);
        try {
            await fn(id);
            showToast({ message: successMsg, type });
        } catch (e) {
            showToast({ message: e?.response?.message || e.message, type: 'error' });
        } finally {
            setBusy(false);
        }
    };

    if (busy) return (
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Processing…</span>
    );

    return (
        <div className="actions">
            {trip.state === 'draft' && (
                <button
                    className="btn btn-primary btn-sm"
                    onClick={() => run(dispatchTrip, 'Trip dispatched! 🚛')}
                >
                    ▶ Dispatch
                </button>
            )}
            {trip.state === 'dispatched' && (<>
                <button
                    className="btn btn-success btn-sm"
                    onClick={() => run(id => completeTrip(id, 0), 'Trip completed! ✅')}
                >
                    ✓ Complete
                </button>
                <button
                    className="btn btn-danger btn-sm"
                    onClick={() => run(cancelTrip, 'Trip cancelled.', 'warning')}
                >
                    ✕ Cancel
                </button>
            </>)}
        </div>
    );
}

/* ─── Main Component ──────────────────────────────────────── */
export default function Trips() {
    const {
        trips, vehicles, drivers, loading,
        addTrip, dispatchTrip, completeTrip, cancelTrip, isLicenseExpired,
    } = useFleet();
    const location = useLocation();

    const [view, setView]           = useState(() => localStorage.getItem('ff-trips-view') || 'kanban');
    const [modal, setModal]         = useState(false);
    const [form, setForm]           = useState(EMPTY);
    const [error, setError]         = useState('');
    const [search, setSearch]       = useState('');
    const [filterState, setFilterState] = useState('all');
    const [loadingCard, setLoadingCard] = useState(null);

    useEffect(() => {
        if (location.state?.openCreate) setModal(true);
    }, [location.state]);

    const persistView = v => { setView(v); localStorage.setItem('ff-trips-view', v); };

    /* ── Aggregates ───────────────────────────────────────── */
    const draftCount     = trips.filter(t => t.state === 'draft').length;
    const dispatchCount  = trips.filter(t => t.state === 'dispatched').length;
    const completedCount = trips.filter(t => t.state === 'completed').length;
    const cancelledCount = trips.filter(t => t.state === 'cancelled').length;
    const overdueCount   = trips.filter(t => {
        const d = t.dateStart || t.date_start;
        return t.state === 'dispatched' && d && new Date(d) < new Date();
    }).length;

    const animDraft    = useCountUp(draftCount);
    const animDispatch = useCountUp(dispatchCount);
    const animDone     = useCountUp(completedCount);
    const animTotal    = useCountUp(trips.length);

    /* ── Smart dispatch suggestion ────────────────────────── */
    const cw = Number(form.cargo_weight);
    const smartVehicles = cw > 0 && form.region
        ? vehicles
            .filter(v =>
                v.status === 'available' &&
                (v.max_capacity ?? v.maxCapacity ?? 0) >= cw &&
                (v.region || '').toLowerCase() === form.region.toLowerCase()
            )
            .sort((a, b) => {
                const sA = ((a.max_capacity ?? a.maxCapacity) - cw) / (a.max_capacity ?? a.maxCapacity);
                const sB = ((b.max_capacity ?? b.maxCapacity) - cw) / (b.max_capacity ?? b.maxCapacity);
                return sA - sB;
            })
        : [];
    const bestVehicle = smartVehicles[0] ?? null;

    /* ── Live cargo capacity preview ──────────────────────── */
    const selectedVehicle = form.vehicleId
        ? vehicles.find(v => sid(v) === form.vehicleId)
        : null;
    const vehicleCapacity = selectedVehicle?.max_capacity ?? selectedVehicle?.maxCapacity ?? 0;
    const cargoPct = vehicleCapacity > 0 && cw > 0
        ? Math.min(100, Math.round((cw / vehicleCapacity) * 100))
        : null;
    const cargoOverCapacity = cargoPct !== null && cargoPct > 100;

    /* ── Available for new trip ───────────────────────────── */
    const availableVehicles = vehicles.filter(v => v.status === 'available');
    const availableDrivers  = drivers.filter(d => d.status !== 'suspended' && !isLicenseExpired(d));

    /* ── Create trip ──────────────────────────────────────── */
    const handleCreate = async () => {
        setError('');
        if (!form.vehicleId)    { setError('Select a vehicle.');    return; }
        if (!form.driverId)     { setError('Select a driver.');     return; }
        if (!form.origin)       { setError('Enter an origin.');     return; }
        if (!form.destination)  { setError('Enter a destination.'); return; }
        if (!form.cargo_weight) { setError('Enter cargo weight.');  return; }

        if (cargoOverCapacity) {
            setError(`Cargo (${cw} kg) exceeds vehicle capacity (${vehicleCapacity} kg)`);
            return;
        }

        try {
            await addTrip({
                vehicle:        form.vehicleId,
                driver:         form.driverId,
                origin:         form.origin,
                destination:    form.destination,
                cargo_weight:   cw,
                date_start:     form.date_start || undefined,
                odometer_start: Number(form.odometer_start) || 0,
            });
            setModal(false); setForm(EMPTY); setError('');
            showToast({ message: 'Trip created! 🚛', type: 'success' });
        } catch (e) {
            const msg = e?.response?.message || e.message || 'Failed to create trip.';
            setError(msg);
            showToast({ message: msg, type: 'error' });
        }
    };

    /* ── Drag and drop ────────────────────────────────────── */
    const onDragEnd = async ({ source, destination, draggableId }) => {
        if (!destination) return;
        const from = source.droppableId;
        const to   = destination.droppableId;
        if (from === to) return;

        if (!(ALLOWED[from] ?? []).includes(to)) {
            showToast({ message: `⚠ Cannot move ${from} → ${to}`, type: 'warning' });
            return;
        }

        const trip = trips.find(t => sid(t) === draggableId);
        if (!trip) return;
        const id = sid(trip);

        setLoadingCard(id);
        try {
            if (to === 'dispatched')  await dispatchTrip(id);
            else if (to === 'completed') await completeTrip(id, 0);
            else if (to === 'cancelled') await cancelTrip(id);
            const col = COLUMNS.find(c => c.key === to);
            showToast({ message: `${col?.icon} Trip moved to ${col?.label}`, type: 'success' });
        } catch (e) {
            showToast({ message: e?.response?.message || e.message || 'Action failed.', type: 'error' });
        } finally {
            setLoadingCard(null);
        }
    };

    /* ── Filtered list ────────────────────────────────────── */
    const filtered = trips.filter(t => {
        const q  = search.toLowerCase();
        const ms = !q ||
            (t.reference   || '').toLowerCase().includes(q) ||
            (t.origin      || '').toLowerCase().includes(q) ||
            (t.destination || '').toLowerCase().includes(q) ||
            (t.vehicle?.name || '').toLowerCase().includes(q) ||
            (t.driver?.name  || '').toLowerCase().includes(q);
        const mf = filterState === 'all' || t.state === filterState;
        return ms && mf;
    });

    if (loading) return <SkeletonTable rows={6} cols={5} />;

    return (
        <div className="fade-in">
            {/* ── Page Header ───────────────────────────────── */}
            <div className="page-header">
                <div>
                    <div className="page-title">Trip Dispatcher</div>
                    <div className="page-sub" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {trips.length} total trips
                        {overdueCount > 0 && (
                            <span style={{
                                fontSize: 11, fontWeight: 700,
                                background: 'rgba(239,68,68,0.18)',
                                color: '#ef4444',
                                border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: 999, padding: '1px 8px',
                                animation: 'pulse-dot 1.8s ease-in-out infinite',
                            }}>
                                ⚠ {overdueCount} overdue
                            </span>
                        )}
                    </div>
                </div>
                <div className="page-actions">
                    {/* View toggle */}
                    <div style={{
                        display: 'flex', gap: 3,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 9, padding: 3,
                    }}>
                        {[['kanban', '⬛ Board'], ['list', '☰ List']].map(([v, label]) => (
                            <button
                                key={v}
                                className={`btn btn-sm ${view === v ? 'btn-primary' : 'btn-secondary'}`}
                                style={{
                                    border: 'none', borderRadius: 7, padding: '5px 12px',
                                    background: view === v ? 'var(--accent)' : 'transparent',
                                    boxShadow: view === v ? '0 2px 8px rgba(59,130,246,0.3)' : 'none',
                                    transition: 'all 0.2s ease',
                                }}
                                onClick={() => persistView(v)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => { setForm(EMPTY); setModal(true); }}
                    >
                        + New Trip
                    </button>
                </div>
            </div>

            {/* ── KPI Strip ─────────────────────────────────── */}
            <div className="kpi-grid" style={{ marginBottom: 20 }}>
                <div className="kpi-card blue ff-card" style={{ animation: 'fadeInScale 0.35s ease 0ms both' }}>
                    <div className="kpi-icon">📋</div>
                    <div className="kpi-label">Total Trips</div>
                    <div className="kpi-value">{animTotal}</div>
                    <div className="kpi-sub">all records</div>
                </div>
                <div className="kpi-card orange ff-card" style={{ animation: 'fadeInScale 0.35s ease 60ms both' }}>
                    <div className="kpi-icon">📝</div>
                    <div className="kpi-label">Draft</div>
                    <div className="kpi-value">{animDraft}</div>
                    <div className="kpi-sub">awaiting dispatch</div>
                </div>
                <div className="kpi-card blue ff-card" style={{ animation: 'fadeInScale 0.35s ease 120ms both' }}>
                    <div className="kpi-icon">🚛</div>
                    <div className="kpi-label">Dispatched</div>
                    <div className="kpi-value">{animDispatch}</div>
                    <div className="kpi-sub">currently on route</div>
                </div>
                <div className="kpi-card green ff-card" style={{ animation: 'fadeInScale 0.35s ease 180ms both' }}>
                    <div className="kpi-icon">✅</div>
                    <div className="kpi-label">Completed</div>
                    <div className="kpi-value">{animDone}</div>
                    <div className="kpi-sub">
                        {trips.length > 0
                            ? `${Math.round((completedCount / trips.length) * 100)}% rate`
                            : 'no trips yet'}
                    </div>
                </div>
            </div>

            {/* ── KANBAN VIEW ───────────────────────────────── */}
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
                                                    ? `${col.color}12`
                                                    : col.bg,
                                                border: `1px solid ${snapshot.isDraggingOver
                                                    ? col.color + '40'
                                                    : 'var(--glass-border)'}`,
                                                borderRadius: 14,
                                                transition: 'background 0.2s ease, border-color 0.2s ease',
                                            }}
                                        >
                                            {/* Column header */}
                                            <div className="kanban-col-header" style={{
                                                display: 'flex', alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '12px 14px 8px',
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                                    <span style={{ fontSize: 15 }}>{col.icon}</span>
                                                    <span style={{
                                                        fontWeight: 700, fontSize: 13,
                                                        color: col.color,
                                                    }}>
                                                        {col.label}
                                                    </span>
                                                </div>
                                                <div style={{
                                                    minWidth: 22, height: 22,
                                                    borderRadius: 999, display: 'flex',
                                                    alignItems: 'center', justifyContent: 'center',
                                                    background: `${col.color}20`,
                                                    color: col.color,
                                                    fontSize: 11, fontWeight: 700,
                                                    padding: '0 6px',
                                                }}>
                                                    {cards.length}
                                                </div>
                                            </div>

                                            {/* Cards */}
                                            <div className="kanban-cards" style={{ padding: '0 10px 10px' }}>
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
                                                                    transition: snap.isDragging ? 'none' : 'rotate 0.2s ease',
                                                                    cursor: col.key === 'completed' || col.key === 'cancelled'
                                                                        ? 'default' : 'grab',
                                                                }}
                                                            >
                                                                <TripCard
                                                                    trip={t}
                                                                    vehicles={vehicles}
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

            {/* ── LIST VIEW ─────────────────────────────────── */}
            {view === 'list' && (
                <div className="table-wrapper">
                    <div className="table-toolbar">
                        <span className="table-toolbar-title">
                            All Trips
                            <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>
                                ({filtered.length})
                            </span>
                        </span>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <select
                                className="form-control"
                                style={{ width: 140, height: 32, fontSize: 12 }}
                                value={filterState}
                                onChange={e => setFilterState(e.target.value)}
                            >
                                <option value="all">All States</option>
                                {COLUMNS.map(c => (
                                    <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
                                ))}
                            </select>
                            <div className="search-wrap">
                                <span className="search-icon">🔍</span>
                                <input
                                    className="search-input"
                                    placeholder="Search trips, driver, vehicle…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
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
                                            <div className="empty-state-icon">🚛</div>
                                            <div className="empty-state-text">
                                                {search || filterState !== 'all'
                                                    ? 'No trips match your filters'
                                                    : 'No trips created yet'}
                                            </div>
                                            {!search && filterState === 'all' && (
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    style={{ marginTop: 12 }}
                                                    onClick={() => setModal(true)}
                                                >
                                                    + Create First Trip
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.map(t => {
                                const dateStart = t.dateStart || t.date_start;
                                const isOverdue = t.state === 'dispatched' && dateStart && new Date(dateStart) < new Date();
                                return (
                                    <tr key={sid(t)} style={isOverdue ? { background: 'rgba(239,68,68,0.04)' } : undefined}>
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
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>
                                                {typeEmoji(t.vehicle?.type)} {t.vehicle?.name || '—'}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                {t.vehicle?.license_plate || ''}
                                            </div>
                                        </td>
                                        <td>
                                            {t.driver?.name ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                                    <div style={{
                                                        width: 22, height: 22, borderRadius: '50%',
                                                        background: driverAvatar(t.driver.name).bg,
                                                        display: 'flex', alignItems: 'center',
                                                        justifyContent: 'center', fontSize: 9,
                                                        fontWeight: 700, color: '#fff', flexShrink: 0,
                                                    }}>
                                                        {driverAvatar(t.driver.name).initials}
                                                    </div>
                                                    <span style={{ fontSize: 13 }}>{t.driver.name}</span>
                                                </div>
                                            ) : <span className="text-muted">—</span>}
                                        </td>
                                        <td>
                                            <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <span style={{ color: 'var(--text-secondary)' }}>{t.origin || '?'}</span>
                                                <span style={{ color: 'var(--text-muted)' }}>→</span>
                                                <span style={{ color: 'var(--text-secondary)' }}>{t.destination || '?'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            {(t.cargoWeight ?? t.cargo_weight) != null ? (
                                                <span style={{ fontSize: 12 }}>
                                                    {(t.cargoWeight ?? t.cargo_weight).toLocaleString()}
                                                    <span style={{ color: 'var(--text-muted)', marginLeft: 2 }}>kg</span>
                                                </span>
                                            ) : <span className="text-muted">—</span>}
                                        </td>
                                        <td>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                                {relTime(dateStart) || '—'}
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
                    </table>
                </div>
            )}

            {/* ── Create Modal ───────────────────────────────── */}
            {modal && (
                <Modal
                    title="🚛 Create New Trip"
                    onClose={() => { setModal(false); setError(''); setForm(EMPTY); }}
                    footer={<>
                        <button
                            className="btn btn-secondary"
                            onClick={() => { setModal(false); setError(''); setForm(EMPTY); }}
                        >
                            Cancel
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleCreate}
                            disabled={cargoOverCapacity}
                        >
                            Create Trip →
                        </button>
                    </>}
                >
                    {/* Error */}
                    {error && (
                        <div style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                            padding: '10px 14px', marginBottom: 16,
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.25)',
                            borderRadius: 9, fontSize: 13, color: 'var(--red-t)',
                            animation: 'fadeInScale 0.2s ease',
                        }}>
                            <span>✖</span> <span>{error}</span>
                        </div>
                    )}

                    <div className="form-grid">
                        {/* Vehicle */}
                        <div className="form-group">
                            <label className="form-label">
                                Vehicle *
                                <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>
                                    {availableVehicles.length} available
                                </span>
                            </label>
                            <select
                                className="form-control"
                                value={form.vehicleId}
                                onChange={e => setForm({ ...form, vehicleId: e.target.value })}
                            >
                                <option value="">Select vehicle…</option>
                                {availableVehicles.map(v => {
                                    const isBest = bestVehicle && sid(v) === sid(bestVehicle);
                                    return (
                                        <option key={sid(v)} value={sid(v)}>
                                            {isBest ? '⭐ ' : ''}{typeEmoji(v.type)} {v.name}
                                            {v.max_capacity ? ` (${v.max_capacity} kg)` : ''}
                                            {isBest ? ' · Recommended' : ''}
                                        </option>
                                    );
                                })}
                            </select>

                            {/* Smart match banner */}
                            {bestVehicle && (
                                <div style={{
                                    marginTop: 7, padding: '8px 12px',
                                    background: 'rgba(34,197,94,0.1)',
                                    border: '1px solid rgba(34,197,94,0.25)',
                                    borderRadius: 8, fontSize: 12, color: 'var(--green-t)',
                                    display: 'flex', alignItems: 'center', gap: 8,
                                }}>
                                    <span>⭐</span>
                                    <span>
                                        Best match: <strong>{bestVehicle.name}</strong>
                                        {' '}— {((bestVehicle.max_capacity ?? 0) - cw).toLocaleString()} kg spare
                                    </span>
                                </div>
                            )}

                            {/* Live cargo bar */}
                            {selectedVehicle && cw > 0 && (
                                <div style={{ marginTop: 8 }}>
                                    <div style={{
                                        display: 'flex', justifyContent: 'space-between',
                                        fontSize: 11, marginBottom: 4,
                                        color: cargoOverCapacity ? 'var(--red-t)' : 'var(--text-muted)',
                                        fontWeight: cargoOverCapacity ? 700 : 400,
                                    }}>
                                        <span>Cargo load</span>
                                        <span>{cw} / {vehicleCapacity} kg ({cargoPct}%)</span>
                                    </div>
                                    <div style={{
                                        height: 6, background: 'rgba(255,255,255,0.06)',
                                        borderRadius: 999, overflow: 'hidden',
                                    }}>
                                        <div style={{
                                            width: `${Math.min(100, cargoPct ?? 0)}%`,
                                            height: '100%', borderRadius: 999,
                                            background: cargoOverCapacity ? '#ef4444'
                                                : (cargoPct ?? 0) > 85 ? '#f97316' : '#22c55e',
                                            boxShadow: cargoOverCapacity ? '0 0 8px rgba(239,68,68,0.5)' : 'none',
                                            transition: 'width 0.3s ease, background 0.3s ease',
                                        }} />
                                    </div>
                                    {cargoOverCapacity && (
                                        <div style={{
                                            fontSize: 11, color: 'var(--red-t)', fontWeight: 600, marginTop: 4,
                                        }}>
                                            ✖ Exceeds capacity by {(cw - vehicleCapacity).toLocaleString()} kg
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Driver */}
                        <div className="form-group">
                            <label className="form-label">
                                Driver *
                                <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>
                                    {availableDrivers.length} eligible
                                </span>
                            </label>
                            <select
                                className="form-control"
                                value={form.driverId}
                                onChange={e => setForm({ ...form, driverId: e.target.value })}
                            >
                                <option value="">Select driver…</option>
                                {availableDrivers.map(d => (
                                    <option key={sid(d)} value={sid(d)}>
                                        {d.name} — {(d.license_category ?? d.licenseCategory ?? '').toUpperCase()}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Origin */}
                        <div className="form-group">
                            <label className="form-label">Origin *</label>
                            <input
                                className="form-control"
                                placeholder="Pickup city / address"
                                value={form.origin}
                                onChange={e => setForm({ ...form, origin: e.target.value })}
                            />
                        </div>

                        {/* Destination */}
                        <div className="form-group">
                            <label className="form-label">Destination *</label>
                            <input
                                className="form-control"
                                placeholder="Drop city / address"
                                value={form.destination}
                                onChange={e => setForm({ ...form, destination: e.target.value })}
                            />
                        </div>

                        {/* Cargo weight */}
                        <div className="form-group">
                            <label className="form-label">Cargo Weight (kg) *</label>
                            <input
                                className="form-control"
                                type="number" min="0"
                                placeholder="kg"
                                value={form.cargo_weight}
                                style={cargoOverCapacity ? { borderColor: 'rgba(239,68,68,0.6)' } : undefined}
                                onChange={e => setForm({ ...form, cargo_weight: e.target.value })}
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

                        {/* Departure date */}
                        <div className="form-group">
                            <label className="form-label">Departure Date</label>
                            <input
                                className="form-control"
                                type="datetime-local"
                                value={form.date_start}
                                onChange={e => setForm({ ...form, date_start: e.target.value })}
                            />
                        </div>

                        {/* Odometer */}
                        <div className="form-group">
                            <label className="form-label">
                                Odometer at Start
                                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6, fontWeight: 400 }}>
                                    optional
                                </span>
                            </label>
                            <input
                                className="form-control"
                                type="number" min="0"
                                placeholder="km"
                                value={form.odometer_start}
                                onChange={e => setForm({ ...form, odometer_start: e.target.value })}
                            />
                        </div>
                    </div>
                </Modal>
            )}

            {/* Spin animation */}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
