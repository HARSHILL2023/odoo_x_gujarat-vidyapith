import { useEffect, memo } from 'react';

/* ─── Constants ───────────────────────────────────────────── */
const STYLE_ID = 'ff-skeleton-styles';

/* ─── CSS ─────────────────────────────────────────────────── */
const CSS = `
/* ── Keyframes ─────────────────────────────────────────────── */
@keyframes ff-sk-shimmer {
    from { background-position: 200% 0; }
    to   { background-position: -200% 0; }
}
@keyframes ff-sk-pulse {
    0%, 100% { opacity: 1;   }
    50%       { opacity: 0.38; }
}
@keyframes ff-sk-wave {
    0%   { transform: translateX(-110%); }
    100% { transform: translateX(110%);  }
}

/* ── Base bone ─────────────────────────────────────────────── */
.ff-sk {
    display: block;
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
    border-radius: var(--ff-sk-radius, var(--radius-sm, 5px));
    background: var(--ff-sk-base, rgba(255,255,255,0.06));
}

/* ── Shimmer ───────────────────────────────────────────────── */
.ff-sk-shimmer {
    background: linear-gradient(
        90deg,
        var(--ff-sk-base,      rgba(255,255,255,0.055)) 0%,
        var(--ff-sk-highlight, rgba(255,255,255,0.115)) 50%,
        var(--ff-sk-base,      rgba(255,255,255,0.055)) 100%
    );
    background-size: 200% 100%;
    animation: ff-sk-shimmer var(--ff-sk-speed, 1.4s) ease-in-out infinite;
}

/* ── Pulse ─────────────────────────────────────────────────── */
.ff-sk-pulse {
    animation: ff-sk-pulse var(--ff-sk-speed, 1.7s) ease-in-out infinite;
}

/* ── Wave ──────────────────────────────────────────────────── */
.ff-sk-wave {
    background: var(--ff-sk-base, rgba(255,255,255,0.06));
}
.ff-sk-wave::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(
        90deg,
        transparent 0%,
        var(--ff-sk-highlight, rgba(255,255,255,0.11)) 50%,
        transparent 100%
    );
    animation: ff-sk-wave var(--ff-sk-speed, 1.6s) linear infinite;
}

/* ── Shape modifiers ───────────────────────────────────────── */
.ff-sk-circle  { border-radius: 50% !important; }
.ff-sk-rounded { border-radius: 999px !important; }

/* ── Multi-row: last row shorter (realistic text shape) ────── */
.ff-sk-rows { display: flex; flex-direction: column; }
.ff-sk-rows > .ff-sk-last { width: var(--ff-sk-last-width, 58%) !important; }

/* ── Compound: avatar row ──────────────────────────────────── */
.ff-sk-c-avatar-row { display: flex; align-items: center; }
.ff-sk-c-avatar-lines { flex: 1; display: flex; flex-direction: column; }

/* ── Compound: card shell ──────────────────────────────────── */
.ff-sk-c-card {
    display: flex; flex-direction: column;
    padding: 16px; border-radius: 12px;
    border: 1px solid var(--glass-border, rgba(255,255,255,0.06));
    background: var(--bg-card, rgba(255,255,255,0.02));
}

/* ── Compound: table row ───────────────────────────────────── */
.ff-sk-c-trow {
    display: flex; align-items: center;
    border-radius: 8px;
    padding: 0 12px;
    background: rgba(255,255,255,0.02);
}

/* ── Reduced motion ────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
    .ff-sk-shimmer,
    .ff-sk-pulse    { animation: none !important;
                      background: var(--ff-sk-base, rgba(255,255,255,0.06)) !important; }
    .ff-sk-wave::after { display: none !important; }
}
`;

/* ─── Style injection ─────────────────────────────────────── */
function injectStyles() {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
}

/* ─── Shared hook (avoids duplicate calls in compounds) ────── */
function useSkeletonStyles() {
    useEffect(injectStyles, []);
}

/* ─── Base Skeleton ───────────────────────────────────────── */
/**
 * Props:
 *   width           CSS string                          default '100%'
 *   height          CSS string                          default '16px'
 *   borderRadius    CSS string                          override
 *   shape           'rect' | 'circle' | 'rounded'      default 'rect'
 *   variant         'shimmer' | 'pulse' | 'wave'       default 'shimmer'
 *   count           stacked rows                        default 1
 *   gap             px gap between rows                 default 8
 *   lastWidth       width of last row (realism)         default '58%'
 *   speed           animation duration string           default '1.4s'
 *   stagger         ms delay offset per row             default 0
 *   baseColor       override base CSS color
 *   highlightColor  override highlight CSS color
 *   className       extra class on each bone
 *   style           extra inline styles on each bone
 */
