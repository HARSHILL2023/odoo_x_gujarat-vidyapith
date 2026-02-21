import { useState, useEffect, useRef } from 'react';
import { useFleet } from '../context/FleetContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import SkeletonTable from '../components/SkeletonTable';
import useCountUp from '../hooks/useCountUp';
import { showToast } from '../hooks/useToast';

const EMPTY = {
    name: '', license_number: '', license_expiry: '', license_category: 'van',
    status: 'off_duty', safety_score: 100, trips_completed: 0, phone: '', email: '',
};

const sid = val => String(val?._id ?? val ?? '');

/* ─── Avatar ──────────────────────────────────────────────── */
function DriverAvatar({ name, size = 36, status }) {
    const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
    const statusGlow = {
        on_duty:   'rgba(34,197,94,0.5)',
        off_duty:  'transparent',
        suspended: 'rgba(239,68,68,0.5)',
    }[status] ?? 'transparent';
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--accent), #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: size * 0.32, fontWeight: 700, color: '#fff',
            boxShadow: `0 0 0 2px var(--bg-card), 0 0 12px ${statusGlow}`,
            transition: 'box-shadow 0.3s ease',
            userSelect: 'none',
        }}>
            {initials}
        </div>
    );
}

/* ─── License Expiry Badge ────────────────────────────────── */
function LicenseBadge({ expiry }) {
    if (!expiry) return <span className="text-muted">—</span>;
    const daysLeft = Math.ceil((new Date(expiry) - Date.now()) / 86400000);
    if (daysLeft <= 0) return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'rgba(220,38,38,0.15)', color: 'var(--red-t)',
            border: '1px solid rgba(220,38,38,0.3)',
            borderRadius: 999, padding: '3px 10px',
            fontSize: 11, fontWeight: 700,
            animation: 'shake 0.4s ease both',
        }}>
            ⚠ EXPIRED
        </span>
    );
    if (daysLeft <= 30) return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'rgba(239,68,68,0.12)', color: 'var(--red-t)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 999, padding: '3px 10px',
            fontSize: 11, fontWeight: 600,
            animation: 'pulse-dot 1.8s ease-in-out infinite',
        }}>
            🔴 {daysLeft}d left
        </span>
    );
    if (daysLeft <= 60) return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'rgba(180,83,9,0.12)', color: 'var(--orange-t)',
            border: '1px solid rgba(180,83,9,0.25)',
            borderRadius: 999, padding: '3px 10px',
            fontSize: 11, fontWeight: 600,
        }}>
            ⚠ {daysLeft}d left
        </span>
    );
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'rgba(22,163,74,0.12)', color: 'var(--green-t)',
            border: '1px solid rgba(22,163,74,0.2)',
            borderRadius: 999, padding: '3px 10px',
            fontSize: 11, fontWeight: 600,
        }}>
            ✓ {new Date(expiry).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' })}
        </span>
    );
}

/* ─── Mini Score Bar ──────────────────────────────────────── */
function ScoreBar({ score }) {
    const color = score > 80 ? 'var(--green-t)' : score > 60 ? 'var(--orange-t)' : 'var(--red-t)';
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
                width: 60, height: 5, background: 'rgba(255,255,255,0.06)',
                borderRadius: 999, overflow: 'hidden', flexShrink: 0,
            }}>
                <div style={{
                    width: `${score}%`, height: '100%', borderRadius: 999,
                    background: color, boxShadow: `0 0 6px ${color}80`,
                    transition: 'width 0.8s ease',
                }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color, minWidth: 24 }}>{score}</span>
        </div>
    );
}

