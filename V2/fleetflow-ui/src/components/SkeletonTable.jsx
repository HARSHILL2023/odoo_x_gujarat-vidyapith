import Skeleton from './Skeleton';

/* ─── Column type width map ───────────────────────────────── */
const TYPE_WIDTH = {
    avatar:  null,   // handled separately — renders AvatarRow
    text:    '72%',
    number:  '48%',
    badge:   '64px',
    date:    '80px',
    action:  '32px',
    id:      '56px',
};

/* ─── Default col config by index (fallback) ─────────────── */
function defaultCol(i, total) {
    if (i === 0)          return { type: 'text',   width: '75%' };
    if (i === total - 1)  return { type: 'action', width: '32px' };
    if (i === 1)          return { type: 'badge',  width: '64px' };
    if (i % 3 === 0)      return { type: 'number', width: '48%' };
    return                       { type: 'text',   width: '65%' };
}

/* ─── Inline styles (no CSS injection needed — uses Skeleton's) */
const S = {
    wrapper: {
        display: 'flex', flexDirection: 'column',
        borderRadius: 12,
        border: '1px solid var(--glass-border)',
        background: 'var(--bg-card)',
        overflow: 'hidden',
    },

    /* Toolbar */
    toolbar: {
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px',
        borderBottom: '1px solid var(--glass-border)',
        background: 'rgba(255,255,255,0.012)',
        flexShrink: 0,
    },

    /* Header */
    header: (cols, density) => ({
        display: 'grid',
        gridTemplateColumns: cols,
        padding: density === 'compact'      ? '7px 16px'
               : density === 'comfortable' ? '14px 16px'
               : '10px 16px',
        borderBottom: '1px solid var(--glass-border)',
        background: 'rgba(255,255,255,0.018)',
        alignItems: 'center',
    }),

    /* Body row */
    row: (cols, density, isLast) => ({
        display: 'grid',
        gridTemplateColumns: cols,
        padding: density === 'compact'      ? '7px 16px'
               : density === 'comfortable' ? '15px 16px'
               : '11px 16px',
        borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)',
        alignItems: 'center',
        transition: 'background 0.1s ease',
    }),

    /* Cell wrapper — centers content within the grid cell */
    cell: { display: 'flex', alignItems: 'center' },
};

/**
 * SkeletonTable — realistic table shimmer placeholder.
 *
 * Props:
 *   rows          body row count                          (default 5)
 *   cols          simple column count — overridden by colDefs  (default 4)
 *   colDefs       array of { type, width, label } objects (optional)
 *                 type: 'text'|'number'|'badge'|'date'|'action'|'id'|'avatar'
 *   density       'compact' | 'default' | 'comfortable'  (default 'default')
 *   variant       'shimmer' | 'pulse' | 'wave'           (default 'shimmer')
 *   stagger       ms delay per row                        (default 40)
 *   showToolbar   render the top toolbar                  (default true)
 *   toolbarSearch show search bar in toolbar              (default true)
 *   toolbarBtns   number of right-side action buttons     (default 2)
 *   showHeader    render the column header row            (default true)
 *   avatarCol     index of column to render as avatar+text (default -1 = off)
 *   className     extra class on the wrapper
 */
