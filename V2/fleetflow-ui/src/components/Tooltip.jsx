import { useState } from 'react';

/**
 * Tooltip — wraps any element and shows a tooltip on hover.
 *
 * Usage:
 *   <Tooltip text="This button dispatches the trip">
 *     <button>Dispatch</button>
 *   </Tooltip>
 *
 * Props:
 *   text      — tooltip content (string or JSX)
 *   position  — 'top' | 'bottom' | 'left' | 'right'  (default: 'top')
 *   delay     — ms before tooltip appears (default: 300)
 */
export default function Tooltip({ children, text, position = 'top', delay = 300 }) {
    const [visible, setVisible] = useState(false);
    const [timer, setTimer] = useState(null);

    const show = () => {
        const t = setTimeout(() => setVisible(true), delay);
        setTimer(t);
    };
    const hide = () => {
        clearTimeout(timer);
        setVisible(false);
    };

    const POSITIONS = {
        top: { bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' },
        bottom: { top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' },
        left: { right: 'calc(100% + 6px)', top: '50%', transform: 'translateY(-50%)' },
        right: { left: 'calc(100% + 6px)', top: '50%', transform: 'translateY(-50%)' },
    };

    return (
        <div
            style={{ position: 'relative', display: 'inline-flex' }}
            onMouseEnter={show}
            onMouseLeave={hide}
            onFocus={show}
            onBlur={hide}
        >
            {children}
            {visible && text && (
                <div
                    role="tooltip"
                    style={{
                        position: 'absolute',
                        ...POSITIONS[position] || POSITIONS.top,
                        zIndex: 1000,
                        background: '#1c2430',
                        color: '#e6edf3',
                        fontSize: 12,
                        lineHeight: 1.5,
                        padding: '6px 10px',
                        borderRadius: 6,
                        whiteSpace: 'pre-wrap',
                        maxWidth: 220,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                        border: '1px solid #30363d',
                        pointerEvents: 'none',
                        animation: 'fadeIn 0.15s ease',
                    }}
                >
                    {text}
                </div>
            )}
        </div>
    );
}
