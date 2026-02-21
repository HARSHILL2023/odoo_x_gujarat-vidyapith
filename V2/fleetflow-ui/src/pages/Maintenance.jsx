import { useState } from 'react';
import { useFleet } from '../context/FleetContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import useCountUp from '../hooks/useCountUp';
import { showToast } from '../hooks/useToast';

/* ─── Data ────────────────────────────────────────────────── */
const EMPTY = {
    vehicleId: '', name: '', serviceType: 'oil_change',
    serviceDate: '', cost: '', mechanic: '', state: 'scheduled',
};

const SERVICE_TYPES = [
    { v: 'oil_change',  l: 'Oil Change',        emoji: '🛢',  color: '#f59e0b' },
    { v: 'tire',        l: 'Tire Service',       emoji: '🔄',  color: '#64748b' },
    { v: 'brake',       l: 'Brake Service',      emoji: '🛑',  color: '#ef4444' },
    { v: 'engine',      l: 'Engine Repair',      emoji: '⚙️', color: '#3b82f6' },
    { v: 'electrical',  l: 'Electrical',         emoji: '⚡',  color: '#eab308' },
    { v: 'bodywork',    l: 'Bodywork',           emoji: '🔨',  color: '#8b5cf6' },
    { v: 'scheduled',   l: 'Scheduled Service',  emoji: '📅',  color: '#22c55e' },
    { v: 'other',       l: 'Other',              emoji: '🔧',  color: '#94a3b8' },
];

const STATE_ORDER = { scheduled: 0, in_progress: 1, done: 2 };

const sid = val => String(val?._id ?? val ?? '');

/* ─── Service Type Chip ───────────────────────────────────── */
function ServiceChip({ type }) {
    const st = SERVICE_TYPES.find(t => t.v === type);
    if (!st) return <span className="tag">{type || '—'}</span>;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 11, fontWeight: 600, padding: '3px 9px',
            borderRadius: 999,
            background: `${st.color}18`,
            color: st.color,
            border: `1px solid ${st.color}30`,
        }}>
            {st.emoji} {st.l}
        </span>
    );
}