/* ─── SVG Score Ring ──────────────────────────────────────── */
function ScoreRing({ score }) {
    const ringRef = useRef(null);
    const r = 52;
    const circ = 2 * Math.PI * r;
    const animated = useCountUp(score, 900);
    const color = score > 80 ? '#22c55e' : score > 60 ? '#f59e0b' : '#ef4444';
    const glowColor = score > 80 ? 'rgba(34,197,94,0.35)' : score > 60 ? 'rgba(245,158,11,0.35)' : 'rgba(239,68,68,0.35)';
    const targetOffset = circ - (score / 100) * circ;

    useEffect(() => {
        if (!ringRef.current) return;
        ringRef.current.style.transition = 'none';
        ringRef.current.style.strokeDashoffset = circ;
        ringRef.current.getBoundingClientRect();
        ringRef.current.style.transition = 'stroke-dashoffset 900ms cubic-bezier(0.4,0,0.2,1)';
        ringRef.current.style.strokeDashoffset = targetOffset;
    }, [score, circ, targetOffset]);

    return (
        <svg width={140} height={140} viewBox="0 0 140 140">
            {/* Glow filter */}
            <defs>
                <filter id="score-glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            {/* Track */}
            <circle cx={70} cy={70} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={10} />
            {/* Score arc */}
            <circle
                ref={ringRef}
                cx={70} cy={70} r={r}
                fill="none" stroke={color} strokeWidth={10}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={circ}
                transform="rotate(-90 70 70)"
                filter="url(#score-glow)"
            />
            {/* Centre */}
            <text x={70} y={64} textAnchor="middle" fontSize={30} fontWeight={800}
                fontFamily="var(--font-heading)" fill="var(--text-primary)">
                {animated}
            </text>
            <text x={70} y={82} textAnchor="middle" fontSize={11} fill="var(--text-muted)">
                Safety Score
            </text>
        </svg>
    );
}

/* ─── Stat Pill ───────────────────────────────────────────── */
function StatPill({ icon, label, value, color = 'var(--text-secondary)' }) {
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 4, padding: '12px 18px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius)', flex: 1,
        }}>
            <span style={{ fontSize: 18 }}>{icon}</span>
            <span style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-heading)', color }}>{value}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
        </div>
    );
}