export default function SkeletonTable({
    rows          = 5,
    cols          = 4,
    colDefs,
    density       = 'default',
    variant       = 'shimmer',
    stagger       = 40,
    showToolbar   = true,
    toolbarSearch = true,
    toolbarBtns   = 2,
    showHeader    = true,
    avatarCol     = 0,
    className     = '',
}) {
    /* ── Resolve column definitions ───────────────────────── */
    const columns = colDefs
        ? colDefs
        : Array.from({ length: cols }, (_, i) => defaultCol(i, cols));

    const colCount  = columns.length;

    /* ── Build CSS grid template from column types ────────── */
    const gridTemplate = columns.map((col, i) => {
        const w = col.width ?? TYPE_WIDTH[col.type] ?? '1fr';
        // If type is 'action', give it a fixed narrow column
        if (col.type === 'action') return '40px';
        // If it's a percentage or pixel, use auto; else 1fr
        if (w === '1fr') return '1fr';
        return 'auto';
    }).join(' ');

    /* Simpler approach — use minmax for text, auto for fixed */
    const gridCols = columns.map(col => {
        if (col.type === 'action') return '40px';
        if (col.type === 'id')     return '60px';
        if (col.type === 'badge')  return '80px';
        if (col.type === 'date')   return '90px';
        if (col.type === 'number') return '70px';
        if (col.type === 'avatar') return '1fr';
        return '1fr';
    }).join(' ');

    /* ── Cell renderer per type ───────────────────────────── */
    function renderCell(col, colIdx, rowIdx) {
        const delay = stagger ? `${rowIdx * stagger + colIdx * 12}ms` : undefined;

        /* Avatar column — icon bubble + text line */
        if (col.type === 'avatar' || colIdx === avatarCol) {
            return (
                <div
                    style={{ display: 'flex', alignItems: 'center', gap: 9 }}
                    key={colIdx}
                >
                    <Skeleton
                        shape="circle"
                        variant={variant}
                        width="28px"
                        height="28px"
                        style={{ animationDelay: delay, flexShrink: 0 }}
                    />
                    <Skeleton
                        variant={variant}
                        width="68%"
                        height="12px"
                        style={{ animationDelay: delay }}
                    />
                </div>
            );
        }

        /* Badge — short rounded pill */
        if (col.type === 'badge') {
            return (
                <div style={S.cell} key={colIdx}>
                    <Skeleton
                        variant={variant}
                        shape="rounded"
                        width="58px"
                        height="20px"
                        style={{ animationDelay: delay }}
                    />
                </div>
            );
        }

        /* Action — small square icon button */
        if (col.type === 'action') {
            return (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }} key={colIdx}>
                    <Skeleton
                        variant={variant}
                        shape="rect"
                        width="26px"
                        height="26px"
                        borderRadius="7px"
                        style={{ animationDelay: delay }}
                    />
                </div>
            );
        }

        /* ID — short monospace-looking bone */
        if (col.type === 'id') {
            return (
                <div style={S.cell} key={colIdx}>
                    <Skeleton
                        variant={variant}
                        shape="rounded"
                        width="52px"
                        height="18px"
                        style={{ animationDelay: delay }}
                    />
                </div>
            );
        }

        /* Number — right-aligned short bone */
        if (col.type === 'number') {
            return (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }} key={colIdx}>
                    <Skeleton
                        variant={variant}
                        width={col.width ?? '44%'}
                        height="13px"
                        style={{ animationDelay: delay }}
                    />
                </div>
            );
        }

        /* Date */
        if (col.type === 'date') {
            return (
                <div style={S.cell} key={colIdx}>
                    <Skeleton
                        variant={variant}
                        width="76px"
                        height="12px"
                        style={{ animationDelay: delay }}
                    />
                </div>
            );
        }

        /* Default: text — varied widths for realism */
        const textW = col.width
            ?? (colIdx % 4 === 0 ? '80%'
              : colIdx % 4 === 1 ? '60%'
              : colIdx % 4 === 2 ? '72%'
              : '55%');

        return (
            <div style={S.cell} key={colIdx}>
                <Skeleton
                    variant={variant}
                    width={textW}
                    height="13px"
                    style={{ animationDelay: delay }}
                />
            </div>
        );
    }

    return (
        <div
            className={className}
            style={S.wrapper}
            aria-busy="true"
            aria-label="Loading table data"
            role="status"
        >
            {/* ── Toolbar ───────────────────────────────────── */}
            {showToolbar && (
                <div style={S.toolbar}>
                    {/* Left: title + count badge */}
                    <Skeleton variant={variant} width="110px" height="16px" />
                    <Skeleton
                        variant={variant}
                        shape="rounded"
                        width="28px"
                        height="18px"
                        style={{ marginLeft: 4 }}
                    />

                    <div style={{ flex: 1 }} />

                    {/* Search bar */}
                    {toolbarSearch && (
                        <Skeleton
                            variant={variant}
                            width="180px"
                            height="32px"
                            borderRadius="8px"
                        />
                    )}

                    {/* Action buttons */}
                    {Array.from({ length: toolbarBtns }, (_, i) => (
                        <Skeleton
                            key={i}
                            variant={variant}
                            width={i === 0 ? '90px' : '36px'}
                            height="32px"
                            borderRadius="8px"
                        />
                    ))}
                </div>
            )}

            {/* ── Header row ────────────────────────────────── */}
            {showHeader && (
                <div style={S.header(gridCols, density)}>
                    {columns.map((col, i) => {
                        if (col.type === 'action') {
                            return <div key={i} style={{ width: 26 }} />;
                        }
                        return (
                            <Skeleton
                                key={i}
                                variant={variant}
                                width={
                                    col.type === 'badge'  ? '44px'
                                  : col.type === 'date'   ? '40px'
                                  : col.type === 'number' ? '36px'
                                  : col.type === 'id'     ? '20px'
                                  : '50%'
                                }
                                height="9px"
                                style={{ opacity: 0.55 }}
                            />
                        );
                    })}
                </div>
            )}

            {/* ── Body rows ─────────────────────────────────── */}
            {Array.from({ length: rows }, (_, r) => (
                <div
                    key={r}
                    style={{
                        ...S.row(gridCols, density, r === rows - 1),
                        gridTemplateColumns: gridCols,
                    }}
                >
                    {columns.map((col, c) => renderCell(col, c, r))}
                </div>
            ))}

            {/* ── Footer / pagination strip ──────────────────── */}
            <div
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 16px',
                    borderTop: '1px solid var(--glass-border)',
                    background: 'rgba(255,255,255,0.01)',
                }}
            >
                <Skeleton variant={variant} width="120px" height="11px" />
                <div style={{ display: 'flex', gap: 6 }}>
                    {[36, 28, 28, 28, 36].map((w, i) => (
                        <Skeleton
                            key={i}
                            variant={variant}
                            width={`${w}px`}
                            height="28px"
                            borderRadius="7px"
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