/* ─── State Timeline ──────────────────────────────────────── */
function StateLine({ state }) {
    const steps = [
        { key: 'scheduled',   label: 'Scheduled'  },
        { key: 'in_progress', label: 'In Progress' },
        { key: 'done',        label: 'Done'        },
    ];
    const current = STATE_ORDER[state] ?? 0;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, minWidth: 160 }}>
            {steps.map((s, i) => {
                const done   = i < current;
                const active = i === current;
                return (
                    <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
                        <div style={{
                            width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 700,
                            background: done
                                ? 'var(--green-t)'
                                : active
                                    ? 'var(--accent)'
                                    : 'rgba(255,255,255,0.06)',
                            color: done || active ? '#fff' : 'var(--text-muted)',
                            border: `2px solid ${done ? 'var(--green-t)' : active ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`,
                            boxShadow: active ? '0 0 10px rgba(59,130,246,0.4)' : done ? '0 0 8px rgba(34,197,94,0.3)' : 'none',
                            transition: 'all 0.3s ease',
                        }}
                            title={s.label}
                        >
                            {done ? '✓' : i + 1}
                        </div>
                        {i < steps.length - 1 && (
                            <div style={{
                                flex: 1, height: 2, margin: '0 2px',
                                background: done ? 'var(--green-t)' : 'rgba(255,255,255,0.06)',
                                transition: 'background 0.3s ease',
                            }} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/* ─── Cost Trend bar (per-vehicle) ───────────────────────── */
function CostBar({ label, cost, max, color, count }) {
    const pct = max > 0 ? (cost / max) * 100 : 0;
    return (
        <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: color, boxShadow: `0 0 6px ${color}80`,
                    }} />
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{count} record{count !== 1 ? 's' : ''}</span>
                </div>
                <span style={{ fontWeight: 700, color: 'var(--orange-t)' }}>${cost.toLocaleString()}</span>
            </div>
            <div style={{
                height: 6, background: 'rgba(255,255,255,0.05)',
                borderRadius: 999, overflow: 'hidden',
            }}>
                <div style={{
                    width: `${pct}%`, height: '100%', borderRadius: 999,
                    background: color,
                    boxShadow: `0 0 8px ${color}60`,
                    transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                }} />
            </div>
        </div>
    );
}

/* ─── Main Component ──────────────────────────────────────── */
export default function Maintenance() {
    const {
        maintenance, vehicles,
        addMaintenance, updateMaintenance, completeMaintenance,
    } = useFleet();

    const [modal, setModal]         = useState(false);
    const [form, setForm]           = useState(EMPTY);
    const [search, setSearch]       = useState('');
    const [filterState, setFilterState] = useState('all');
    const [filterType, setFilterType]   = useState('all');

    /* ── Helpers ──────────────────────────────────────────── */
    const getVehicleName = record => {
        if (record?.vehicle?.name) return record.vehicle.name;
        const vid = sid(record?.vehicle);
        return vehicles.find(v => sid(v) === vid)?.name || (vid ? `#${vid.slice(-4)}` : '—');
    };

    /* ── Aggregates ───────────────────────────────────────── */
    const totalCost     = maintenance.reduce((s, m) => s + (m.cost || 0), 0);
    const scheduledCount  = maintenance.filter(m => m.state === 'scheduled').length;
    const inProgressCount = maintenance.filter(m => m.state === 'in_progress').length;
    const doneCount       = maintenance.filter(m => m.state === 'done').length;
    const avgCost         = maintenance.length ? Math.round(totalCost / maintenance.length) : 0;

    const animSched  = useCountUp(scheduledCount);
    const animProg   = useCountUp(inProgressCount);
    const animDone   = useCountUp(doneCount);
    const animTotal  = useCountUp(Math.round(totalCost));

    /* ── Per-vehicle cost ─────────────────────────────────── */
    const VEHICLE_COLORS = ['#38bdf8','#a78bfa','#34d399','#fb923c','#f87171','#e879f9'];
    const perVehicle = vehicles
        .map((v, i) => {
            const vid   = sid(v);
            const recs  = maintenance.filter(m => sid(m.vehicle) === vid);
            return {
                name:  v.name,
                cost:  recs.reduce((s, m) => s + (m.cost || 0), 0),
                count: recs.length,
                color: VEHICLE_COLORS[i % VEHICLE_COLORS.length],
            };
        })
        .filter(v => v.cost > 0)
        .sort((a, b) => b.cost - a.cost);

    const maxVehicleCost = perVehicle.length ? perVehicle[0].cost : 1;

    /* ── Filtered records ─────────────────────────────────── */
    const filtered = maintenance
        .filter(m => {
            const q   = search.toLowerCase();
            const sType = m.service_type || m.serviceType;
            const ms  = !q ||
                (m.name        || '').toLowerCase().includes(q) ||
                (m.description || '').toLowerCase().includes(q) ||
                (m.mechanic    || '').toLowerCase().includes(q) ||
                getVehicleName(m).toLowerCase().includes(q);
            const mf = filterState === 'all' || m.state === filterState;
            const mt = filterType  === 'all' || sType   === filterType;
            return ms && mf && mt;
        })
        .sort((a, b) => {
            const ao = STATE_ORDER[a.state] ?? 0;
            const bo = STATE_ORDER[b.state] ?? 0;
            if (ao !== bo) return ao - bo;
            return new Date(b.date || b.serviceDate || 0) - new Date(a.date || a.serviceDate || 0);
        });

    /* ── Save ─────────────────────────────────────────────── */
    const handleSave = async () => {
        if (!form.vehicleId) { showToast({ message: 'Select a vehicle.', type: 'error' }); return; }
        if (!form.name.trim()) { showToast({ message: 'Enter a service description.', type: 'error' }); return; }
        try {
            await addMaintenance({
                vehicle:      form.vehicleId,
                name:         form.name,
                service_type: form.serviceType,
                date:         form.serviceDate || undefined,
                cost:         Number(form.cost) || 0,
                mechanic:     form.mechanic || undefined,
                state:        form.state,
            });
            setModal(false);
            setForm(EMPTY);
            showToast({ message: 'Service record added!', type: 'success' });
        } catch (e) {
            showToast({ message: e?.response?.message || e.message || 'Failed to save.', type: 'error' });
        }
    };

    /* ── Action handlers ──────────────────────────────────── */
    const startService = async mid => {
        try {
            await updateMaintenance(mid, { state: 'in_progress' });
            showToast({ message: 'Service started — vehicle set to In Shop.', type: 'success' });
        } catch (e) { showToast({ message: e.message, type: 'error' }); }
    };

    const doneService = async mid => {
        try {
            await completeMaintenance(mid);
            showToast({ message: 'Service completed — vehicle status restored!', type: 'success' });
        } catch (e) { showToast({ message: e.message, type: 'error' }); }
    };

    /* ── Selected service type meta ───────────────────────── */
    const selectedST = SERVICE_TYPES.find(t => t.v === form.serviceType);

    return (
        <div className="fade-in">
            {/* ── Page Header ───────────────────────────────── */}
            <div className="page-header">
                <div>
                    <div className="page-title">Maintenance Logs</div>
                    <div className="page-sub">
                        {scheduledCount + inProgressCount} open · ${totalCost.toLocaleString()} total · ~${avgCost.toLocaleString()} avg/record
                    </div>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => { setForm(EMPTY); setModal(true); }}
                >
                    + Log Service
                </button>
            </div>

            {/* ── KPI Cards ─────────────────────────────────── */}
            <div className="kpi-grid" style={{ marginBottom: 20 }}>
                <div className="kpi-card orange ff-card" style={{ animation: 'fadeInScale 0.35s ease 0ms both', cursor: 'pointer' }}
                    onClick={() => setFilterState(filterState === 'scheduled' ? 'all' : 'scheduled')}>
                    <div className="kpi-icon">📅</div>
                    <div className="kpi-label">Scheduled</div>
                    <div className="kpi-value">{animSched}</div>
                    <div className="kpi-sub">awaiting start</div>
                </div>
                <div className="kpi-card blue ff-card" style={{ animation: 'fadeInScale 0.35s ease 60ms both', cursor: 'pointer' }}
                    onClick={() => setFilterState(filterState === 'in_progress' ? 'all' : 'in_progress')}>
                    <div className="kpi-icon">🔧</div>
                    <div className="kpi-label">In Progress</div>
                    <div className="kpi-value">{animProg}</div>
                    <div className="kpi-sub">vehicle in shop</div>
                </div>
                <div className="kpi-card green ff-card" style={{ animation: 'fadeInScale 0.35s ease 120ms both', cursor: 'pointer' }}
                    onClick={() => setFilterState(filterState === 'done' ? 'all' : 'done')}>
                    <div className="kpi-icon">✅</div>
                    <div className="kpi-label">Completed</div>
                    <div className="kpi-value">{animDone}</div>
                    <div className="kpi-sub">service records</div>
                </div>
                <div className="kpi-card red ff-card" style={{ animation: 'fadeInScale 0.35s ease 180ms both' }}>
                    <div className="kpi-icon">💸</div>
                    <div className="kpi-label">Total Cost</div>
                    <div className="kpi-value">${animTotal.toLocaleString()}</div>
                    <div className="kpi-sub">all service records</div>
                </div>
            </div>

            {/* ── Cost by Vehicle ───────────────────────────── */}
            {perVehicle.length > 0 && (
                <div className="table-wrapper ff-card" style={{ marginBottom: 20, padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>🔧 Maintenance Cost by Vehicle</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                Share of ${totalCost.toLocaleString()} total
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
                    {perVehicle.map((v, i) => (
                        <CostBar
                            key={v.name} label={v.name} cost={v.cost}
                            max={maxVehicleCost} color={v.color} count={v.count}
                        />
                    ))}
                </div>
            )}

            {/* ── Service Records Table ─────────────────────── */}
            <div className="table-wrapper">
                <div className="table-toolbar">
                    <span className="table-toolbar-title">
                        Service Records
                        <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>
                            ({filtered.length})
                        </span>
                    </span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* State filter */}
                        <select
                            className="form-control"
                            style={{ width: 130, height: 32, fontSize: 12 }}
                            value={filterState}
                            onChange={e => setFilterState(e.target.value)}
                        >
                            <option value="all">All States</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="in_progress">In Progress</option>
                            <option value="done">Done</option>
                        </select>
                        {/* Type filter */}
                        <select
                            className="form-control"
                            style={{ width: 140, height: 32, fontSize: 12 }}
                            value={filterType}
                            onChange={e => setFilterType(e.target.value)}
                        >
                            <option value="all">All Types</option>
                            {SERVICE_TYPES.map(t => (
                                <option key={t.v} value={t.v}>{t.emoji} {t.l}</option>
                            ))}
                        </select>
                        {/* Search */}
                        <div className="search-wrap">
                            <span className="search-icon">🔍</span>
                            <input
                                className="search-input"
                                placeholder="Search records…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
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
                                        <div className="empty-state-icon">🔧</div>
                                        <div className="empty-state-text">
                                            {search || filterState !== 'all' || filterType !== 'all'
                                                ? 'No records match your filters'
                                                : 'No service records yet'}
                                        </div>
                                        {!search && filterState === 'all' && filterType === 'all' && (
                                            <button
                                                className="btn btn-primary btn-sm"
                                                style={{ marginTop: 12 }}
                                                onClick={() => setModal(true)}
                                            >
                                                + Log First Service
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ) : filtered.map(m => {
                            const mid         = sid(m);
                            const serviceType = m.service_type || m.serviceType;
                            const serviceDate = m.date || m.serviceDate;
                            const description = m.name || m.description || '—';
                            const cost        = m.cost || 0;

                            return (
                                <tr key={mid}>
                                    <td>
                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{description}</div>
                                        {m.notes && (
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
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
                                        <StateLine state={m.state} />
                                    </td>
                                    <td>
                                        <div style={{ fontSize: 13 }}>
                                            {serviceDate
                                                ? new Date(serviceDate).toLocaleDateString(undefined, {
                                                    day: 'numeric', month: 'short', year: '2-digit',
                                                })
                                                : <span className="text-muted">—</span>}
                                        </div>
                                    </td>
                                    <td>
                                        {m.mechanic ? (
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                                🔩 {m.mechanic}
                                            </div>
                                        ) : <span className="text-muted">—</span>}
                                    </td>
                                    <td>
                                        <span style={{
                                            fontWeight: 700, fontSize: 13,
                                            color: cost > 0 ? 'var(--orange-t)' : 'var(--text-muted)',
                                        }}>
                                            {cost > 0 ? `$${cost.toLocaleString()}` : '—'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="actions">
                                            {m.state === 'scheduled' && (
                                                <button
                                                    className="btn btn-warning btn-sm"
                                                    title="Mark as In Progress"
                                                    onClick={() => startService(mid)}
                                                >
                                                    ▶ Start
                                                </button>
                                            )}
                                            {m.state === 'in_progress' && (
                                                <button
                                                    className="btn btn-success btn-sm"
                                                    title="Mark as Done"
                                                    onClick={() => doneService(mid)}
                                                >
                                                    ✓ Done
                                                </button>
                                            )}
                                            {m.state === 'done' && (
                                                <span style={{ fontSize: 11, color: 'var(--green-t)', fontWeight: 600 }}>
                                                    ✓ Complete
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
                                <td style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--orange-t)' }}>
                                    ${filtered.reduce((s, m) => s + (m.cost || 0), 0).toLocaleString()}
                                </td>
                                <td />
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {/* ── Add Service Modal ─────────────────────────── */}
            {modal && (
                <Modal
                    title="🔧 Log New Service"
                    onClose={() => { setModal(false); setForm(EMPTY); }}
                    footer={<>
                        <button className="btn btn-secondary" onClick={() => { setModal(false); setForm(EMPTY); }}>
                            Cancel
                        </button>
                        <button className="btn btn-primary" onClick={handleSave}>
                            Save Record
                        </button>
                    </>}
                >
                    {/* Warning banner */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', marginBottom: 18,
                        background: 'rgba(245,158,11,0.1)',
                        border: '1px solid rgba(245,158,11,0.25)',
                        borderRadius: 9, fontSize: 12,
                        color: 'var(--orange-t)',
                    }}>
                        <span style={{ fontSize: 18, flexShrink: 0 }}>⚠</span>
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
                                onChange={e => setForm({ ...form, name: e.target.value })}
                            />
                        </div>

                        {/* Vehicle */}
                        <div className="form-group">
                            <label className="form-label">Vehicle *</label>
                            <select
                                className="form-control"
                                value={form.vehicleId}
                                onChange={e => setForm({ ...form, vehicleId: e.target.value })}
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
                                onChange={e => setForm({ ...form, serviceType: e.target.value })}
                                style={{
                                    borderColor: selectedST ? `${selectedST.color}60` : undefined,
                                    color: selectedST ? selectedST.color : undefined,
                                    fontWeight: 600,
                                }}
                            >
                                {SERVICE_TYPES.map(t => (
                                    <option key={t.v} value={t.v}>{t.emoji} {t.l}</option>
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
                                onChange={e => setForm({ ...form, serviceDate: e.target.value })}
                            />
                        </div>

                        {/* Cost */}
                        <div className="form-group">
                            <label className="form-label">Cost ($)</label>
                            <input
                                className="form-control"
                                type="number" min="0"
                                placeholder="0"
                                value={form.cost}
                                onChange={e => setForm({ ...form, cost: e.target.value })}
                            />
                        </div>

                        {/* Initial State */}
                        <div className="form-group">
                            <label className="form-label">Initial Status</label>
                            <select
                                className="form-control"
                                value={form.state}
                                onChange={e => setForm({ ...form, state: e.target.value })}
                            >
                                <option value="scheduled">📅 Scheduled</option>
                                <option value="in_progress">🔧 In Progress</option>
                            </select>
                        </div>

                        {/* Mechanic — full width */}
                        <div className="form-group form-grid-full">
                            <label className="form-label">
                                Mechanic / Vendor
                                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6, fontWeight: 400 }}>
                                    optional
                                </span>
                            </label>
                            <input
                                className="form-control"
                                placeholder="e.g. City Auto Service"
                                value={form.mechanic}
                                onChange={e => setForm({ ...form, mechanic: e.target.value })}
                            />
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