function Skeleton({
    width = '100%',
    height = '16px',
    borderRadius,
    shape = 'rect',
    variant = 'shimmer',
    count = 1,
    gap = 8,
    lastWidth = '58%',
    speed = '1.4s',
    stagger = 0,
    baseColor,
    highlightColor,
    className = '',
    style = {},
}) {
    useSkeletonStyles();

    const shapeClass = shape === 'circle' ? 'ff-sk-circle'
        : shape === 'rounded' ? 'ff-sk-rounded'
            : '';

    const cls = `ff-sk ff-sk-${variant} ${shapeClass} ${className}`.trim();

    /* CSS variable overrides passed inline */
    const cssVars = {
        '--ff-sk-speed': speed,
        ...(baseColor ? { '--ff-sk-base': baseColor } : {}),
        ...(highlightColor ? { '--ff-sk-highlight': highlightColor } : {}),
    };

    const boneStyle = {
        width, height,
        ...(borderRadius ? { borderRadius } : {}),
        ...cssVars,
        ...style,
    };

    /* ── Single bone ──────────────────────────────────────── */
    if (count === 1) {
        return <span className={cls} style={boneStyle} aria-hidden="true" />;
    }

    /* ── Multi-row ────────────────────────────────────────── */
    return (
        <div
            className="ff-sk-rows"
            style={{ gap, '--ff-sk-last-width': lastWidth }}
            aria-hidden="true"
        >
            {Array.from({ length: count }, (_, i) => (
                <span
                    key={i}
                    className={`${cls} ${i === count - 1 ? 'ff-sk-last' : ''}`.trim()}
                    style={{
                        ...boneStyle,
                        ...(stagger ? { animationDelay: `${i * stagger}ms` } : {}),
                    }}
                />
            ))}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   COMPOUND COMPONENTS
   ═══════════════════════════════════════════════════════════ */

/* ─── Skeleton.AvatarRow ──────────────────────────────────── */
/**
 * Circular avatar + text lines side-by-side.
 *   size        avatar diameter px         (default 38)
 *   lines       number of text lines       (default 2)
 *   lineHeights array of CSS heights       (default ['14px','11px'])
 *   lineWidths  array of CSS widths        (default ['70%','42%'])
 *   gap         gap between avatar & lines (default 10)
 *   lineGap     gap between lines          (default 7)
 *   variant                                (default 'shimmer')
 */
Skeleton.AvatarRow = function SkeletonAvatarRow({
    size = 38,
    lines = 2,
    lineHeights = ['14px', '11px'],
    lineWidths = ['70%', '42%'],
    gap = 10,
    lineGap = 7,
    variant = 'shimmer',
}) {
    useSkeletonStyles();
    return (
        <div className="ff-sk-c-avatar-row" style={{ gap }} aria-hidden="true">
            <span
                className={`ff-sk ff-sk-${variant} ff-sk-circle`}
                style={{ width: size, height: size, flexShrink: 0 }}
            />
            <div className="ff-sk-c-avatar-lines" style={{ gap: lineGap }}>
                {Array.from({ length: lines }, (_, i) => (
                    <span
                        key={i}
                        className={`ff-sk ff-sk-${variant}`}
                        style={{ height: lineHeights[i] ?? '12px', width: lineWidths[i] ?? '60%' }}
                    />
                ))}
            </div>
        </div>
    );
};

/* ─── Skeleton.Card ───────────────────────────────────────── */
/**
 * Card shell — optional thumbnail + header + body lines.
 *   showThumb    show image thumbnail     (default true)
 *   thumbHeight  CSS height               (default '120px')
 *   headerHeight CSS height               (default '16px')
 *   lines        body line count          (default 3)
 *   lineHeight   CSS height               (default '12px')
 *   gap                                   (default 10)
 *   variant                               (default 'shimmer')
 */
Skeleton.Card = function SkeletonCard({
    showThumb = true,
    thumbHeight = '120px',
    headerHeight = '16px',
    lines = 3,
    lineHeight = '12px',
    gap = 10,
    variant = 'shimmer',
}) {
    useSkeletonStyles();
    return (
        <div className="ff-sk-c-card" style={{ gap }} aria-hidden="true">
            {showThumb && (
                <span
                    className={`ff-sk ff-sk-${variant}`}
                    style={{ width: '100%', height: thumbHeight, borderRadius: 8 }}
                />
            )}
            <span
                className={`ff-sk ff-sk-${variant}`}
                style={{ width: '72%', height: headerHeight }}
            />
            {Array.from({ length: lines }, (_, i) => (
                <span
                    key={i}
                    className={`ff-sk ff-sk-${variant}`}
                    style={{
                        width: i === lines - 1 ? '52%' : '100%',
                        height: lineHeight,
                    }}
                />
            ))}
        </div>
    );
};

/* ─── Skeleton.Table ──────────────────────────────────────── */
/**
 * Table — header row + data rows, each with N column bones.
 *   rows       data row count              (default 5)
 *   cols       column count                (default 4)
 *   rowHeight  CSS height of each row      (default '40px')
 *   colGap     px gap between columns      (default 12)
 *   rowGap     px gap between rows         (default 6)
 *   stagger    ms delay per row            (default 35)
 *   variant                                (default 'shimmer')
 */
Skeleton.Table = function SkeletonTable({
    rows = 5,
    cols = 4,
    rowHeight = '40px',
    colGap = 12,
    rowGap = 6,
    stagger = 35,
    variant = 'shimmer',
}) {
    useSkeletonStyles();

    /* Rough column width distribution */
    const colW = ['32%', '24%', '24%', '20%'];

    return (
        <div
            style={{ display: 'flex', flexDirection: 'column', gap: rowGap }}
            aria-hidden="true"
        >
            {/* Header */}
            <div style={{ display: 'flex', gap: colGap, padding: '0 12px' }}>
                {Array.from({ length: cols }, (_, c) => (
                    <span
                        key={c}
                        className={`ff-sk ff-sk-${variant}`}
                        style={{ flex: 1, height: '10px', width: colW[c] ?? '25%', opacity: 0.5 }}
                    />
                ))}
            </div>

            {/* Data rows */}
            {Array.from({ length: rows }, (_, r) => (
                <div
                    key={r}
                    className="ff-sk-c-trow"
                    style={{ gap: colGap, height: rowHeight }}
                >
                    {Array.from({ length: cols }, (_, c) => (
                        <span
                            key={c}
                            className={`ff-sk ff-sk-${variant}`}
                            style={{
                                flex: 1,
                                height: '13px',
                                width: colW[c] ?? '25%',
                                animationDelay: `${r * stagger + c * 15}ms`,
                            }}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
};

/* ─── Skeleton.Stat ───────────────────────────────────────── */
/**
 * Dashboard KPI stat card — icon + metric + label + trend.
 *   variant  (default 'shimmer')
 */
Skeleton.Stat = function SkeletonStat({ variant = 'shimmer' }) {
    useSkeletonStyles();
    return (
        <div className="ff-sk-c-card" style={{ gap: 10, minWidth: 140 }} aria-hidden="true">
            {/* Icon + label row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className={`ff-sk ff-sk-${variant}`} style={{ width: '48%', height: '10px' }} />
                <span className={`ff-sk ff-sk-${variant} ff-sk-circle`} style={{ width: 28, height: 28 }} />
            </div>
            {/* Big metric */}
            <span className={`ff-sk ff-sk-${variant}`} style={{ width: '54%', height: '30px' }} />
            {/* Trend line */}
            <span className={`ff-sk ff-sk-${variant} ff-sk-rounded`} style={{ width: '38%', height: '18px' }} />
        </div>
    );
};

/* ─── Skeleton.TripCard ───────────────────────────────────── */
/**
 * Kanban trip card — reference + status chip + origin/dest + tags.
 *   variant  (default 'shimmer')
 */
Skeleton.TripCard = function SkeletonTripCard({ variant = 'shimmer' }) {
    useSkeletonStyles();
    return (
        <div className="ff-sk-c-card" style={{ gap: 9 }} aria-hidden="true">
            {/* Reference + status */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span className={`ff-sk ff-sk-${variant}`} style={{ width: '48%', height: '13px' }} />
                <span className={`ff-sk ff-sk-${variant} ff-sk-rounded`} style={{ width: '22%', height: '20px' }} />
            </div>
            {/* Origin row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`ff-sk ff-sk-${variant} ff-sk-circle`} style={{ width: 22, height: 22 }} />
                <span className={`ff-sk ff-sk-${variant}`} style={{ width: '62%', height: '11px' }} />
            </div>
            {/* Destination row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`ff-sk ff-sk-${variant} ff-sk-circle`} style={{ width: 22, height: 22 }} />
                <span className={`ff-sk ff-sk-${variant}`} style={{ width: '50%', height: '11px' }} />
            </div>
            {/* Tag chips */}
            <div style={{ display: 'flex', gap: 6 }}>
                <span className={`ff-sk ff-sk-${variant} ff-sk-rounded`} style={{ width: '28%', height: '18px' }} />
                <span className={`ff-sk ff-sk-${variant} ff-sk-rounded`} style={{ width: '20%', height: '18px' }} />
                <span className={`ff-sk ff-sk-${variant} ff-sk-rounded`} style={{ width: '24%', height: '18px' }} />
            </div>
        </div>
    );
};

Skeleton.displayName = 'Skeleton';
export default memo(Skeleton);
