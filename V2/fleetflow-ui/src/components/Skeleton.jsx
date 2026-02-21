import { useEffect } from 'react';

const STYLE_ID = 'ff-skeleton-styles';

const CSS = `
  .ff-skeleton {
    background: linear-gradient(
      90deg,
      var(--surface-2) 25%,
      var(--border) 50%,
      var(--surface-2) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite;
    border-radius: var(--radius-sm);
    display: block;
    flex-shrink: 0;
  }
`;

function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
}

/**
 * Skeleton — animated shimmer placeholder block.
 *
 * Props:
 *   width        — CSS width string (default '100%')
 *   height       — CSS height string (default '16px')
 *   borderRadius — CSS border-radius (default uses --radius-sm)
 *   count        — how many stacked rows to render (default 1)
 *   gap          — gap between rows in px (default 8)
 */
export default function Skeleton({
    width = '100%',
    height = '16px',
    borderRadius,
    count = 1,
    gap = 8,
}) {
    useEffect(injectStyles, []);

    const style = {
        width,
        height,
        ...(borderRadius ? { borderRadius } : {}),
    };

    if (count === 1) {
        return <span className="ff-skeleton" style={style} />;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap }}>
            {Array.from({ length: count }, (_, i) => (
                <span key={i} className="ff-skeleton" style={style} />
            ))}
        </div>
    );
}
