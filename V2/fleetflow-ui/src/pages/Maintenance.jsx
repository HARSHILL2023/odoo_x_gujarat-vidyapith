import { useCallback, useMemo, useState } from 'react';
import { useFleet } from '../context/FleetContext';
import Modal from '../components/Modal';
import SkeletonTable from '../components/SkeletonTable';
import useCountUp from '../hooks/useCountUp';
import toast from '../hooks/useToast';
import {
    Check, Play, CheckCircle2, IndianRupee,
    Search, X, AlertTriangle, Plus,
    Wrench, Calendar, Droplet, Disc,
    AlertOctagon, Settings, Zap, Hammer,
    History
} from 'lucide-react';

/* ════════════════════════════════════════════════════════════
   CONSTANTS
   ════════════════════════════════════════════════════════════ */
/* FIX: EMPTY uses `status` not `state` — matches API field name */
const EMPTY = {
    vehicleId: '', name: '', serviceType: 'oil_change',
    serviceDate: '', cost: '', mechanic: '', status: 'scheduled',
};

const SERVICE_TYPES = [
    { v: 'oil_change', l: 'Oil Change', Icon: Droplet, color: '#f59e0b' },
    { v: 'tire', l: 'Tire Service', Icon: Disc, color: '#64748b' },
    { v: 'brake', l: 'Brake Service', Icon: AlertOctagon, color: '#ef4444' },
    { v: 'engine', l: 'Engine Repair', Icon: Settings, color: '#3b82f6' },
    { v: 'electrical', l: 'Electrical', Icon: Zap, color: '#eab308' },
    { v: 'bodywork', l: 'Bodywork', Icon: Hammer, color: '#8b5cf6' },
    { v: 'scheduled', l: 'Scheduled Service', Icon: Calendar, color: '#22c55e' },
    { v: 'other', l: 'Other', Icon: Wrench, color: '#94a3b8' },
];

const STATE_ORDER = { scheduled: 0, in_progress: 1, done: 2 };

/* FIX: moved to module scope — was re-created inside component on every render */
const VEHICLE_COLORS = ['#38bdf8', '#a78bfa', '#34d399', '#fb923c', '#f87171', '#e879f9'];

const sid = (val) => String(val?._id ?? val ?? '');

/* ════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ════════════════════════════════════════════════════════════ */

/* ── ServiceChip ───────────────────────────────────────────── */
function ServiceChip({ type }) {
    const st = SERVICE_TYPES.find(t => t.v === type);
    if (!st) return <span className="tag">{type || '—'}</span>;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
            background: `${st.color}18`, color: st.color,
            border: `1px solid ${st.color}30`,
        }}>
            <st.Icon size={12} /> {st.l}
        </span>
    );
}

