import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { onToast } from '../hooks/useToast';

/* ─── Config ──────────────────────────────────────────────── */
const MAX_TOASTS = 5;

const TYPE_CONFIG = {
    success: { icon: '✓', color: '#22C55E', bg: 'var(--green-bg)', border: 'var(--green)' },
    error: { icon: '✕', color: '#EF4444', bg: 'var(--red-bg)', border: 'var(--red)' },
    warning: { icon: '⚠', color: '#F59E0B', bg: 'var(--orange-bg)', border: 'var(--orange)' },
    info: { icon: 'ℹ', color: '#60A5FA', bg: 'var(--blue-bg)', border: 'var(--blue)' },
};

/* ─── Injected styles ─────────────────────────────────────── */
const STYLE_ID = 'ff-toast-styles';
const CSS = `
  .ff-toast-root {
    position: fixed;
    top: 1.5rem;
    right: 1.5rem;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 10px;
    pointer-events: none;
  }
  .ff-toast {
    pointer-events: all;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 14px 0 14px;
    border-radius: var(--radius-lg, 14px);
    border: 1px solid transparent;
    min-width: 280px;
    max-width: 380px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.25);
    animation: slideInRight 0.28s cubic-bezier(0.16,1,0.3,1) both;
    position: relative;
    overflow: hidden;
    backdrop-filter: blur(8px);
  }
  .ff-toast-icon {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 800;
    flex-shrink: 0;
    margin-top: 1px;
    color: #fff;
  }
  .ff-toast-body {
    flex: 1;
    padding-bottom: 12px;
  }
  .ff-toast-msg {
    font-size: 13px;
    font-weight: 500;
    line-height: 1.4;
    color: var(--text-primary);
  }
  .ff-toast-close {
    background: none;
    border: none;
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
    color: var(--text-muted);
    padding: 0;
    flex-shrink: 0;
    transition: color 150ms ease;
    margin-top: -1px;
  }
  .ff-toast-close:hover { color: var(--text-primary); }
  .ff-toast-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 3px;
    border-radius: 0 0 var(--radius-lg,14px) var(--radius-lg,14px);
    transform-origin: left;
  }
  @media (max-width: 768px) {
    .ff-toast-root {
      top: auto;
      bottom: 80px;
      right: 1rem;
      left: 1rem;
    }
    .ff-toast {
      max-width: 100%;
    }
  }
`;

function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
}

/* ─── Single Toast ────────────────────────────────────────── */
function Toast({ id, message, type, duration, onRemove }) {
    const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.info;
    const barRef = useRef(null);

    useEffect(() => {
        // Animate shrinking progress bar
        if (barRef.current) {
            barRef.current.animate(
                [{ width: '100%' }, { width: '0%' }],
                { duration, easing: 'linear', fill: 'forwards' }
            );
        }
        const t = setTimeout(() => onRemove(id), duration);
        return () => clearTimeout(t);
    }, [id, duration, onRemove]);

    return (
        <div
            className="ff-toast"
            style={{ background: cfg.bg, borderColor: cfg.border }}
            role="alert"
            aria-live="assertive"
        >
            {/* Icon circle */}
            <div className="ff-toast-icon" style={{ background: cfg.color }}>
                {cfg.icon}
            </div>

            {/* Message */}
            <div className="ff-toast-body">
                <div className="ff-toast-msg">{message}</div>
            </div>

            {/* Close */}
            <button className="ff-toast-close" onClick={() => onRemove(id)} aria-label="Dismiss">
                ×
            </button>

            {/* Progress bar */}
            <div
                ref={barRef}
                className="ff-toast-progress"
                style={{ background: cfg.color, width: '100%' }}
            />
        </div>
    );
}

/* ─── Container ───────────────────────────────────────────── */
export default function ToastContainer() {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        injectStyles();
        const unsub = onToast((detail) => {
            setToasts(prev => {
                const next = [...prev, detail];
                return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
            });
        });
        return unsub;
    }, []);

    const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id));

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div className="ff-toast-root" aria-label="Notifications">
            {toasts.map(t => (
                <Toast key={t.id} {...t} onRemove={remove} />
            ))}
        </div>,
        document.body
    );
}
