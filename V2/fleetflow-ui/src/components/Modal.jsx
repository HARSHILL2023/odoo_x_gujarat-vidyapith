import {
    createContext, useCallback, useContext,
    useEffect, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Loader2, X } from 'lucide-react';

/* ─── Constants ──────────────────────────────────────────── */
const STYLE_ID = 'ff-modal-styles';
const EXIT_MS  = 260;

/* ─── Ref-counted scroll lock (handles stacked modals) ───── */
let _lockCount = 0;
const lockScroll = () => {
    if (++_lockCount === 1) document.body.style.overflow = 'hidden';
};
const unlockScroll = () => {
    if (Math.max(0, --_lockCount) === 0) {
        _lockCount = 0;
        document.body.style.overflow = '';
    }
};

/* ─── CSS ─────────────────────────────────────────────────── */
const CSS = `
@keyframes ff-overlay-in  { from{opacity:0} to{opacity:1} }
@keyframes ff-overlay-out { from{opacity:1} to{opacity:0} }

@keyframes ff-modal-in {
    0%   { opacity:0; transform:scale(0.94) translateY(14px); }
    60%  { opacity:1; transform:scale(1.008) translateY(-3px); }
    100% { opacity:1; transform:scale(1) translateY(0); }
}
@keyframes ff-modal-out {
    from { opacity:1; transform:scale(1) translateY(0); }
    to   { opacity:0; transform:scale(0.95) translateY(10px); }
}

@keyframes ff-sheet-in  { from{transform:translateY(102%)} to{transform:translateY(0)} }
@keyframes ff-sheet-out { from{transform:translateY(0)}     to{transform:translateY(105%)} }

@keyframes ff-dialog-in {
    0%   { opacity:0; transform:scale(0.86) translateY(10px); }
    65%  { opacity:1; transform:scale(1.018) translateY(-1px); }
    100% { opacity:1; transform:scale(1) translateY(0); }
}
@keyframes ff-dialog-out {
    from { opacity:1; transform:scale(1); }
    to   { opacity:0; transform:scale(0.9) translateY(7px); }
}

@keyframes ff-fs-in  { from{opacity:0;transform:scale(0.98)} to{opacity:1;transform:scale(1)} }
@keyframes ff-fs-out { from{opacity:1;transform:scale(1)}    to{opacity:0;transform:scale(0.98)} }

@keyframes ff-m-spin { to{transform:rotate(360deg)} }

/* ── Overlay ─────────────────────────────────────────────── */
.ff-m-overlay {
    position:fixed; inset:0; z-index:1000;
    background:rgba(0,0,0,0.62);
    backdrop-filter:blur(7px);
    animation:ff-overlay-in 0.2s ease both;
}
.ff-m-overlay.leaving { animation:ff-overlay-out ${EXIT_MS}ms ease both; }

.ff-m-overlay--default,
.ff-m-overlay--dialog  { display:flex; align-items:center; justify-content:center; padding:20px; }
.ff-m-overlay--default.pos-top { align-items:flex-start; padding-top:clamp(60px,10vh,120px); }
.ff-m-overlay--sheet        { display:flex; align-items:flex-end; justify-content:center; }
.ff-m-overlay--fullscreen   { display:flex; padding:0; }

/* ── Box ─────────────────────────────────────────────────── */
.ff-m-box {
    position:relative; outline:none;
    background:var(--bg-card);
    border:1px solid var(--glass-border);
    display:flex; flex-direction:column;
    max-height:calc(100vh - 48px);
}
.ff-m-box--sm  { width:min(400px,100%); }
.ff-m-box--md  { width:min(540px,100%); }
.ff-m-box--lg  { width:min(700px,100%); }
.ff-m-box--xl  { width:min(900px,100%); }

.ff-m-box--default {
    border-radius:18px;
    box-shadow:
        0 32px 80px rgba(0,0,0,0.72),
        0 0 0 1px rgba(255,255,255,0.05),
        inset 0 1px 0 rgba(255,255,255,0.05);
    animation:ff-modal-in 0.32s cubic-bezier(0.16,1,0.3,1) both;
}
.ff-m-box--default.leaving { animation:ff-modal-out ${EXIT_MS}ms ease both; }

.ff-m-box--dialog {
    border-radius:14px;
    box-shadow:0 24px 64px rgba(0,0,0,0.68),0 0 0 1px rgba(255,255,255,0.05);
    animation:ff-dialog-in 0.28s cubic-bezier(0.16,1,0.3,1) both;
}
.ff-m-box--dialog.leaving { animation:ff-dialog-out ${EXIT_MS}ms ease both; }

.ff-m-box--sheet {
    border-radius:18px 18px 0 0; width:100%;
    max-width:min(700px,100%); max-height:92dvh;
    box-shadow:0 -12px 64px rgba(0,0,0,0.55),0 0 0 1px rgba(255,255,255,0.05);
    animation:ff-sheet-in 0.38s cubic-bezier(0.16,1,0.3,1) both;
}
.ff-m-box--sheet.leaving  { animation:ff-sheet-out ${EXIT_MS}ms cubic-bezier(0.4,0,1,1) both; }

.ff-m-box--fullscreen {
    border-radius:0; border:none;
    width:100vw; height:100dvh; max-height:100dvh;
    animation:ff-fs-in 0.28s ease both;
}
.ff-m-box--fullscreen.leaving { animation:ff-fs-out ${EXIT_MS}ms ease both; }

/* ── Drag handle (sheet) ─────────────────────────────────── */
.ff-m-drag {
    display:flex; justify-content:center;
    padding:12px 0 4px; cursor:grab; user-select:none; flex-shrink:0;
    touch-action:none;
}
.ff-m-drag:active { cursor:grabbing; }
.ff-m-drag-bar {
    width:36px; height:4px; border-radius:2px; background:var(--border);
    transition:background 0.15s ease, width 0.2s ease;
}
.ff-m-drag:hover .ff-m-drag-bar { background:var(--text-muted); width:46px; }

/* ── Header ──────────────────────────────────────────────── */
.ff-m-header {
    display:flex; align-items:flex-start; gap:12px;
    padding:20px 22px 16px; flex-shrink:0;
    border-bottom:1px solid var(--glass-border);
}
.ff-m-header.no-border { border-bottom:none; padding-bottom:8px; }
.ff-m-header-icon {
    width:38px; height:38px; border-radius:10px; flex-shrink:0;
    display:flex; align-items:center; justify-content:center; margin-top:1px;
}
.ff-m-header-text { flex:1; min-width:0; }
.ff-m-header-title {
    font-size:16px; font-weight:700; color:var(--text-primary);
    font-family:var(--font-heading); line-height:1.3; margin:0;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.ff-m-header-sub {
    font-size:12.5px; color:var(--text-muted); margin:3px 0 0; line-height:1.45;
}
.ff-m-close-btn {
    display:flex; align-items:center; justify-content:center;
    width:28px; height:28px; border-radius:8px; flex-shrink:0;
    border:none; background:transparent; cursor:pointer;
    color:var(--text-muted); padding:0; margin-top:1px;
    transition:background 0.15s ease, color 0.15s ease;
}
.ff-m-close-btn:hover { background:var(--bg-hover); color:var(--text-primary); }
.ff-m-close-btn:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }

/* ── Body ────────────────────────────────────────────────── */
.ff-m-body {
    flex:1; overflow-y:auto; padding:20px 22px;
    overscroll-behavior:contain;
    scrollbar-width:thin; scrollbar-color:var(--border) transparent;
}
.ff-m-body::-webkit-scrollbar { width:4px; }
.ff-m-body::-webkit-scrollbar-track { background:transparent; }
.ff-m-body::-webkit-scrollbar-thumb { background:var(--border); border-radius:4px; }
.ff-m-body.no-pad { padding:0; }

/* ── Footer ──────────────────────────────────────────────── */
.ff-m-footer {
    display:flex; align-items:center; justify-content:flex-end; gap:8px;
    padding:14px 22px; flex-shrink:0;
    border-top:1px solid var(--glass-border);
    background:rgba(255,255,255,0.012);
}
.ff-m-footer.align-start   { justify-content:flex-start; }
.ff-m-footer.align-center  { justify-content:center; }
.ff-m-footer.align-between { justify-content:space-between; }

/* ── Loading overlay ─────────────────────────────────────── */
.ff-m-loading {
    position:absolute; inset:0; z-index:10;
    background:rgba(0,0,0,0.48);
    backdrop-filter:blur(4px);
    display:flex; align-items:center; justify-content:center;
    border-radius:inherit;
    animation:ff-overlay-in 0.18s ease both;
}
.ff-m-loading-inner { display:flex; flex-direction:column; align-items:center; gap:10px; }
.ff-m-spinner       { animation:ff-m-spin 0.75s linear infinite; color:var(--accent); }
.ff-m-loading-text  { font-size:12px; color:var(--text-muted); }

/* ── Confirm-close dialog ────────────────────────────────── */
.ff-m-confirm {
    position:absolute; inset:0; z-index:20;
    background:rgba(0,0,0,0.62);
    backdrop-filter:blur(5px);
    display:flex; align-items:center; justify-content:center;
    border-radius:inherit;
    animation:ff-overlay-in 0.15s ease both;
}
.ff-m-confirm-box {
    background:var(--bg-card); border:1px solid var(--glass-border);
    border-radius:14px; padding:26px; width:min(310px,88%); text-align:center;
    box-shadow:0 20px 60px rgba(0,0,0,0.7);
}
.ff-m-confirm-icon {
    width:46px; height:46px; border-radius:12px; margin:0 auto 14px;
    background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.2);
    display:flex; align-items:center; justify-content:center;
}
.ff-m-confirm-title {
    font-size:15px; font-weight:700; color:var(--text-primary);
    font-family:var(--font-heading); margin:0 0 6px;
}
.ff-m-confirm-msg {
    font-size:12.5px; color:var(--text-muted); line-height:1.55; margin:0 0 20px;
}
.ff-m-confirm-actions { display:flex; gap:8px; }
.ff-m-confirm-btn {
    flex:1; padding:9px; border-radius:8px; border:1px solid var(--glass-border);
    font-size:13px; font-weight:600; cursor:pointer; font-family:var(--font-body);
    transition:background 0.15s ease, border-color 0.15s ease;
}
.ff-m-confirm-btn.keep    { background:var(--bg-hover); color:var(--text-primary); }
.ff-m-confirm-btn.keep:hover { background:var(--border); }
.ff-m-confirm-btn.discard {
    background:rgba(239,68,68,0.1); color:#ef4444; border-color:rgba(239,68,68,0.22);
}
.ff-m-confirm-btn.discard:hover { background:rgba(239,68,68,0.2); }

@media (prefers-reduced-motion:reduce) {
    .ff-m-overlay, .ff-m-box,
    .ff-m-overlay.leaving, .ff-m-box.leaving,
    .ff-m-loading, .ff-m-confirm { animation:none !important; }
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

/* ─── Context ─────────────────────────────────────────────── */
const ModalCtx = createContext({
    onClose:   () => {},
    showClose: true,
    variant:   'default',
    isLoading: false,
});

/** Access the modal's close function from any depth within the tree */
export const useModal = () => useContext(ModalCtx);

/* ─── Focus trap ──────────────────────────────────────────── */
const FOCUSABLE =
    'button:not([disabled]),[href],input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

function useFocusTrap(ref, active) {
    useEffect(() => {
        if (!active || !ref.current) return;
        const el  = ref.current;
        const get = () => [...el.querySelectorAll(FOCUSABLE)].filter(e => !e.closest('[hidden]'));

        // Only steal focus if nothing inside already has it
        if (!el.contains(document.activeElement)) get()[0]?.focus();

        const onKey = e => {
            if (e.key !== 'Tab') return;
            const els = get();
            if (!els.length) return;
            const first = els[0], last = els.at(-1);
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault(); last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault(); first.focus();
            }
        };
        el.addEventListener('keydown', onKey);
        return () => el.removeEventListener('keydown', onKey);
    }, [active, ref]);
}

/* ─── Compound sub-components ─────────────────────────────── */
function ModalHeader({ title, subtitle, icon, iconColor = '#3b82f6', noBorder = false }) {
    const { onClose, showClose } = useModal();
    const IconComp = icon;
    return (
        <div className={`ff-m-header${noBorder ? ' no-border' : ''}`}>
            {icon && (
                <div
                    className="ff-m-header-icon"
                    style={{
                        background: `${iconColor}18`,
                        border: `1px solid ${iconColor}28`,
                    }}
                >
                    {typeof icon === 'function'
                        ? <IconComp size={18} color={iconColor} strokeWidth={2} />
                        : icon
                    }
                </div>
            )}
            <div className="ff-m-header-text">
                {title    && <h2 className="ff-m-header-title">{title}</h2>}
                {subtitle && <p  className="ff-m-header-sub">{subtitle}</p>}
            </div>
            {showClose && (
                <button className="ff-m-close-btn" onClick={onClose} aria-label="Close">
                    <X size={15} strokeWidth={2.5} />
                </button>
            )}
        </div>
    );
}

function ModalBody({ children, noPadding = false }) {
    return (
        <div className={`ff-m-body${noPadding ? ' no-pad' : ''}`}>
            {children}
        </div>
    );
}

function ModalFooter({ children, align = 'end' }) {
    return (
        <div className={`ff-m-footer${align !== 'end' ? ` align-${align}` : ''}`}>
            {children}
        </div>
    );
}

/* ─── Main component ──────────────────────────────────────── */
/**
 * Props:
 *   title          string          — legacy quick-header (no icon/subtitle)
 *   onClose        fn              — called after exit animation finishes
 *   children                       — use Modal.Header / Modal.Body / Modal.Footer
 *   footer         node            — legacy quick-footer slot
 *   variant        'default' | 'sheet' | 'dialog' | 'fullscreen'   (default 'default')
 *   size           'sm' | 'md' | 'lg' | 'xl'                       (default 'md')
 *   position       'center' | 'top'   (default variant only)        (default 'center')
 *   closeOnOverlay bool                                              (default true)
 *   closeOnEsc     bool                                              (default true)
 *   showClose      bool                                              (default true)
 *   isLoading      bool            — shows spinner overlay           (default false)
 *   loadingText    string                                             (default 'Loading…')
 *   isDirty        bool            — shows confirm dialog on close   (default false)
 *   confirmTitle   string
 *   confirmMsg     string
 *   className      string          — extra class on the box
 */
function Modal({
    title,
    onClose,
    children,
    footer,
    variant        = 'default',
    size           = 'md',
    position       = 'center',
    closeOnOverlay = true,
    closeOnEsc     = true,
    showClose      = true,
    isLoading      = false,
    loadingText    = 'Loading…',
    isDirty        = false,
    confirmTitle   = 'Discard changes?',
    confirmMsg     = 'You have unsaved changes. Closing will lose them.',
    className      = '',
}) {
    const [leaving,     setLeaving]     = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const boxRef = useRef(null);
    const dragY  = useRef(null);

    useEffect(injectStyles, []);

    /* ── Scroll lock ──────────────────────────────────────── */
    useEffect(() => { lockScroll(); return unlockScroll; }, []);

    /* ── Focus trap — off while loading or confirm is up ──── */
    useFocusTrap(boxRef, !leaving && !isLoading && !showConfirm);

    /* ── Close with exit animation ────────────────────────── */
    const triggerClose = useCallback(() => {
        setLeaving(true);
        setTimeout(() => {
            setLeaving(false);
            onClose();
        }, EXIT_MS);
    }, [onClose]);

    /* ── Request close — check dirty state first ──────────── */
    const requestClose = useCallback(() => {
        if (isDirty) { setShowConfirm(true); return; }
        triggerClose();
    }, [isDirty, triggerClose]);

    /* ── Escape key ───────────────────────────────────────── */
    useEffect(() => {
        if (!closeOnEsc) return;
        const handler = e => {
            if (e.key !== 'Escape') return;
            e.stopPropagation();
            if (showConfirm) { setShowConfirm(false); return; }
            requestClose();
        };
        window.addEventListener('keydown', handler, true);
        return () => window.removeEventListener('keydown', handler, true);
    }, [closeOnEsc, showConfirm, requestClose]);

    /* ── Drag-to-dismiss (sheet variant) ─────────────────── */
    const handleDragDown = useCallback(e => {
        if (variant !== 'sheet') return;
        dragY.current = e.clientY;
        e.currentTarget.setPointerCapture(e.pointerId);
    }, [variant]);

    const handleDragMove = useCallback(e => {
        if (variant !== 'sheet' || dragY.current === null || !boxRef.current) return;
        const dy = Math.max(0, e.clientY - dragY.current);
        boxRef.current.style.transform  = `translateY(${dy}px)`;
        boxRef.current.style.transition = 'none';
        boxRef.current.style.opacity    = `${Math.max(0.3, 1 - dy / 280)}`;
    }, [variant]);

    const handleDragUp = useCallback(e => {
        if (variant !== 'sheet' || dragY.current === null) return;
        const dy = Math.max(0, e.clientY - dragY.current);
        dragY.current = null;
        if (boxRef.current) {
            boxRef.current.style.transform  = '';
            boxRef.current.style.transition = '';
            boxRef.current.style.opacity    = '';
        }
        if (dy > 90) requestClose();
    }, [variant, requestClose]);

    /* ── Context value ────────────────────────────────────── */
    const ctx = { onClose: requestClose, showClose, variant, isLoading };

    /* ── Class strings ────────────────────────────────────── */
    const overlayClass = [
        'ff-m-overlay',
        `ff-m-overlay--${variant}`,
        variant === 'default' && position === 'top' ? 'pos-top' : '',
        leaving ? 'leaving' : '',
    ].filter(Boolean).join(' ');

    const boxClass = [
        'ff-m-box',
        `ff-m-box--${variant}`,
        variant !== 'fullscreen' ? `ff-m-box--${size}` : '',
        leaving  ? 'leaving'  : '',
        className,
    ].filter(Boolean).join(' ');

    /* ── Portal ───────────────────────────────────────────── */
    return createPortal(
        <ModalCtx.Provider value={ctx}>
            <div
                className={overlayClass}
                onClick={closeOnOverlay
                    ? e => { if (e.target === e.currentTarget) requestClose(); }
                    : undefined
                }
                role="dialog"
                aria-modal="true"
                aria-label={typeof title === 'string' ? title : 'Dialog'}
            >
                <div
                    ref={boxRef}
                    className={boxClass}
                    tabIndex={-1}
                    onClick={e => e.stopPropagation()}
                >
                    {/* ── Drag handle ──────────────────────── */}
                    {variant === 'sheet' && (
                        <div
                            className="ff-m-drag"
                            aria-hidden="true"
                            onPointerDown={handleDragDown}
                            onPointerMove={handleDragMove}
                            onPointerUp={handleDragUp}
                            onPointerCancel={handleDragUp}
                        >
                            <div className="ff-m-drag-bar" />
                        </div>
                    )}

                    {/* ── Legacy: title prop ────────────────── */}
                    {title && (
                        <div className="ff-m-header">
                            <div className="ff-m-header-text">
                                <h2 className="ff-m-header-title">{title}</h2>
                            </div>
                            {showClose && (
                                <button
                                    className="ff-m-close-btn"
                                    onClick={requestClose}
                                    aria-label="Close"
                                >
                                    <X size={15} strokeWidth={2.5} />
                                </button>
                            )}
                        </div>
                    )}

                    {/* ── Content ───────────────────────────── */}
                    {title
                        ? <div className="ff-m-body">{children}</div>
                        : children
                    }

                    {/* ── Legacy: footer prop ───────────────── */}
                    {footer && (
                        <div className="ff-m-footer">{footer}</div>
                    )}

                    {/* ── Loading overlay ───────────────────── */}
                    {isLoading && (
                        <div
                            className="ff-m-loading"
                            aria-busy="true"
                            aria-label={loadingText}
                            role="status"
                        >
                            <div className="ff-m-loading-inner">
                                <Loader2 className="ff-m-spinner" size={28} strokeWidth={1.8} />
                                {loadingText && (
                                    <span className="ff-m-loading-text">{loadingText}</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Confirm-close overlay ─────────────── */}
                    {showConfirm && (
                        <div
                            className="ff-m-confirm"
                            role="alertdialog"
                            aria-modal="true"
                            aria-label={confirmTitle}
                        >
                            <div className="ff-m-confirm-box">
                                <div className="ff-m-confirm-icon">
                                    <AlertTriangle size={20} color="#f59e0b" strokeWidth={2} />
                                </div>
                                <p className="ff-m-confirm-title">{confirmTitle}</p>
                                <p className="ff-m-confirm-msg">{confirmMsg}</p>
                                <div className="ff-m-confirm-actions">
                                    <button
                                        className="ff-m-confirm-btn keep"
                                        onClick={() => setShowConfirm(false)}
                                        autoFocus
                                    >
                                        Keep editing
                                    </button>
                                    <button
                                        className="ff-m-confirm-btn discard"
                                        onClick={() => {
                                            setShowConfirm(false);
                                            triggerClose();
                                        }}
                                    >
                                        Discard
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </ModalCtx.Provider>,
        document.body
    );
}

/* ─── Attach compound components ─────────────────────────── */
Modal.Header = ModalHeader;
Modal.Body   = ModalBody;
Modal.Footer = ModalFooter;

export default Modal;
