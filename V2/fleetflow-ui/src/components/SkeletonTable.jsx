import Skeleton from './Skeleton';

/**
 * SkeletonTable — table-shaped shimmer placeholder.
 *
 * Props:
 *   rows — number of body rows to render (default 5)
 *   cols — number of columns to render  (default 4)
 */
export default function SkeletonTable({ rows = 5, cols = 4 }) {
    return (
        <div className="table-wrapper">
            {/* Toolbar skeleton */}
            <div
                className="table-toolbar"
                style={{ display: 'flex', alignItems: 'center', gap: 10 }}
            >
                <Skeleton width="140px" height="20px" />
                <div style={{ flex: 1 }} />
                <Skeleton width="160px" height="30px" borderRadius="6px" />
                <Skeleton width="90px" height="30px" borderRadius="6px" />
            </div>

            {/* Header row */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${cols}, 1fr)`,
                    gap: 0,
                    padding: '10px 16px',
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--bg-surface)',
                }}
            >
                {Array.from({ length: cols }, (_, i) => (
                    <Skeleton key={i} width="60%" height="10px" />
                ))}
            </div>

            {/* Body rows */}
            {Array.from({ length: rows }, (_, r) => (
                <div
                    key={r}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${cols}, 1fr)`,
                        gap: 0,
                        padding: '12px 16px',
                        borderBottom: r < rows - 1 ? '1px solid var(--border-light)' : 'none',
                        alignItems: 'center',
                    }}
                >
                    {Array.from({ length: cols }, (_, c) => (
                        <Skeleton
                            key={c}
                            /* Vary widths so it looks natural */
                            width={c === 0 ? '75%' : c === cols - 1 ? '50%' : '65%'}
                            height="13px"
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}
