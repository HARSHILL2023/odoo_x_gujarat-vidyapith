import { Children, cloneElement, useCallback, useEffect, useId, useRef, useState, memo } from 'react';
import { createPortal } from 'react-dom';

/* ─── Constants ───────────────────────────────────────────── */
const STYLE_ID = 'ff-tooltip-styles';
const GAP = 8;   // px between target and tooltip
const MARGIN = 10;  // min px from viewport edge

/* ─── CSS ─────────────────────────────────────────────────── */
const CSS = `
@keyframes ff-tip-in-top    { from { opacity:0; transform:translateX(-50%) translateY(6px);  } to { opacity:1; transform:translateX(-50%) translateY(0); } }
@keyframes ff-tip-in-bottom { from { opacity:0; transform:translateX(-50%) translateY(-6px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
@keyframes ff-tip-in-left   { from { opacity:0; transform:translateY(-50%) translateX(6px);  } to { opacity:1; transform:translateY(-50%) translateX(0); } }
@keyframes ff-tip-in-right  { from { opacity:0; transform:translateY(-50%) translateX(-6px); } to { opacity:1; transform:translateY(-50%) translateX(0); } }

.ff-tip {
    position: fixed; z-index: 99999;
    background: var(--ff-tip-bg, #12181f);
    color: var(--ff-tip-color, #e2e8f0);
    font-size: 12px; line-height: 1.52;
    padding: 7px 11px;
    border-radius: 8px;
    border: 1px solid var(--ff-tip-border, rgba(255,255,255,0.1));
    box-shadow: 0 8px 28px rgba(0,0,0,0.45);
    max-width: 240px; pointer-events: none;
    white-space: pre-wrap; word-break: break-word;
    font-family: var(--font-body, system-ui, sans-serif);
    font-weight: 500;
    backdrop-filter: blur(8px);
}
/* ── Arrow ──────────────────────────────────────────────────── */
.ff-tip::before {
    content: '';
    position: absolute;
    width: 7px; height: 7px;
    background: var(--ff-tip-bg, #12181f);
    border: 1px solid var(--ff-tip-border, rgba(255,255,255,0.1));
    transform: rotate(45deg);
}
.ff-tip[data-side='top']    { transform: translateX(-50%); animation: ff-tip-in-top    0.16s cubic-bezier(0.16,1,0.3,1) both; }
.ff-tip[data-side='bottom'] { transform: translateX(-50%); animation: ff-tip-in-bottom 0.16s cubic-bezier(0.16,1,0.3,1) both; }
.ff-tip[data-side='left']   { transform: translateY(-50%); animation: ff-tip-in-left   0.16s cubic-bezier(0.16,1,0.3,1) both; }
.ff-tip[data-side='right']  { transform: translateY(-50%); animation: ff-tip-in-right  0.16s cubic-bezier(0.16,1,0.3,1) both; }

/* Arrow per side */
.ff-tip[data-side='top']    ::before { bottom:-4px; left:50%; margin-left:-3.5px; clip-path:polygon(0 0,100% 100%,0 100%); }
.ff-tip[data-side='bottom'] ::before { top:-4px;    left:50%; margin-left:-3.5px; clip-path:polygon(0 0,100% 0,100% 100%); }
.ff-tip[data-side='left']   ::before { right:-4px;  top:50%;  margin-top:-3.5px;  clip-path:polygon(0 0,100% 0,100% 100%); }
.ff-tip[data-side='right']  ::before { left:-4px;   top:50%;  margin-top:-3.5px;  clip-path:polygon(0 0,0 100%,100% 100%); }

/* ── Rich title inside tooltip ──────────────────────────────── */
.ff-tip-title {
    font-weight: 700; font-size: 12.5px;
    color: var(--ff-tip-title-color, #f1f5f9);
    margin-bottom: 3px;
}
.ff-tip-desc  { color: var(--ff-tip-color, #94a3b8); font-size: 11.5px; }
.ff-tip-kbd   {
    display: inline-flex; align-items: center;
    margin-top: 5px; gap: 3px;
}
.ff-tip-key {
    font-family: var(--font-mono, monospace);
    font-size: 10px; font-weight: 700;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.14);
    border-bottom-width: 2px;
    border-radius: 4px;
    padding: 1px 5px;
    color: #cbd5e1;
}

@media (prefers-reduced-motion: reduce) {
    .ff-tip { animation: none !important; }
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

/* ─── Position calculator — flips if near viewport edge ───── */
function calcPosition(anchorRect, tipEl, preferredSide) {
    const tipW = tipEl?.offsetWidth ?? 0;
    const tipH = tipEl?.offsetHeight ?? 0;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    /* Candidate positions */
    const candidates = {
        top: { x: anchorRect.left + anchorRect.width / 2, y: anchorRect.top - tipH - GAP },
        bottom: { x: anchorRect.left + anchorRect.width / 2, y: anchorRect.bottom + GAP },
        left: { x: anchorRect.left - tipW - GAP, y: anchorRect.top + anchorRect.height / 2 },
        right: { x: anchorRect.right + GAP, y: anchorRect.top + anchorRect.height / 2 },
    };

    /* Check if a side fits in viewport */
    function fits(side) {
        const { x, y } = candidates[side];
        if (side === 'top' || side === 'bottom') {
            return x - tipW / 2 >= MARGIN &&
                x + tipW / 2 <= vw - MARGIN &&
                y >= MARGIN && y + tipH <= vh - MARGIN;
        }
        return y - tipH / 2 >= MARGIN &&
            y + tipH / 2 <= vh - MARGIN &&
            x >= MARGIN && x + tipW <= vw - MARGIN;
    }

    /* Try preferred → opposite → perpendiculars */
    const FALLBACK = {
        top: ['top', 'bottom', 'right', 'left'],
        bottom: ['bottom', 'top', 'right', 'left'],
        left: ['left', 'right', 'top', 'bottom'],
        right: ['right', 'left', 'top', 'bottom'],
    };

    const side = (FALLBACK[preferredSide] ?? FALLBACK.top).find(fits) ?? preferredSide;
    const { x, y } = candidates[side];

    /* Final clamped CSS coords */
    let left, top;
    if (side === 'top' || side === 'bottom') {
        left = Math.min(Math.max(x, MARGIN + tipW / 2), vw - MARGIN - tipW / 2);
        top = y;
    } else {
        top = Math.min(Math.max(y, MARGIN + tipH / 2), vh - MARGIN - tipH / 2);
        left = x;
    }

    return { left, top, side };
}

/* ─── Main Component ──────────────────────────────────────── */
/**
 * Props:
 *   text        string | JSX — simple tooltip content
 *   title       string — bold heading (rich mode)
 *   description string — body text below title (rich mode)
 *   shortcut    string[] — keyboard keys to show e.g. ['Ctrl','B']
 *   position    'top'|'bottom'|'left'|'right'  (default 'top')
 *   delay       ms before showing               (default 280)
 *   hideDelay   ms before hiding                (default 80)
 *   disabled    boolean — suppresses tooltip    (default false)
 *   asChild     boolean — avoids extra wrapper div (passes directly to child)
 */
function Tooltip({
    children,
    text,
    title,
    description,
    shortcut,
    position = 'top',
    delay = 280,
    hideDelay = 80,
    disabled = false,
    asChild = false,
}) {
    const [coords, setCoords] = useState(null);   // { left, top, side }
    const anchorRef = useRef(null);
    const tipRef = useRef(null);
    const showTimer = useRef(null);
    const hideTimer = useRef(null);
    const id = useId();

    useEffect(injectStyles, []);

    /* ── Recalculate position once tooltip DOM exists ─────── */
    const reposition = useCallback(() => {
        if (!anchorRef.current || !tipRef.current) return;
        const rect = anchorRef.current.getBoundingClientRect();
        const result = calcPosition(rect, tipRef.current, position);
        setCoords(result);
    }, [position]);

    /* ── Show — delayed, cancels any pending hide ─────────── */
    const show = useCallback(() => {
        if (disabled) return;
        clearTimeout(hideTimer.current);
        showTimer.current = setTimeout(() => {
            /* Set initial coords from anchor, then refine after render */
            if (!anchorRef.current) return;
            const rect = anchorRef.current.getBoundingClientRect();
            /* Preliminary coords so tooltip renders (needed for offsetWidth) */
            const preliminary = {
                top: rect.top - GAP - 40,
                left: rect.left + rect.width / 2,
                side: position,
            };
            setCoords(preliminary);
        }, delay);
    }, [disabled, delay, position]);

    /* ── Reposition once tooltip mounts ──────────────────────
       Uses a RAF so the DOM has measured the tooltip size      */
    useEffect(() => {
        if (!coords) return;
        const raf = requestAnimationFrame(reposition);
        return () => cancelAnimationFrame(raf);
    }, [coords?.side === null, reposition]);  // only on first mount of tip

    /* ── Hide — slight delay so moving to tooltip works ──── */
    const hide = useCallback(() => {
        clearTimeout(showTimer.current);
        hideTimer.current = setTimeout(() => setCoords(null), hideDelay);
    }, [hideDelay]);

    /* ── Cleanup on unmount ───────────────────────────────── */
    useEffect(() => () => {
        clearTimeout(showTimer.current);
        clearTimeout(hideTimer.current);
    }, []);

    /* ── Close on Escape ─────────────────────────────────── */
    useEffect(() => {
        if (!coords) return;
        const handler = (e) => { if (e.key === 'Escape') setCoords(null); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [coords]);

    /* ── Reposition on scroll/resize ────────────────────── */
    useEffect(() => {
        if (!coords) return;
        const update = () => {
            if (anchorRef.current && tipRef.current) {
                const rect = anchorRef.current.getBoundingClientRect();
                const result = calcPosition(rect, tipRef.current, position);
                setCoords(result);
            }
        };
        window.addEventListener('scroll', update, { passive: true, capture: true });
        window.addEventListener('resize', update, { passive: true });
        return () => {
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
        };
    }, [coords, position]);

    /* ── Has content? ────────────────────────────────────── */
    const hasContent = text || title || description || shortcut?.length;
    if (!hasContent) return children;

    /* ── Tooltip content ─────────────────────────────────── */
    const tipContent = title || description || shortcut
        ? <>
            {title && <div className="ff-tip-title">{title}</div>}
            {description && <div className="ff-tip-desc">{description}</div>}
            {(text && !title) && text}
            {shortcut?.length && (
                <div className="ff-tip-kbd" aria-label={`Shortcut: ${shortcut.join('+')}`}>
                    {shortcut.map((key, i) => (
                        <span key={i} className="ff-tip-key">{key}</span>
                    ))}
                </div>
            )}
        </>
        : text;

    /* ── CSS coords per side ─────────────────────────────── */
    function tipStyle() {
        if (!coords) return { visibility: 'hidden' };
        const { left, top, side } = coords;
        const base = { left, top };
        return base;
    }

    if (asChild) {
        const child = Children.only(children);
        return (
            <>
                {cloneElement(child, {
                    ref: (node) => {
                        anchorRef.current = node;
                        const { ref: childRef } = child;
                        if (typeof childRef === 'function') childRef(node);
                        else if (childRef) childRef.current = node;
                    },
                    onMouseEnter: (e) => {
                        show();
                        if (child.props.onMouseEnter) child.props.onMouseEnter(e);
                    },
                    onMouseLeave: (e) => {
                        hide();
                        if (child.props.onMouseLeave) child.props.onMouseLeave(e);
                    },
                    onFocus: (e) => {
                        show();
                        if (child.props.onFocus) child.props.onFocus(e);
                    },
                    onBlur: (e) => {
                        hide();
                        if (child.props.onBlur) child.props.onBlur(e);
                    },
                    'aria-describedby': coords ? id : child.props['aria-describedby'],
                })}

                {/* Portal tooltip */}
                {coords && hasContent && createPortal(
                    <div
                        id={id}
                        ref={tipRef}
                        className="ff-tip"
                        data-side={coords.side}
                        role="tooltip"
                        style={tipStyle()}
                        onMouseEnter={() => clearTimeout(hideTimer.current)}
                        onMouseLeave={hide}
                    >
                        {tipContent}
                    </div>,
                    document.body
                )}
            </>
        );
    }

    return (
        <>
            {/* Anchor wrapper */}
            <div
                ref={anchorRef}
                style={{ display: 'inline-flex', position: 'relative' }}
                onMouseEnter={show}
                onMouseLeave={hide}
                onFocus={show}
                onBlur={hide}
                aria-describedby={coords ? id : undefined}
            >
                {children}
            </div>

            {/* Portal tooltip */}
            {coords && hasContent && createPortal(
                <div
                    id={id}
                    ref={tipRef}
                    className="ff-tip"
                    data-side={coords.side}
                    role="tooltip"
                    style={tipStyle()}
                    /* Keep alive when mouse moves to tooltip itself */
                    onMouseEnter={() => clearTimeout(hideTimer.current)}
                    onMouseLeave={hide}
                >
                    {tipContent}
                </div>,
                document.body
            )}
        </>
    );
}

Tooltip.displayName = 'Tooltip';
export default memo(Tooltip);