/* ─── Scorecard Modal ─────────────────────────────────────── */
function ScorecardModal({ driver, trips, onClose }) {
    const driverId = sid(driver);
    const driverTrips = trips.filter(t => sid(t.driver) === driverId);
    const completedCount = driverTrips.filter(t => t.state === 'completed').length;
    const cancelledCount = driverTrips.filter(t => t.state === 'cancelled').length;
    const completionRate = driverTrips.length
        ? Math.round((completedCount / driverTrips.length) * 100) : 0;
    const score = driver.safetyScore ?? driver.safety_score ?? 0;
    const scoreLabel = score > 80 ? '⭐ Excellent' : score > 60 ? '👍 Good' : '⚠ Needs Review';
    const scoreColor = score > 80 ? 'var(--green-t)' : score > 60 ? 'var(--orange-t)' : 'var(--red-t)';

    const lastTrips = [...driverTrips]
        .sort((a, b) => new Date(b.dateStart || b.date_start || 0) - new Date(a.dateStart || a.date_start || 0))
        .slice(0, 4);

    const AnimBar = ({ pct, color }) => {
        const ref = useRef(null);
        useEffect(() => {
            if (!ref.current) return;
            ref.current.style.width = '0%';
            requestAnimationFrame(() => requestAnimationFrame(() => {
                if (ref.current) ref.current.style.width = `${pct}%`;
            }));
        }, [pct]);
        return (
            <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 999, overflow: 'hidden' }}>
                <div ref={ref} style={{
                    height: '100%', width: '0%', borderRadius: 999,
                    background: color, boxShadow: `0 0 8px ${color}80`,
                    transition: 'width 800ms cubic-bezier(0.4,0,0.2,1)',
                }} />
            </div>
        );
    };

    return (
        <Modal
            title="Driver Scorecard"
            onClose={onClose}
            footer={<button className="btn btn-secondary" onClick={onClose}>Close</button>}
        >
            {/* Driver identity */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 16,
                marginBottom: 20, paddingBottom: 18,
                borderBottom: '1px solid var(--glass-border)',
            }}>
                <DriverAvatar name={driver.name} size={56} status={driver.status} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontFamily: 'var(--font-heading)', fontWeight: 700,
                        fontSize: 18, marginBottom: 6,
                    }}>
                        {driver.name}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <StatusBadge status={driver.status} />
                        <span style={{
                            fontSize: 11, fontWeight: 600,
                            background: 'var(--accent-glow)', color: 'var(--accent)',
                            border: '1px solid rgba(59,130,246,0.3)',
                            borderRadius: 999, padding: '2px 8px',
                        }}>
                            {(driver.license_category ?? driver.licenseCategory ?? '').toUpperCase()}
                        </span>
                        <span style={{
                            fontSize: 11, fontWeight: 600,
                            background: 'rgba(255,255,255,0.05)',
                            color: scoreColor,
                            borderRadius: 999, padding: '2px 8px',
                        }}>
                            {scoreLabel}
                        </span>
                    </div>
                </div>
            </div>

            {/* Score ring */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                <ScoreRing score={score} />
            </div>

            {/* Stats pills */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <StatPill icon="✅" label="Completed" value={completedCount} color="var(--green-t)" />
                <StatPill icon="🚛" label="Total Trips" value={driverTrips.length} color="var(--blue-t)" />
                <StatPill icon="❌" label="Cancelled" value={cancelledCount} color="var(--red-t)" />
            </div>

            {/* Completion Rate */}
            <div style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, fontSize: 13, fontWeight: 600 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Completion Rate</span>
                    <span style={{ color: completionRate > 80 ? 'var(--green-t)' : 'var(--orange-t)', fontWeight: 700 }}>
                        {completionRate}%
                    </span>
                </div>
                <AnimBar pct={completionRate} color={completionRate > 80 ? '#22c55e' : '#f59e0b'} />
            </div>

            {/* Safety Score breakdown */}
            <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, fontSize: 13, fontWeight: 600 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Safety Score</span>
                    <span style={{ color: scoreColor, fontWeight: 700 }}>{score}/100</span>
                </div>
                <AnimBar pct={score} color={score > 80 ? '#22c55e' : score > 60 ? '#f59e0b' : '#ef4444'} />
            </div>

            {/* Last trips */}
            <div style={{ marginBottom: 16 }}>
                <div style={{
                    fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 10,
                }}>
                    Recent Trips
                </div>
                {lastTrips.length === 0 ? (
                    <div style={{
                        fontSize: 13, color: 'var(--text-muted)',
                        textAlign: 'center', padding: '16px 0',
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: 8, border: '1px dashed var(--glass-border)',
                    }}>
                        No trips assigned yet
                    </div>
                ) : lastTrips.map(t => (
                    <div key={sid(t)} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 12px', borderRadius: 8, marginBottom: 6,
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--glass-border)',
                    }}>
                        <code style={{
                            fontFamily: 'var(--font-mono)', fontSize: 11,
                            color: 'var(--accent)', background: 'var(--accent-glow)',
                            padding: '2px 6px', borderRadius: 4, flexShrink: 0,
                        }}>
                            {t.reference}
                        </code>
                        <span style={{
                            flex: 1, fontSize: 12, color: 'var(--text-secondary)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                            {t.origin || '?'} → {t.destination || '?'}
                        </span>
                        <StatusBadge status={t.state} />
                    </div>
                ))}
            </div>

            {/* Contact */}
            {(driver.phone || driver.email) && (
                <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 10, padding: '12px 16px',
                }}>
                    <div style={{
                        fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                        textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8,
                    }}>
                        Contact
                    </div>
                    {driver.phone && (
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>📞</span>
                            <a href={`tel:${driver.phone}`} style={{ color: 'var(--accent)' }}>{driver.phone}</a>
                        </div>
                    )}
                    {driver.email && (
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>✉</span>
                            <a href={`mailto:${driver.email}`} style={{ color: 'var(--accent)' }}>{driver.email}</a>
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
}

/* ─── Main Component ──────────────────────────────────────── */
export default function Drivers() {
    const { drivers, trips, loading, addDriver, updateDriver, deleteDriver, isLicenseExpired } = useFleet();
    const [search, setSearch]         = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [modal, setModal]           = useState(null);
    const [form, setForm]             = useState(EMPTY);
    const [editId, setEditId]         = useState(null);
    const [scorecard, setScorecard]   = useState(null);

    /* ── KPI counts ──────────────────────────────────────── */
    const totalDrivers    = drivers.length;
    const onDutyCount     = drivers.filter(d => d.status === 'on_duty').length;
    const expiredCount    = drivers.filter(d => isLicenseExpired(d)).length;
    const suspendedCount  = drivers.filter(d => d.status === 'suspended').length;

    const animTotal     = useCountUp(totalDrivers);
    const animOnDuty    = useCountUp(onDutyCount);
    const animExpired   = useCountUp(expiredCount);
    const animSuspended = useCountUp(suspendedCount);

    const openAdd  = () => { setForm(EMPTY); setModal('add'); };
    const openEdit = d  => { setForm({ ...EMPTY, ...d }); setEditId(sid(d)); setModal('edit'); };
    const closeModal = () => { setModal(null); setEditId(null); };

    const handleSave = async () => {
        const data = {
            ...form,
            safety_score:    Number(form.safety_score),
            trips_completed: Number(form.trips_completed),
        };
        try {
            if (modal === 'add') {
                await addDriver(data);
                showToast({ message: 'Driver added!', type: 'success' });
            } else {
                await updateDriver(editId, data);
                showToast({ message: 'Driver updated!', type: 'success' });
            }
            closeModal();
        } catch (e) { showToast({ message: e.message, type: 'error' }); }
    };

    const handleDelete = async id => {
        if (!window.confirm('Remove this driver? This cannot be undone.')) return;
        try {
            await deleteDriver(id);
            showToast({ message: 'Driver removed.', type: 'warning' });
        } catch (e) { showToast({ message: e.message, type: 'error' }); }
    };

    const filtered = drivers.filter(d => {
        const q  = search.toLowerCase();
        const ms = !q || d.name?.toLowerCase().includes(q) || d.license_number?.toLowerCase().includes(q);
        const mf = filterStatus === 'all' || d.status === filterStatus;
        return ms && mf;
    });

    /* ── Reusable field builder ──────────────────────────── */
    const fld = (k, label, type = 'text', opts = null) => (
        <div className="form-group">
            <label className="form-label">{label}</label>
            {opts ? (
                <select
                    className="form-control"
                    value={form[k] ?? ''}
                    onChange={e => setForm({ ...form, [k]: e.target.value })}
                >
                    {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
            ) : (
                <input
                    className="form-control"
                    type={type}
                    value={form[k] ?? ''}
                    placeholder={type === 'number' ? '0' : ''}
                    onChange={e => setForm({ ...form, [k]: e.target.value })}
                />
            )}
        </div>
    );

    if (loading) return <SkeletonTable rows={6} cols={5} />;

    return (
        <div className="fade-in">
            {/* ── Page Header ───────────────────────────────── */}
            <div className="page-header">
                <div>
                    <div className="page-title">Driver Profiles</div>
                    <div className="page-sub">{totalDrivers} registered · {onDutyCount} on duty</div>
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

            {/* ── KPI Strip ─────────────────────────────────── */}
            <div className="kpi-grid" style={{ marginBottom: 20 }}>
                <div className="kpi-card blue ff-card" style={{ animation: 'fadeInScale 0.35s ease 0ms both' }}>
                    <div className="kpi-icon">👤</div>
                    <div className="kpi-label">Total Drivers</div>
                    <div className="kpi-value">{animTotal}</div>
                    <div className="kpi-sub">registered profiles</div>
                </div>
                <div className="kpi-card green ff-card" style={{ animation: 'fadeInScale 0.35s ease 60ms both' }}>
                    <div className="kpi-icon">🟢</div>
                    <div className="kpi-label">On Duty</div>
                    <div className="kpi-value">{animOnDuty}</div>
                    <div className="kpi-sub">currently active</div>
                </div>
                <div className="kpi-card red ff-card" style={{ animation: 'fadeInScale 0.35s ease 120ms both' }}>
                    <div className="kpi-icon">⚠</div>
                    <div className="kpi-label">Expired Licenses</div>
                    <div className="kpi-value">{animExpired}</div>
                    <div className="kpi-sub">action required</div>
                </div>
                <div className="kpi-card orange ff-card" style={{ animation: 'fadeInScale 0.35s ease 180ms both' }}>
                    <div className="kpi-icon">🚫</div>
                    <div className="kpi-label">Suspended</div>
                    <div className="kpi-value">{animSuspended}</div>
                    <div className="kpi-sub">not available</div>
                </div>
            </div>

            {/* ── Table ─────────────────────────────────────── */}
            <div className="table-wrapper">
                <div className="table-toolbar">
                    <span className="table-toolbar-title">
                        Drivers
                        <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>
                            ({filtered.length})
                        </span>
                    </span>
                    <div className="search-wrap">
                        <span className="search-icon">🔍</span>
                        <input
                            className="search-input"
                            placeholder="Search name or license…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <table className="data-table ff-table">
                    <thead>
                        <tr>
                            <th>Driver</th>
                            <th>License #</th>
                            <th>Category</th>
                            <th>Expiry</th>
                            <th>Safety</th>
                            <th style={{ textAlign: 'center' }}>Trips</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={8}>
                                    <div className="empty-state">
                                        <div className="empty-state-icon">👤</div>
                                        <div className="empty-state-text">
                                            {search || filterStatus !== 'all'
                                                ? 'No drivers match your filters'
                                                : 'No drivers added yet'}
                                        </div>
                                        {!search && filterStatus === 'all' && (
                                            <button
                                                className="btn btn-primary btn-sm"
                                                style={{ marginTop: 12 }}
                                                onClick={openAdd}
                                            >
                                                + Add First Driver
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ) : filtered.map(d => {
                            const expired = isLicenseExpired(d);
                            const score   = d.safety_score ?? d.safetyScore ?? 0;
                            return (
                                <tr
                                    key={sid(d)}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => setScorecard(d)}
                                    title="Click to view scorecard"
                                >
                                    {/* Driver identity */}
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <DriverAvatar name={d.name} size={34} status={d.status} />
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: 13 }}>{d.name}</div>
                                                {d.phone && (
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                        {d.phone}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    <td>
                                        <code style={{
                                            fontFamily: 'var(--font-mono)', fontSize: 12,
                                            background: 'rgba(255,255,255,0.04)',
                                            padding: '2px 7px', borderRadius: 4,
                                            color: 'var(--text-secondary)',
                                        }}>
                                            {d.license_number || '—'}
                                        </code>
                                    </td>

                                    <td>
                                        <span className="tag" style={{ textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                            {d.license_category}
                                        </span>
                                    </td>

                                    <td><LicenseBadge expiry={d.license_expiry} /></td>

                                    <td><ScoreBar score={score} /></td>

                                    <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                        {d.trips_completed ?? 0}
                                    </td>

                                    <td onClick={e => e.stopPropagation()}>
                                        <StatusBadge status={expired ? 'expired' : d.status} />
                                    </td>

                                    <td onClick={e => e.stopPropagation()}>
                                        <div className="actions">
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => openEdit(d)}
                                            >
                                                ✏ Edit
                                            </button>
                                            <button
                                                className="btn btn-danger btn-sm"
                                                onClick={() => handleDelete(sid(d))}
                                            >
                                                🗑
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* ── Scorecard Modal ───────────────────────────── */}
            {scorecard && (
                <ScorecardModal
                    driver={scorecard}
                    trips={trips}
                    onClose={() => setScorecard(null)}
                />
            )}

            {/* ── Add / Edit Modal ──────────────────────────── */}
            {modal && (
                <Modal
                    title={modal === 'add' ? '+ Add Driver Profile' : '✏ Edit Driver'}
                    onClose={closeModal}
                    footer={<>
                        <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSave}>
                            {modal === 'add' ? 'Add Driver' : 'Save Changes'}
                        </button>
                    </>}
                >
                    <div className="form-grid">
                        <div className="form-group form-grid-full">
                            <label className="form-label">Full Name</label>
                            <input
                                className="form-control"
                                placeholder="e.g. Rajan Sharma"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                            />
                        </div>

                        {fld('license_number', 'License Number')}
                        {fld('license_expiry', 'License Expiry', 'date')}
                        {fld('license_category', 'License Category', 'text', [
                            { v: 'van',   l: 'Van'   },
                            { v: 'truck', l: 'Truck' },
                            { v: 'bike',  l: 'Bike'  },
                        ])}
                        {fld('status', 'Status', 'text', [
                            { v: 'on_duty',   l: 'On Duty'   },
                            { v: 'off_duty',  l: 'Off Duty'  },
                            { v: 'suspended', l: 'Suspended' },
                        ])}

                        <div className="form-group">
                            <label className="form-label">
                                Safety Score (0–100)
                                <span style={{
                                    marginLeft: 8, fontSize: 11,
                                    color: Number(form.safety_score) > 80
                                        ? 'var(--green-t)'
                                        : Number(form.safety_score) > 60
                                            ? 'var(--orange-t)' : 'var(--red-t)',
                                    fontWeight: 600,
                                }}>
                                    {form.safety_score}
                                </span>
                            </label>
                            <input
                                className="form-control"
                                type="range" min={0} max={100}
                                value={form.safety_score}
                                onChange={e => setForm({ ...form, safety_score: e.target.value })}
                                style={{ padding: '4px 0', cursor: 'pointer' }}
                            />
                        </div>

                        {fld('phone', 'Phone', 'tel')}
                        {fld('email', 'Email', 'email')}
                    </div>
                </Modal>
            )}
        </div>
    );
}
