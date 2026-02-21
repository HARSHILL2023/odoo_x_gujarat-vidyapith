import { useState } from 'react';
import { useFleet } from '../context/FleetContext';
import Modal from '../components/Modal';
import useCountUp from '../hooks/useCountUp';
import { showToast } from '../hooks/useToast';

const EMPTY = { vehicleId: '', tripId: '', date: '', liters: '', cost: '', odometer: '' };

const sid = val => String(val?._id ?? val ?? '');

/* ─── Efficiency badge ────────────────────────────────────── */
function EffBadge({ costPerL }) {
    if (!costPerL || isNaN(costPerL)) return null;
    const isGood = costPerL < 1.5;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 10, fontWeight: 700, padding: '2px 7px',
            borderRadius: 999,
            background: isGood ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
            color: isGood ? 'var(--green-t)' : 'var(--red-t)',
            border: `1px solid ${isGood ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
        }}>
            {isGood ? '↓' : '↑'} ${costPerL.toFixed(2)}/L
        </span>
    );
}

/* ─── Vehicle bar row ─────────────────────────────────────── */
function VehicleBar({ v, totalCost, rank }) {
    const pct = totalCost > 0 ? (v.totalCost / totalCost) * 100 : 0;
    const GRADIENT_COLORS = [
        'linear-gradient(90deg,#38bdf8,#3b82f6)',
        'linear-gradient(90deg,#a78bfa,#6366f1)',
        'linear-gradient(90deg,#34d399,#22c55e)',
        'linear-gradient(90deg,#fb923c,#f59e0b)',
        'linear-gradient(90deg,#f87171,#ef4444)',
    ];
    const bg = GRADIENT_COLORS[rank % GRADIENT_COLORS.length];

    return (
        <div className="stat-bar-item" style={{ gap: 6 }}>
            <div className="stat-bar-label" style={{ fontSize: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: bg, flexShrink: 0,
                        boxShadow: `0 0 6px ${GRADIENT_COLORS[rank % 5].includes('38bdf8') ? '#38bdf880' : '#a78bfa80'}`,
                    }} />
                    <span style={{ fontWeight: 600 }}>{v.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                        {v.totalLiters.toFixed(1)} L
                    </span>
                    <strong style={{ color: 'var(--text-primary)' }}>
                        ${v.totalCost.toLocaleString()}
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
            <div className="stat-bar-track">
                <div className="stat-bar-fill" style={{ width: `${pct}%`, background: bg }} />
            </div>
        </div>
    );
}

/* ─── Main Component ──────────────────────────────────────── */
export default function FuelLogs() {
    const { fuelLogs, vehicles, trips, addFuelLog, deleteFuelLog } = useFleet();
    const [modal, setModal]   = useState(false);
    const [form, setForm]     = useState(EMPTY);
    const [search, setSearch] = useState('');
    const [deleteId, setDeleteId] = useState(null);

    /* ── Lookups ──────────────────────────────────────────── */
    const vehicleName = log => {
        if (log.vehicle?.name) return log.vehicle.name;
        const found = vehicles.find(v => sid(v) === sid(log.vehicle));
        return found?.name || `#${sid(log.vehicle).slice(-4) || '?'}`;
    };

    const tripRef = log => {
        if (!log.trip) return '—';
        if (log.trip?.reference) return log.trip.reference;
        const found = trips.find(t => sid(t) === sid(log.trip));
        return found?.reference || '—';
    };

    /* ── Aggregates ───────────────────────────────────────── */
    const totalCost   = fuelLogs.reduce((s, f) => s + (f.cost   || 0), 0);
    const totalLiters = fuelLogs.reduce((s, f) => s + (f.liters || 0), 0);
    const avgCostPerL = totalLiters > 0 ? totalCost / totalLiters : 0;
    const thisMonth   = fuelLogs.filter(f => {
        const d = new Date(f.date);
        const n = new Date();
        return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
    });
    const monthCost   = thisMonth.reduce((s, f) => s + (f.cost || 0), 0);

    const animLogs    = useCountUp(fuelLogs.length);
    const animLiters  = useCountUp(Math.round(totalLiters));
    const animCost    = useCountUp(Math.round(totalCost));
    const animMonth   = useCountUp(Math.round(monthCost));

    /* ── Per-vehicle stats ────────────────────────────────── */
    const perVehicle = vehicles
        .map(v => {
            const vid  = sid(v);
            const logs = fuelLogs.filter(f => sid(f.vehicle) === vid);
            return {
                ...v,
                totalCost:   logs.reduce((s, f) => s + (f.cost   || 0), 0),
                totalLiters: logs.reduce((s, f) => s + (f.liters || 0), 0),
            };
        })
        .filter(v => v.totalCost > 0)
        .sort((a, b) => b.totalCost - a.totalCost);

    /* ── Filtered logs ────────────────────────────────────── */
    const sortedLogs = [...fuelLogs]
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    const filtered = sortedLogs.filter(f => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            vehicleName(f).toLowerCase().includes(q) ||
            tripRef(f).toLowerCase().includes(q) ||
            String(f.date).includes(q)
        );
    });

    /* ── Live preview in form ─────────────────────────────── */
    const previewCostPerL = form.liters > 0 && form.cost > 0
        ? (Number(form.cost) / Number(form.liters)).toFixed(2)
        : null;

    /* ── Handlers ─────────────────────────────────────────── */
    const handleSave = async () => {
        if (!form.vehicleId) {
            showToast({ message: 'Select a vehicle first.', type: 'error' });
            return;
        }
        if (!form.liters || Number(form.liters) <= 0) {
            showToast({ message: 'Enter liters filled.', type: 'error' });
            return;
        }
        try {
            await addFuelLog({
                vehicle:  form.vehicleId,
                trip:     form.tripId || undefined,
                date:     form.date   || new Date().toISOString().slice(0, 10),
                liters:   Number(form.liters),
                cost:     Number(form.cost),
                odometer: Number(form.odometer) || undefined,
            });
            setModal(false);
            setForm(EMPTY);
            showToast({ message: 'Fuel entry added!', type: 'success' });
        } catch (e) {
            showToast({ message: e.message || 'Failed to save.', type: 'error' });
        }
    };

    const handleDelete = async id => {
        try {
            await deleteFuelLog(id);
            setDeleteId(null);
            showToast({ message: 'Entry deleted.', type: 'warning' });
        } catch (e) {
            showToast({ message: e.message, type: 'error' });
        }
    };

    return (
        <div className="fade-in">
            {/* ── Page Header ───────────────────────────────── */}
            <div className="page-header">
                <div>
                    <div className="page-title">Fuel &amp; Expense Logs</div>
                    <div className="page-sub">Operational cost tracking</div>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => { setForm(EMPTY); setModal(true); }}
                >
                    + Add Entry
                </button>
            </div>

            {/* ── KPI Cards ─────────────────────────────────── */}
            <div className="kpi-grid" style={{ marginBottom: 20 }}>
                <div className="kpi-card blue ff-card" style={{ animation: 'fadeInScale 0.35s ease 0ms both' }}>
                    <div className="kpi-icon">📋</div>
                    <div className="kpi-label">Total Entries</div>
                    <div className="kpi-value">{animLogs}</div>
                    <div className="kpi-sub">fuel log records</div>
                </div>
                <div className="kpi-card green ff-card" style={{ animation: 'fadeInScale 0.35s ease 60ms both' }}>
                    <div className="kpi-icon">⛽</div>
                    <div className="kpi-label">Total Liters</div>
                    <div className="kpi-value">{animLiters.toLocaleString()}<span style={{ fontSize: 16, fontWeight: 500 }}>L</span></div>
                    <div className="kpi-sub">
                        avg ${avgCostPerL.toFixed(2)}/L
                    </div>
                </div>
                <div className="kpi-card orange ff-card" style={{ animation: 'fadeInScale 0.35s ease 120ms both' }}>
                    <div className="kpi-icon">💸</div>
                    <div className="kpi-label">Total Spend</div>
                    <div className="kpi-value">${animCost.toLocaleString()}</div>
                    <div className="kpi-sub">all time</div>
                </div>
                <div className="kpi-card red ff-card" style={{ animation: 'fadeInScale 0.35s ease 180ms both' }}>
                    <div className="kpi-icon">📅</div>
                    <div className="kpi-label">This Month</div>
                    <div className="kpi-value">${animMonth.toLocaleString()}</div>
                    <div className="kpi-sub">{thisMonth.length} entries</div>
                </div>
            </div>

            {/* ── Per-vehicle breakdown ─────────────────────── */}
            {perVehicle.length > 0 && (
                <div className="table-wrapper ff-card" style={{ marginBottom: 20, padding: '16px 20px' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', marginBottom: 16,
                    }}>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>
                                ⛽ Fuel Cost by Vehicle
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                Share of total ${totalCost.toLocaleString()}
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
                            <VehicleBar key={sid(v)} v={v} totalCost={totalCost} rank={i} />
                        ))}
                    </div>
                </div>
            )}

            {/* ── All Entries Table ─────────────────────────── */}
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
                    <div className="search-wrap">
                        <span className="search-icon">🔍</span>
                        <input
                            className="search-input"
                            placeholder="Search vehicle, trip…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <table className="data-table ff-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Vehicle</th>
                            <th>Trip</th>
                            <th>Liters</th>
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
                                        <div className="empty-state-icon">⛽</div>
                                        <div className="empty-state-text">
                                            {search ? 'No entries match your search' : 'No fuel records yet'}
                                        </div>
                                        {!search && (
                                            <button
                                                className="btn btn-primary btn-sm"
                                                style={{ marginTop: 12 }}
                                                onClick={() => setModal(true)}
                                            >
                                                + Add First Entry
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ) : filtered.map(f => {
                            const liters    = f.liters || 0;
                            const cost      = f.cost   || 0;
                            const costPerL  = liters > 0 ? cost / liters : null;
                            const vName     = vehicleName(f);
                            const tRef      = tripRef(f);

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
                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{vName}</div>
                                    </td>
                                    <td>
                                        {tRef !== '—' ? (
                                            <code style={{
                                                fontFamily: 'var(--font-mono)', fontSize: 11,
                                                background: 'var(--accent-glow)',
                                                color: 'var(--accent)',
                                                padding: '2px 6px', borderRadius: 4,
                                            }}>
                                                {tRef}
                                            </code>
                                        ) : (
                                            <span className="text-muted">—</span>
                                        )}
                                    </td>
                                    <td>
                                        <span style={{ fontWeight: 600 }}>{liters.toFixed(1)}</span>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 3 }}>L</span>
                                    </td>
                                    <td>
                                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                            ${cost.toLocaleString()}
                                        </span>
                                    </td>
                                    <td>
                                        <EffBadge costPerL={costPerL} />
                                    </td>
                                    <td>
                                        {f.odometer ? (
                                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                                {Number(f.odometer).toLocaleString()}
                                                <span style={{ color: 'var(--text-muted)', marginLeft: 2 }}>km</span>
                                            </span>
                                        ) : <span className="text-muted">—</span>}
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-danger btn-sm"
                                            title="Delete entry"
                                            onClick={() => setDeleteId(sid(f))}
                                        >
                                            🗑
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
                                    {filtered.reduce((s, f) => s + (f.liters || 0), 0).toFixed(1)} L
                                </td>
                                <td style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--orange-t)' }}>
                                    ${filtered.reduce((s, f) => s + (f.cost || 0), 0).toLocaleString()}
                                </td>
                                <td colSpan={3} />
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {/* ── Delete Confirm Modal ──────────────────────── */}
            {deleteId && (
                <Modal
                    title="Delete Fuel Entry?"
                    onClose={() => setDeleteId(null)}
                    footer={<>
                        <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>
                            Cancel
                        </button>
                        <button className="btn btn-danger" onClick={() => handleDelete(deleteId)}>
                            Delete
                        </button>
                    </>}
                >
                    <div style={{
                        textAlign: 'center', padding: '16px 0',
                        color: 'var(--text-secondary)', fontSize: 14,
                    }}>
                        <div style={{ fontSize: 36, marginBottom: 12 }}>🗑</div>
                        This fuel entry will be permanently removed.
                        <br />
                        <span style={{ color: 'var(--red-t)', fontWeight: 600 }}>
                            This cannot be undone.
                        </span>
                    </div>
                </Modal>
            )}

            {/* ── Add Entry Modal ───────────────────────────── */}
            {modal && (
                <Modal
                    title="⛽ Add Fuel Entry"
                    onClose={() => { setModal(false); setForm(EMPTY); }}
                    footer={<>
                        <button className="btn btn-secondary" onClick={() => { setModal(false); setForm(EMPTY); }}>
                            Cancel
                        </button>
                        <button className="btn btn-primary" onClick={handleSave}>
                            Save Entry
                        </button>
                    </>}
                >
                    {/* Live preview banner */}
                    {previewCostPerL && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 14px', marginBottom: 16,
                            background: Number(previewCostPerL) < 1.5
                                ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                            border: `1px solid ${Number(previewCostPerL) < 1.5
                                ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                            borderRadius: 8,
                            animation: 'fadeIn 0.2s ease',
                        }}>
                            <span style={{ fontSize: 18 }}>
                                {Number(previewCostPerL) < 1.5 ? '✅' : '⚠'}
                            </span>
                            <div>
                                <div style={{
                                    fontSize: 13, fontWeight: 700,
                                    color: Number(previewCostPerL) < 1.5 ? 'var(--green-t)' : 'var(--red-t)',
                                }}>
                                    ${previewCostPerL}/L cost rate
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                    {Number(previewCostPerL) < 1.5 ? 'Efficient fill-up' : 'Above average rate'}
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
                                onChange={e => setForm({ ...form, vehicleId: e.target.value, tripId: '' })}
                            >
                                <option value="">Select vehicle…</option>
                                {vehicles.map(v => (
                                    <option key={sid(v)} value={sid(v)}>{v.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Related trip */}
                        <div className="form-group">
                            <label className="form-label">Related Trip
                                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 5, fontWeight: 400 }}>
                                    optional
                                </span>
                            </label>
                            <select
                                className="form-control"
                                value={form.tripId}
                                onChange={e => setForm({ ...form, tripId: e.target.value })}
                            >
                                <option value="">No trip</option>
                                {trips
                                    .filter(t => !form.vehicleId || sid(t.vehicle) === form.vehicleId)
                                    .map(t => (
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
                                onChange={e => setForm({ ...form, date: e.target.value })}
                            />
                        </div>

                        {/* Odometer */}
                        <div className="form-group">
                            <label className="form-label">Odometer (km)
                                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 5, fontWeight: 400 }}>
                                    optional
                                </span>
                            </label>
                            <input
                                className="form-control"
                                type="number" min="0"
                                placeholder="e.g. 45000"
                                value={form.odometer}
                                onChange={e => setForm({ ...form, odometer: e.target.value })}
                            />
                        </div>

                        {/* Liters */}
                        <div className="form-group">
                            <label className="form-label">Liters Filled *</label>
                            <input
                                className="form-control"
                                type="number" step="0.01" min="0"
                                placeholder="0.00 L"
                                value={form.liters}
                                onChange={e => setForm({ ...form, liters: e.target.value })}
                            />
                        </div>

                        {/* Cost */}
                        <div className="form-group">
                            <label className="form-label">Total Cost ($) *</label>
                            <input
                                className="form-control"
                                type="number" step="0.01" min="0"
                                placeholder="0.00"
                                value={form.cost}
                                onChange={e => setForm({ ...form, cost: e.target.value })}
                            />
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
