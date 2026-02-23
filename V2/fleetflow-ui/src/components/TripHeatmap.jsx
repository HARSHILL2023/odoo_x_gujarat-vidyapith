import { useMemo, useState } from 'react';
import { useFleet } from '../context/FleetContext';

/* ─── Constants ───────────────────────────────────────────── */
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKS = 26; // 6-month view — use 52 for full year

/* ─── Helpers ─────────────────────────────────────────────── */
function toDateKey(date) {
    return date.toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

function buildGrid(weeks) {
    // Anchor: start from `weeks` Sundays ago
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const anchor = new Date(today);
    anchor.setDate(anchor.getDate() - (anchor.getDay()) - (weeks - 1) * 7);

    const cells = [];
    for (let w = 0; w < weeks; w++) {
        const week = [];
        for (let d = 0; d < 7; d++) {
            const date = new Date(anchor);
            date.setDate(anchor.getDate() + w * 7 + d);
            week.push({
                date,
                key: toDateKey(date),
                future: date > today,
            });
        }
        cells.push(week);
    }
    return { cells, anchor };
}

function getColor(count, max, accent) {
    if (count === 0) return 'var(--bg-hover)';
    const intensity = Math.min(1, count / Math.max(max, 1));
    // 4-stop gradient
    const stops = [0.15, 0.35, 0.65, 1.0];
    const idx = stops.findIndex(hi => intensity <= hi);
    const alpha = [0.25, 0.45, 0.70, 0.92][Math.max(0, idx)];

    // If accent is a CSS variable like 'var(--accent)', return it with opacity
    if (accent.startsWith('var(')) {
        return `color-mix(in srgb, ${accent}, transparent ${Math.round((1 - alpha) * 100)}%)`;
    }

    // Fallback for hex
    return `${accent}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
}

function monthLabels(cells) {
    const labels = [];
    let lastMonth = -1;
    cells.forEach((week, wi) => {
        const m = week[0].date.getMonth();
        if (m !== lastMonth) {
            labels.push({ wi, label: MONTHS[m] });
            lastMonth = m;
        }
    });
    return labels;
}

/* ─── Tooltip ─────────────────────────────────────────────── */
function CellTooltip({ cell, count, x, y }) {
    if (!cell) return null;
    const fmt = cell.date.toLocaleDateString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
    return (
        <div style={{
            position: 'fixed',
            left: x + 12, top: y - 10,
            background: 'var(--bg-card)',
            border: '1px solid var(--glass-border)',
            borderRadius: 8,
            padding: '7px 11px',
            fontSize: 12,
            pointerEvents: 'none',
            zIndex: 9999,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            whiteSpace: 'nowrap',
        }}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                {count > 0 ? `${count} trip${count !== 1 ? 's' : ''}` : 'No trips'}
            </div>
            <div style={{ color: 'var(--text-muted)' }}>{fmt}</div>
        </div>
    );
}

/* ─── Main Component ──────────────────────────────────────── */
export default function TripHeatmap({ accent = '#3b82f6', weeks = WEEKS }) {
    const { trips } = useFleet();
    const [tooltip, setTooltip] = useState(null); // { cell, count, x, y }

    /* ── Build date → trip count map ─────────────────────── */
    const countMap = useMemo(() => {
        const map = {};
        trips.forEach(t => {
            const raw = t.dateStart || t.date_start || t.createdAt;
            if (!raw) return;
            const key = toDateKey(new Date(raw));
            map[key] = (map[key] ?? 0) + 1;
        });
        return map;
    }, [trips]);

    const maxCount = useMemo(
        () => Math.max(1, ...Object.values(countMap)),
        [countMap]
    );

    /* ── Grid ─────────────────────────────────────────────── */
    const { cells } = useMemo(() => buildGrid(weeks), [weeks]);
    const mLabels = useMemo(() => monthLabels(cells), [cells]);
    const totalTrips = useMemo(
        () => Object.values(countMap).reduce((a, b) => a + b, 0),
        [countMap]
    );

    const CELL = 13; // px
    const GAP = 3;  // px
    const unit = CELL + GAP;

    return (
        <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--glass-border)',
            borderRadius: 14,
            padding: '20px 22px',
        }}>
            {/* ── Header ───────────────────────────────────── */}
            <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', marginBottom: 16,
            }}>
                <div>
                    <div style={{
                        fontSize: 14, fontWeight: 700,
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-heading)',
                    }}>
                        Trip Activity
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {totalTrips} trip{totalTrips !== 1 ? 's' : ''} in the last {weeks} weeks
                    </div>
                </div>
                {/* Legend */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 10, color: 'var(--text-muted)',
                }}>
                    <span>Less</span>
                    {[0, 0.2, 0.45, 0.70, 0.92].map((alpha, i) => {
                        const bg = i === 0
                            ? 'var(--bg-hover)'
                            : (accent.startsWith('var(')
                                ? `color-mix(in srgb, ${accent}, transparent ${Math.round((1 - alpha) * 100)}%)`
                                : `${accent}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`);
                        return (
                            <div
                                key={i}
                                style={{
                                    width: 11, height: 11, borderRadius: 3,
                                    background: bg,
                                }}
                            />
                        );
                    })}
                    <span>More</span>
                </div>
            </div>

            {/* ── Grid ─────────────────────────────────────── */}
            <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
                <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 0 }}>

                    {/* Month labels row */}
                    <div style={{
                        position: 'relative',
                        height: 16,
                        marginLeft: 28,
                        marginBottom: 4,
                        width: weeks * unit,
                    }}>
                        {mLabels.map(({ wi, label }) => (
                            <span key={wi} style={{
                                position: 'absolute',
                                left: wi * unit,
                                fontSize: 10,
                                color: 'var(--text-muted)',
                                fontFamily: 'var(--font-mono)',
                                userSelect: 'none',
                            }}>
                                {label}
                            </span>
                        ))}
                    </div>

                    {/* Day labels + cell grid */}
                    <div style={{ display: 'flex', gap: 0 }}>

                        {/* Day-of-week labels */}
                        <div style={{
                            display: 'flex', flexDirection: 'column',
                            gap: GAP, marginRight: 6,
                        }}>
                            {DAYS.map((day, di) => (
                                <div key={day} style={{
                                    height: CELL,
                                    fontSize: 9,
                                    color: di % 2 === 1
                                        ? 'var(--text-muted)'
                                        : 'transparent', // only show alternating labels
                                    lineHeight: `${CELL}px`,
                                    userSelect: 'none',
                                    fontFamily: 'var(--font-mono)',
                                    width: 22,
                                    textAlign: 'right',
                                }}>
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Week columns */}
                        <div style={{
                            display: 'flex',
                            gap: GAP,
                        }}>
                            {cells.map((week, wi) => (
                                <div
                                    key={wi}
                                    style={{ display: 'flex', flexDirection: 'column', gap: GAP }}
                                >
                                    {week.map(cell => {
                                        const count = countMap[cell.key] ?? 0;
                                        const bg = cell.future
                                            ? 'transparent'
                                            : getColor(count, maxCount, accent);
                                        return (
                                            <div
                                                key={cell.key}
                                                style={{
                                                    width: CELL, height: CELL,
                                                    borderRadius: 3,
                                                    background: bg,
                                                    cursor: cell.future ? 'default' : 'pointer',
                                                    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                                                    border: cell.future
                                                        ? 'none'
                                                        : `1px solid rgba(255,255,255,0.04)`,
                                                }}
                                                onMouseEnter={e => {
                                                    if (cell.future) return;
                                                    e.currentTarget.style.transform = 'scale(1.35)';
                                                    e.currentTarget.style.boxShadow = `0 0 8px ${accent.startsWith('var(') ? 'var(--accent-glow)' : accent + '80'}`;
                                                    e.currentTarget.style.zIndex = '10';
                                                    setTooltip({
                                                        cell, count,
                                                        x: e.clientX,
                                                        y: e.clientY,
                                                    });
                                                }}
                                                onMouseMove={e => {
                                                    if (tooltip)
                                                        setTooltip(t => ({ ...t, x: e.clientX, y: e.clientY }));
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.transform = 'scale(1)';
                                                    e.currentTarget.style.boxShadow = 'none';
                                                    e.currentTarget.style.zIndex = '0';
                                                    setTooltip(null);
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Portal-style tooltip */}
            {tooltip && (
                <CellTooltip
                    cell={tooltip.cell}
                    count={tooltip.count}
                    x={tooltip.x}
                    y={tooltip.y}
                />
            )}
        </div>
    );
}