/* ── StateLine ─────────────────────────────────────────────── */
function StateLine({ state }) {
    const steps = [
        { key: 'scheduled', label: 'Scheduled' },
        { key: 'in_progress', label: 'In Progress' },
        { key: 'done', label: 'Done' },
    ];
    const current = STATE_ORDER[state] ?? 0;
    const label = (state || 'scheduled').replace('_', ' ');
    return (
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 120, flex: 1 }} aria-label={`Service status: ${label}`}>
            {steps.map((s, i) => {
                const done = i < current;
                const active = i === current;
                return (
                    <div
                        key={s.key}
                        style={{
                            display: 'flex', alignItems: 'center',
                            flex: i < steps.length - 1 ? 1 : 'none',
                        }}
                    >
                        <div
                            title={s.label}
                            aria-current={active ? 'step' : undefined}
                            style={{
                                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 10, fontWeight: 700,
                                background: done
                                    ? 'var(--green-t)'
                                    : active ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                                color: done || active ? '#fff' : 'var(--text-muted)',
                                border: `2px solid ${done ? 'var(--green-t)'
                                    : active ? 'var(--accent)'
                                        : 'rgba(255,255,255,0.1)'}`,
                                boxShadow: active
                                    ? '0 0 10px rgba(59,130,246,0.4)'
                                    : done ? '0 0 8px rgba(34,197,94,0.3)' : 'none',
                                transition: 'all 0.3s ease',
                            }}
                        >
                            {done ? <Check size={12} strokeWidth={3} aria-hidden="true" /> : i + 1}
                        </div>
                        {i < steps.length - 1 && (
                            <div style={{
                                flex: 1, height: 2, margin: '0 2px',
                                background: done ? 'var(--green-t)' : 'rgba(255,255,255,0.06)',
                                transition: 'background 0.3s ease',
                            }} aria-hidden="true" />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/* ── CostBar ───────────────────────────────────────────────── */
function CostBar({ label, cost, max, color, count }) {
    const pct = max > 0 ? (cost / max) * 100 : 0;
    return (
        <div style={{ marginBottom: 10 }} aria-label={`${label} maintenance cost: ₹${cost.toLocaleString()} (${pct.toFixed(0)}% of max)`}>
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                marginBottom: 5, fontSize: 12,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: color, boxShadow: `0 0 6px ${color}80`,
                    }} aria-hidden="true" />
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {count} record{count !== 1 ? 's' : ''}
                    </span>
                </div>
                <span style={{ fontWeight: 700, color: 'var(--orange-t)' }}>
                    ₹{cost.toLocaleString()}
                </span>
            </div>
            <div style={{
                height: 6, background: 'rgba(255,255,255,0.05)',
                borderRadius: 999, overflow: 'hidden',
            }} aria-hidden="true">
                <div style={{
                    width: `${pct}%`, height: '100%', borderRadius: 999,
                    background: color, boxShadow: `0 0 8px ${color}60`,
                    transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                }} />
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════ */
export default function Maintenance() {
    const {
        maintenance, vehicles, loading,
        addMaintenance, updateMaintenance, completeMaintenance,
    } = useFleet();

    const [modal, setModal] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [search, setSearch] = useState('');
    const [filterState, setFilterState] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [saving, setSaving] = useState(false);

    /* ── Vehicle lookup map — O(1) ──────────────────────────── */
    /* FIX: original called vehicles.find() inside every render row (O(n²)) */
    const vehicleMap = useMemo(() =>
        Object.fromEntries(vehicles.map(v => [sid(v), v])),
        [vehicles]
    );

    const getVehicleName = useCallback((record) => {
        const vid = sid(record?.vehicle);
        return vehicleMap[vid]?.name ?? (vid ? `#${vid.slice(-4)}` : '—');
    }, [vehicleMap]);

    /* ── Aggregates ─────────────────────────────────────────── */
    /* FIX: m.state → m.status — was silently returning 0 for all three counts */
    const totalCost = useMemo(
        () => maintenance.reduce((s, m) => s + (m.cost || 0), 0),
        [maintenance]
    );
    const scheduledCount = useMemo(
        () => maintenance.filter(m => m.status === 'scheduled').length,
        [maintenance]
    );
    const inProgressCount = useMemo(
        () => maintenance.filter(m => m.status === 'in_progress').length,
        [maintenance]
    );
    const doneCount = useMemo(
        () => maintenance.filter(m => m.status === 'done').length,
        [maintenance]
    );

    /* ── Animated KPIs ──────────────────────────────────────── */
    const animSched = useCountUp(scheduledCount, { delay: 0, easing: 'ease-out-expo' });
    const animProg = useCountUp(inProgressCount, { delay: 60, easing: 'ease-out-expo' });
    const animDone = useCountUp(doneCount, { delay: 120, easing: 'ease-out-expo' });
    const animTotal = useCountUp(Math.round(totalCost), { delay: 180, easing: 'ease-out-expo' });

    /* ── Per-vehicle cost ───────────────────────────────────── */
    const perVehicle = useMemo(() =>
        vehicles
            .map((v, i) => {
                const vid = sid(v);
                const recs = maintenance.filter(m => sid(m.vehicle) === vid);
                return {
                    name: v.name,
                    cost: recs.reduce((s, m) => s + (m.cost || 0), 0),
                    count: recs.length,
                    color: VEHICLE_COLORS[i % VEHICLE_COLORS.length],
                };
            })
            .filter(v => v.cost > 0)
            .sort((a, b) => b.cost - a.cost),
        [vehicles, maintenance]
    );

    const maxVehicleCost = perVehicle.length ? perVehicle[0].cost : 1;

    /* ── Filtered records ───────────────────────────────────── */
    /* FIX: m.state → m.status in both filter and sort comparisons */
    const filtered = useMemo(() =>
        maintenance
            .filter(m => {
                const q = search.toLowerCase();
                const sType = m.service_type ?? m.serviceType;
                const matchSearch = !q ||
                    (m.name ?? '').toLowerCase().includes(q) ||
                    (m.description ?? '').toLowerCase().includes(q) ||
                    (m.mechanic ?? '').toLowerCase().includes(q) ||
                    getVehicleName(m).toLowerCase().includes(q);
                const matchState = filterState === 'all' || m.status === filterState;
                const matchType = filterType === 'all' || sType === filterType;
                return matchSearch && matchState && matchType;
            })
            .sort((a, b) => {
                const ao = STATE_ORDER[a.status] ?? 0;
                const bo = STATE_ORDER[b.status] ?? 0;
                if (ao !== bo) return ao - bo;
                const da = new Date(a.service_date ?? a.serviceDate ?? a.date ?? 0);
                const db = new Date(b.service_date ?? b.serviceDate ?? b.date ?? 0);
                return db - da;
            }),
        [maintenance, search, filterState, filterType, getVehicleName]
    );

    /* ── Filtered total cost (for tfoot) ─────────────────────── */
    const filteredTotalCost = useMemo(
        () => filtered.reduce((s, m) => s + (m.cost || 0), 0),
        [filtered]
    );

    /* ── Selected service type meta ─────────────────────────── */
    const selectedST = useMemo(
        () => SERVICE_TYPES.find(t => t.v === form.serviceType),
        [form.serviceType]
    );

    /* ── Modal handlers ─────────────────────────────────────── */
    const openModal = useCallback(() => {
        setForm(EMPTY);
        setModal(true);
    }, []);

    const closeModal = useCallback(() => {
        setModal(false);
        setForm(EMPTY);
        setSaving(false);
    }, []);

    /* ── KPI card filter toggle ─────────────────────────────── */
    const toggleFilter = useCallback((value) => {
        setFilterState(prev => prev === value ? 'all' : value);
    }, []);

    /* ── Save ───────────────────────────────────────────────── */
    /* FIX: sends `status` not `state`; sends `service_date` not `date` */
    const handleSave = useCallback(async () => {
        if (!form.vehicleId) {
            toast.error('Select a vehicle.');
            return;
        }
        if (!form.name.trim()) {
            toast.error('Enter a service description.');
            return;
        }
        setSaving(true);
        try {
            await addMaintenance({
                vehicle: form.vehicleId,
                name: form.name,
                service_type: form.serviceType,
                service_date: form.serviceDate || undefined,
                cost: Number(form.cost) || 0,
                mechanic: form.mechanic || undefined,
                status: form.status,          // FIX: was state: form.state
            });
            closeModal();
            toast.success('Service record added!');
        } catch (e) {
            toast.error(e?.response?.message ?? e?.message ?? 'Failed to save.');
        } finally {
            setSaving(false);
        }
    }, [form, addMaintenance, closeModal]);

    /* ── Start service ──────────────────────────────────────── */
    /* FIX: sends { status: 'in_progress' } not { state: 'in_progress' } */
    const startService = useCallback(async (mid) => {
        try {
            await updateMaintenance(mid, { status: 'in_progress' });
            toast.success('Service started — vehicle set to In Shop.');
        } catch (e) {
            toast.error(e?.message ?? 'Failed to start service.');
        }
    }, [updateMaintenance]);

    /* ── Complete service ───────────────────────────────────── */
    const doneService = useCallback(async (mid) => {
        try {
            await completeMaintenance(mid);
            toast.success('Service completed — vehicle status restored!');
        } catch (e) {
            toast.error(e?.message ?? 'Failed to complete service.');
        }
    }, [completeMaintenance]);

    if (loading) return <SkeletonTable rows={6} cols={8} />;

    /* ════════════════════════════════════════════════════════
       RENDER
       ════════════════════════════════════════════════════════ */
    return (
        <div className="fade-in">

            {/* ── Page Actions ────────────────────────────────── */}
            <div className="page-header">
                <div className="page-sub">
                    {scheduledCount + inProgressCount} open
                    {' · '}₹{totalCost.toLocaleString()} total
                </div>
                <div className="page-actions">
                    <button className="btn btn-primary" onClick={openModal}>
                        <Plus size={14} /> Log Service
                    </button>
                </div>
            </div>

            {/* ── KPI Cards ───────────────────────────────── */}
            <div className="kpi-grid" style={{ marginBottom: 20 }}>

                <div
                    className="kpi-card orange ff-card"
                    style={{ animation: 'fadeInScale 0.35s ease 0ms both', cursor: 'pointer' }}
                    onClick={() => toggleFilter('scheduled')}
                    role="button" tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && toggleFilter('scheduled')}
                    title="Click to filter by Scheduled"
                >
                    <div className="kpi-icon"><Calendar size={20} /></div>
                    <div className="kpi-label">Scheduled</div>
                    <div className="kpi-value">{animSched}</div>
                    <div className="kpi-sub">awaiting start</div>
                </div>

                <div
                    className="kpi-card blue ff-card"
                    style={{ animation: 'fadeInScale 0.35s ease 60ms both', cursor: 'pointer' }}
                    onClick={() => toggleFilter('in_progress')}
                    role="button" tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && toggleFilter('in_progress')}
                    title="Click to filter by In Progress"
                >
                    <div className="kpi-icon"><Wrench size={20} /></div>
                    <div className="kpi-label">In Progress</div>
                    <div className="kpi-value">{animProg}</div>
                    <div className="kpi-sub">vehicle in shop</div>
                </div>

                <div
                    className="kpi-card green ff-card"
                    style={{ animation: 'fadeInScale 0.35s ease 120ms both', cursor: 'pointer' }}
                    onClick={() => toggleFilter('done')}
                    role="button" tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && toggleFilter('done')}
                    title="Click to filter by Done"
                >
                    <div className="kpi-icon"><CheckCircle2 size={20} /></div>
                    <div className="kpi-label">Completed</div>
                    <div className="kpi-value">{animDone}</div>
                    <div className="kpi-sub">service records</div>
                </div>

                <div className="kpi-card red ff-card"
                    style={{ animation: 'fadeInScale 0.35s ease 180ms both' }}>
                    <div className="kpi-icon"><IndianRupee size={20} /></div>
                    <div className="kpi-label">Total Cost</div>
                    <div className="kpi-value">₹{animTotal.toLocaleString()}</div>
                    <div className="kpi-sub">all service records</div>
                </div>

            </div>

            {/* ── Cost by Vehicle ──────────────────────────── */}
            {perVehicle.length > 0 && (
                <div className="table-wrapper ff-card"
                    style={{ marginBottom: 20, padding: '16px 20px' }}>
                    <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', marginBottom: 16,
                    }}>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <History size={14} className="text-muted" /> Maintenance Cost by Vehicle
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                Share of ₹{totalCost.toLocaleString()} total
                            </div>
                        </div>
                        <span style={{
                            fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                            background: 'rgba(255,255,255,0.05)',
                            padding: '3px 10px', borderRadius: 999,
                        }}>
                            {perVehicle.length} vehicles
                        </span>
                    </div>
                    {perVehicle.map(v => (
                        <CostBar
                            key={v.name}
                            label={v.name} cost={v.cost}
                            max={maxVehicleCost} color={v.color} count={v.count}
                        />
                    ))}
                </div>
            )}

            {/* ── Service Records Table ────────────────────── */}
            <div className="table-wrapper">
                <div className="table-toolbar">
                    <span className="table-toolbar-title">
                        Service Records
                        <span style={{
                            marginLeft: 6, fontSize: 12,
                            fontWeight: 400, color: 'var(--text-muted)',
                        }}>
                            ({filtered.length})
                        </span>
                    </span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>

                        {/* State filter */}
                        <select
                            className="form-control"
                            style={{ flex: 1, height: 32, fontSize: 12, minWidth: 100 }}
                            value={filterState}
                            onChange={e => setFilterState(e.target.value)}
                        >
                            <option value="all">States</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="in_progress">In Progress</option>
                            <option value="done">Done</option>
                        </select>

                        {/* Type filter */}
                        <select
                            className="form-control"
                            style={{ flex: 1, height: 32, fontSize: 12, minWidth: 100 }}
                            value={filterType}
                            onChange={e => setFilterType(e.target.value)}
                        >
                            <option value="all">Types</option>
                            {SERVICE_TYPES.map(t => (
                                <option key={t.v} value={t.v}>{t.l}</option>
                            ))}
                        </select>

                        {/* Search with clear button */}
                        <div className="search-wrap" style={{ position: 'relative', flex: '1 1 150px' }}>
                            <span className="search-icon"><Search size={14} /></span>
                            <input
                                className="search-input"
                                placeholder="Search records…"
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
                            <th>Description</th>
                            <th>Vehicle</th>
                            <th>Type</th>
                            <th>Progress</th>
                            <th>Date</th>
                            <th>Mechanic</th>
                            <th>Cost</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={8}>
                                    <div className="empty-state">
                                        <div className="empty-state-icon"><History size={40} opacity={0.2} /></div>
                                        <div className="empty-state-text">
                                            {search || filterState !== 'all' || filterType !== 'all'
                                                ? 'No records match your filters'
                                                : 'No service records yet'}
                                        </div>
                                        {!search && filterState === 'all' && filterType === 'all' && (
                                            <button
                                                className="btn btn-primary btn-sm"
                                                style={{ marginTop: 12 }}
                                                onClick={openModal}
                                            >
                                                <Plus size={14} /> Log First Service
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ) : filtered.map(m => {
                            const mid = sid(m);
                            const serviceType = m.service_type ?? m.serviceType;
                            /* FIX: consistent date field access with service_date first */
                            const serviceDate = m.service_date ?? m.serviceDate ?? m.date;
                            const description = m.name ?? m.description ?? '—';
                            const cost = m.cost ?? 0;

                            return (
                                <tr key={mid}>
                                    <td>
                                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                                            {description}
                                        </div>
                                        {m.notes && (
                                            <div style={{
                                                fontSize: 11, color: 'var(--text-muted)', marginTop: 2,
                                            }}>
                                                {m.notes}
                                            </div>
                                        )}
                                    </td>

                                    <td>
                                        <div style={{ fontWeight: 600 }}>{getVehicleName(m)}</div>
                                    </td>

                                    <td>
                                        <ServiceChip type={serviceType} />
                                    </td>

                                    <td>
                                        {/* FIX: passes m.status — was m.state (always undefined) */}
                                        <StateLine state={m.status} />
                                    </td>

                                    <td>
                                        <div style={{ fontSize: 13 }}>
                                            {serviceDate ? (
                                                new Date(serviceDate).toLocaleDateString(undefined, {
                                                    day: 'numeric', month: 'short', year: '2-digit',
                                                })
                                            ) : (
                                                <span className="text-muted">—</span>
                                            )}
                                        </div>
                                    </td>

                                    <td>
                                        {m.mechanic ? (
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Wrench size={11} /> {m.mechanic}
                                            </div>
                                        ) : (
                                            <span className="text-muted">—</span>
                                        )}
                                    </td>

                                    <td>
                                        <span style={{
                                            fontWeight: 700, fontSize: 13,
                                            color: cost > 0 ? 'var(--orange-t)' : 'var(--text-muted)',
                                        }}>
                                            {cost > 0 ? `₹${cost.toLocaleString()}` : '—'}
                                        </span>
                                    </td>

                                    <td>
                                        <div className="actions">
                                            {/* FIX: m.status not m.state for all three conditions */}
                                            {m.status === 'scheduled' && (
                                                <button
                                                    className="btn btn-warning btn-sm"
                                                    title="Mark as In Progress"
                                                    onClick={() => startService(mid)}
                                                >
                                                    <Play size={12} fill="currentColor" /> Start
                                                </button>
                                            )}
                                            {m.status === 'in_progress' && (
                                                <button
                                                    className="btn btn-success btn-sm"
                                                    title="Mark as Done"
                                                    onClick={() => doneService(mid)}
                                                >
                                                    <Check size={12} strokeWidth={3} /> Done
                                                </button>
                                            )}
                                            {m.status === 'done' && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--green-t)', fontSize: 11, fontWeight: 600 }}>
                                                    <CheckCircle2 size={12} /> Complete
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>

                    {/* Footer totals */}
                    {filtered.length > 0 && (
                        <tfoot>
                            <tr style={{
                                background: 'rgba(255,255,255,0.02)',
                                borderTop: '2px solid var(--glass-border)',
                            }}>
                                <td colSpan={6} style={{
                                    padding: '10px 16px', fontSize: 12,
                                    fontWeight: 700, color: 'var(--text-muted)',
                                    textTransform: 'uppercase', letterSpacing: '0.5px',
                                }}>
                                    Totals ({filtered.length} records)
                                </td>
                                <td style={{
                                    padding: '10px 16px', fontWeight: 700,
                                    color: 'var(--orange-t)',
                                }}>
                                    ₹{filteredTotalCost.toLocaleString()}
                                </td>
                                <td />
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {/* ── Add Service Modal ────────────────────────── */}
            {modal && (
                <Modal
                    title={<span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><History size={18} /> Log New Service</span>}
                    onClose={closeModal}
                    footer={
                        <>
                            <button className="btn btn-secondary" onClick={closeModal}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving ? 'Saving…' : 'Save Record'}
                            </button>
                        </>
                    }
                >
                    {/* Warning banner */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', marginBottom: 18,
                        background: 'rgba(245,158,11,0.1)',
                        border: '1px solid rgba(245,158,11,0.25)',
                        borderRadius: 9, fontSize: 12, color: 'var(--orange-t)',
                    }}>
                        <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                        <span>
                            Adding a service record will automatically set the vehicle status to{' '}
                            <strong>In Shop</strong>.
                        </span>
                    </div>

                    <div className="form-grid">

                        {/* Description — full width */}
                        <div className="form-group form-grid-full">
                            <label className="form-label">Service Description *</label>
                            <input
                                className="form-control"
                                placeholder="e.g. Oil Change + Filter Replacement"
                                value={form.name}
                                autoFocus
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            />
                        </div>

                        {/* Vehicle */}
                        <div className="form-group">
                            <label className="form-label">Vehicle *</label>
                            <select
                                className="form-control"
                                value={form.vehicleId}
                                onChange={e => setForm(f => ({ ...f, vehicleId: e.target.value }))}
                            >
                                <option value="">Select vehicle…</option>
                                {vehicles.map(v => (
                                    <option key={sid(v)} value={sid(v)}>{v.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Service Type with color preview */}
                        <div className="form-group">
                            <label className="form-label">Service Type</label>
                            <select
                                className="form-control"
                                value={form.serviceType}
                                onChange={e => setForm(f => ({ ...f, serviceType: e.target.value }))}
                                style={{
                                    borderColor: selectedST ? `${selectedST.color}60` : undefined,
                                    color: selectedST ? selectedST.color : undefined,
                                    fontWeight: 600,
                                }}
                            >
                                {SERVICE_TYPES.map(t => (
                                    <option key={t.v} value={t.v}>{t.l}</option>
                                ))}
                            </select>
                        </div>

                        {/* Date */}
                        <div className="form-group">
                            <label className="form-label">Service Date</label>
                            <input
                                className="form-control"
                                type="date"
                                value={form.serviceDate}
                                max={new Date().toISOString().slice(0, 10)}
                                onChange={e => setForm(f => ({ ...f, serviceDate: e.target.value }))}
                            />
                        </div>

                        {/* Cost */}
                        <div className="form-group">
                            <label className="form-label">Cost (₹)</label>
                            <input
                                className="form-control"
                                type="number" min="0" step="1"
                                placeholder="0"
                                value={form.cost}
                                onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                            />
                        </div>

                        {/* Initial Status — FIX: form.status not form.state */}
                        <div className="form-group">
                            <label className="form-label">Initial Status</label>
                            <select
                                className="form-control"
                                value={form.status}
                                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                            >
                                <option value="scheduled">Scheduled</option>
                                <option value="in_progress">In Progress</option>
                            </select>
                        </div>

                        {/* Mechanic — full width */}
                        <div className="form-group form-grid-full">
                            <label className="form-label">
                                Mechanic / Vendor
                                <span style={{
                                    fontSize: 10, color: 'var(--text-muted)',
                                    marginLeft: 6, fontWeight: 400,
                                }}>
                                    optional
                                </span>
                            </label>
                            <input
                                className="form-control"
                                placeholder="e.g. City Auto Service"
                                value={form.mechanic}
                                onChange={e => setForm(f => ({ ...f, mechanic: e.target.value }))}
                            />
                        </div>

                    </div>
                </Modal>
            )}
        </div>
    );
}
