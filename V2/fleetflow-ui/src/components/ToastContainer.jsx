import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    AlertTriangle, CheckCircle2, Info,
    Loader2, X, XCircle,
} from 'lucide-react';
import { onToast } from '../hooks/useToast';

/* ─── Constants ───────────────────────────────────────────── */
const STYLE_ID   = 'ff-toast-styles';
const MAX_TOASTS = 5;

/* ─── Type config ─────────────────────────────────────────── */
const TYPE_CONFIG = {
    success: { Icon: CheckCircle2,  color: '#22c55e', bg: 'rgba(34,197,94,0.10)',   border: 'rgba(34,197,94,0.22)'   },
    error:   { Icon: XCircle,       color: '#ef4444', bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.22)'   },
    warning: { Icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.22)'  },
    info:    { Icon: Info,          color: '#60a5fa', bg: 'rgba(96,165,250,0.10)',  border: 'rgba(96,165,250,0.22)'  },
    loading: { Icon: Loader2,       color: '#a855f7', bg: 'rgba(168,85,247,0.10)', border: 'rgba(168,85,247,0.22)'  },
};

/* ─── Position → CSS anchor ───────────────────────────────── */
const POSITION_STYLE = {
    'top-right':     { top: '1.25rem',  right: '1.25rem',  alignItems: 'flex-end'   },
    'top-left':      { top: '1.25rem',  left:  '1.25rem',  alignItems: 'flex-start' },
    'top-center':    { top: '1.25rem',  left: '50%', transform: 'translateX(-50%)', alignItems: 'center' },
    'bottom-right':  { bottom: '1.5rem', right: '1.25rem', alignItems: 'flex-end'   },
    'bottom-left':   { bottom: '1.5rem', left:  '1.25rem', alignItems: 'flex-start' },
    'bottom-center': { bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', alignItems: 'center' },
};

/* ─── Slide direction per position ────────────────────────── */
function slideVars(position) {
    if (position.includes('right'))  return { '--ff-t-x-in': '110%',  '--ff-t-x-out': '110%'  };
    if (position.includes('left'))   return { '--ff-t-x-in': '-110%', '--ff-t-x-out': '-110%' };
    return                                   { '--ff-t-x-in': '0',    '--ff-t-x-out': '0', '--ff-t-y-in': '-28px', '--ff-t-y-out': '-28px' };
}

/* ─── CSS ─────────────────────────────────────────────────── */
const CSS = `
@keyframes ff-t-in {
    from { opacity: 0; transform: translateX(var(--ff-t-x-in, 100%)) translateY(var(--ff-t-y-in, 0)) scale(0.92); }
    to   { opacity: 1; transform: translateX(0) translateY(0) scale(1); }
}
@keyframes ff-t-out {
    from { opacity: 1; transform: translateX(0) translateY(0) scale(1); max-height: 120px; margin-bottom: 0; }
    to   { opacity: 0; transform: translateX(var(--ff-t-x-out, 100%)) scale(0.88); max-height: 0; margin-bottom: -10px; }
}
@keyframes ff-t-spin {
    to { transform: rotate(360deg); }
}

/* FIX: flash keyframe for type transitions (loading → success/error) */
@keyframes ff-t-flash {
    0%   { opacity: 1;    transform: scale(1);     }
    40%  { opacity: 0.5;  transform: scale(0.975); }
    100% { opacity: 1;    transform: scale(1);     }
}

.ff-t-root {
    position: fixed; z-index: 9999;
    display: flex; flex-direction: column;
    gap: 8px; pointer-events: none;
    max-width: min(400px, calc(100vw - 2rem));
}
.ff-t {
    pointer-events: all; position: relative; overflow: hidden;
    display: flex; align-items: flex-start; gap: 11px;
    padding: 13px 13px 0 13px;
    border-radius: 14px; border: 1px solid transparent;
    min-width: 280px;
    box-shadow: 0 8px 28px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.04) inset;
    backdrop-filter: blur(14px);
    animation: ff-t-in 0.3s cubic-bezier(0.16,1,0.3,1) both;
    transition: background 0.22s ease, border-color 0.22s ease,
                transform 0.18s ease, box-shadow 0.18s ease;
    will-change: transform, opacity;
    cursor: default;
}
.ff-t:hover { transform: scale(1.015); box-shadow: 0 12px 36px rgba(0,0,0,0.36), 0 0 0 1px rgba(255,255,255,0.06) inset; }
.ff-t.ff-t-exiting {
    animation: ff-t-out 0.26s cubic-bezier(0.4,0,1,1) both;
    pointer-events: none;
}

/* FIX: flash class applied on type change */
.ff-t.ff-t-flash {
    animation: ff-t-flash 0.32s cubic-bezier(0.16,1,0.3,1) both;
}

.ff-t-icon-wrap {
    width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    margin-top: 1px;
    transition: background 0.22s ease;
}
.ff-t-icon-spin { animation: ff-t-spin 1.1s linear infinite; }

.ff-t-body { flex: 1; padding-bottom: 13px; min-width: 0; }
.ff-t-title {
    font-size: 13px; font-weight: 700; color: var(--text-primary);
    line-height: 1.35; margin-bottom: 2px; font-family: var(--font-body);
}
.ff-t-msg {
    font-size: 12.5px; font-weight: 400; color: var(--text-secondary);
    line-height: 1.45; font-family: var(--font-body);
}
.ff-t-msg-only {
    font-size: 13px; font-weight: 500; color: var(--text-primary);
    line-height: 1.4; font-family: var(--font-body);
}
.ff-t-action {
    display: inline-flex; align-items: center; margin-top: 7px;
    padding: 4px 10px; border-radius: 6px; font-size: 11.5px;
    font-weight: 600; border: 1px solid; cursor: pointer;
    background: transparent; font-family: var(--font-body);
    transition: background 0.12s ease, color 0.12s ease;
}
.ff-t-action:hover { filter: brightness(1.18); }
.ff-t-action:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.ff-t-close {
    background: none; border: none; cursor: pointer;
    color: var(--text-muted); padding: 2px; flex-shrink: 0;
    border-radius: 5px; margin-top: 1px; line-height: 0;
    transition: color 0.12s ease, background 0.12s ease;
}
.ff-t-close:hover { color: var(--text-primary); background: rgba(255,255,255,0.07); }
.ff-t-close:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.ff-t-progress {
    position: absolute; bottom: 0; left: 0; right: 0;
    height: 2.5px; border-radius: 0 0 14px 14px;
    transform-origin: left;
    transition: background 0.22s ease;
}
.ff-t-swiping { transition: none !important; opacity: 0.8; }

@media (max-width: 640px) {
    .ff-t-root {
        bottom: 80px !important; top: auto !important;
        left: 1rem !important; right: 1rem !important;
        transform: none !important; max-width: 100%;
    }
    .ff-t { min-width: unset; width: 100%; }
}
@media (prefers-reduced-motion: reduce) {
    .ff-t, .ff-t.ff-t-exiting, .ff-t.ff-t-flash { animation: none !important; }
    .ff-t-icon-spin { animation: none !important; }
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

/* ════════════════════════════════════════════════════════════
   SINGLE TOAST
   ════════════════════════════════════════════════════════════ */
function Toast({ id, type, message, title, duration, position = 'top-right', action, onRemove }) {
    const cfg          = TYPE_CONFIG[type] ?? TYPE_CONFIG.info;
    const { Icon }     = cfg;
    const barRef       = useRef(null);
    const timerRef     = useRef(null);
    const animRef      = useRef(null);
    const dismissRef   = useRef(null);          // ← stable ref avoids stale closures in timers
    const prevTypeRef  = useRef(type);

    const [exiting, setExiting] = useState(false);
    const [swiping,  setSwiping]  = useState(false);
    const [flashing, setFlashing] = useState(false);
    const swipeStartX = useRef(null);

    /* ── Dismiss — stable via ref ─────────────────────────── */
    const dismiss = useCallback(() => {
        if (exiting) return;
        setExiting(true);
        animRef.current?.pause();
        setTimeout(() => onRemove(id), 240);
    }, [exiting, id, onRemove]);

    /* Keep ref in sync so timers always call the latest version */
    useEffect(() => { dismissRef.current = dismiss; }, [dismiss]);

    /* ── FIX: Flash animation when type changes (loading→success etc.) */
    useEffect(() => {
        if (prevTypeRef.current === type) return;
        prevTypeRef.current = type;
        setFlashing(true);
        const t = setTimeout(() => setFlashing(false), 340);
        return () => clearTimeout(t);
    }, [type]);

    /* ── FIX: Timer + progress bar restart on duration/type change ──
       This is the critical fix for toast.update() — when a loading
       toast (duration=0) becomes success (duration=3500), we need
       to start the timer and bar from scratch.                       */
    useEffect(() => {
        /* Clear any existing timer/animation first */
        clearTimeout(timerRef.current);
        animRef.current?.cancel();
        animRef.current = null;

        if (!duration) return;  // sticky — no timer, no bar

        /* Restart progress bar animation */
        if (barRef.current) {
            animRef.current = barRef.current.animate(
                [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }],
                { duration, easing: 'linear', fill: 'forwards' }
            );
        }

        /* Restart auto-dismiss timer */
        timerRef.current = setTimeout(() => dismissRef.current?.(), duration);

        return () => {
            clearTimeout(timerRef.current);
            animRef.current?.cancel();
        };
    }, [duration, type]);   // ← re-run on every update(), not just mount

    /* ── Pause on hover ───────────────────────────────────── */
    const pauseTimer = useCallback(() => {
        clearTimeout(timerRef.current);
        animRef.current?.pause();
    }, []);

    /* ── FIX: Resume using Web Animations currentTime ────────
       Previously used getComputedStyle width — incorrect for
       scaleX transforms. currentTime is exact and reliable.   */
    const resumeTimer = useCallback(() => {
        if (!duration || !animRef.current) return;
        const elapsed   = animRef.current.currentTime ?? 0;
        const remaining = Math.max(0, duration - elapsed);
        if (remaining <= 0) { dismissRef.current?.(); return; }
        timerRef.current = setTimeout(() => dismissRef.current?.(), remaining);
        animRef.current.play();
    }, [duration]);

    /* ── Touch swipe-to-dismiss ───────────────────────────── */
    const onTouchStart = (e) => {
        swipeStartX.current = e.touches[0].clientX;
        pauseTimer();
        setSwiping(true);
    };
    const onTouchMove = (e) => {
        if (swipeStartX.current === null) return;
        if (Math.abs(e.touches[0].clientX - swipeStartX.current) > 60) dismiss();
    };
    const onTouchEnd = () => {
        setSwiping(false);
        resumeTimer();
        swipeStartX.current = null;
    };

    const vars = slideVars(position);

    return (
        <div
            className={[
                'ff-t',
                exiting  ? 'ff-t-exiting' : '',
                swiping  ? 'ff-t-swiping' : '',
                flashing ? 'ff-t-flash'   : '',
            ].filter(Boolean).join(' ')}
            style={{ background: cfg.bg, borderColor: cfg.border, ...vars }}
            role={type === 'error' ? 'alert' : 'status'}
            aria-live={type === 'error' ? 'assertive' : 'polite'}
            aria-atomic="true"
            onMouseEnter={duration ? pauseTimer  : undefined}
            onMouseLeave={duration ? resumeTimer : undefined}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            {/* ── Icon ──────────────────────────────────────── */}
            <div
                className="ff-t-icon-wrap"
                style={{ background: `${cfg.color}22` }}
                aria-hidden="true"
            >
                <span
                    className={type === 'loading' ? 'ff-t-icon-spin' : undefined}
                    style={{ display: 'inline-flex', color: cfg.color }}
                >
                    <Icon size={15} strokeWidth={2.4} />
                </span>
            </div>

            {/* ── Body ──────────────────────────────────────── */}
            <div className="ff-t-body">
                {title
                    ? <>
                          <div className="ff-t-title">{title}</div>
                          <div className="ff-t-msg">{message}</div>
                      </>
                    : <div className="ff-t-msg-only">{message}</div>
                }
                {action && (
                    <button
                        className="ff-t-action"
                        style={{ color: cfg.color, borderColor: `${cfg.color}44` }}
                        onClick={() => { action.onClick?.(); dismiss(); }}
                    >
                        {action.label}
                    </button>
                )}
            </div>

            {/* ── Close ─────────────────────────────────────── */}
            {type !== 'loading' && (
                <button
                    className="ff-t-close"
                    onClick={dismiss}
                    aria-label="Dismiss notification"
                >
                    <X size={14} strokeWidth={2.4} />
                </button>
            )}

            {/* ── Progress bar ──────────────────────────────── */}
            {duration > 0 && (
                <div
                    ref={barRef}
                    className="ff-t-progress"
                    style={{ background: cfg.color }}
                    aria-hidden="true"
                />
            )}
        </div>
    );
}

/* ════════════════════════════════════════════════════════════
   TOAST CONTAINER
   ════════════════════════════════════════════════════════════ */
export default function ToastContainer({ position = 'top-right' }) {
    const [toasts, setToasts] = useState([]);

    const remove = useCallback(id => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    useEffect(() => {
        injectStyles();

        const unsub = onToast(
            /* ── onShow ──────────────────────────────────── */
            detail => {
                setToasts(prev => {
                    const next = [...prev, { position, ...detail }];
                    return next.length > MAX_TOASTS
                        ? next.slice(next.length - MAX_TOASTS)
                        : next;
                });
            },

            /* ── onUpdate — patch a live toast in-place ───
               Handles toast.update(id, { type, message, duration })
               e.g. loading → success after an async operation       */
            ({ id, ...patch }) => {
                setToasts(prev =>
                    prev.map(t => t.id === id ? { ...t, ...patch } : t)
                );
            },

            /* ── onDismiss — externally dismiss by id ─────
               Handles toast.dismiss(id)                             */
            ({ id }) => remove(id),

            /* ── onDismissAll ─────────────────────────────
               Handles toast.dismissAll()                            */
            () => setToasts([]),
        );

        return unsub;
    }, [position, remove]);

    if (typeof document === 'undefined') return null;

    const posStyle = POSITION_STYLE[position] ?? POSITION_STYLE['top-right'];

    return createPortal(
        <div
            className="ff-t-root"
            style={posStyle}
            aria-label="Notifications"
            aria-live="polite"
            aria-relevant="additions"
        >
            {toasts.map(t => (
                <Toast
                    key={t.id}
                    {...t}
                    position={position}
                    onRemove={remove}
                />
            ))}
        </div>,
        document.body
    );
}
