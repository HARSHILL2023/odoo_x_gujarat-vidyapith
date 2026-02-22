/**
 * useToast — zero-dependency toast bus using a module-level EventTarget.
 *
 * ── Imperative (anywhere, no React needed) ─────────────────
 *   import toast from '../hooks/useToast';
 *
 *   toast.success('Vehicle saved');
 *   toast.error('Upload failed', { title: 'Error', duration: 6000 });
 *   toast.info('3 trips pending', { action: { label: 'View', onClick: fn } });
 *
 *   const id = toast.loading('Syncing...');   // sticky
 *   toast.update(id, { type: 'success', message: 'Done!', duration: 3000 });
 *   toast.dismiss(id);
 *   toast.dismissAll();
 *
 * ── Promise helper ─────────────────────────────────────────
 *   await toast.promise(fetchVehicles(), {
 *       loading: 'Loading vehicles...',
 *       success: 'Vehicles loaded',
 *       error:   'Failed to load',
 *   });
 *
 * ── React hook (optional — for component-bound toasts) ─────
 *   import { useToast } from '../hooks/useToast';
 *   const toast = useToast();
 *   toast.success('Saved!');
 *
 * ── ToastContainer wires in via: ───────────────────────────
 *   import { onToast } from '../hooks/useToast';
 */

import { useCallback } from 'react';

/* ─── Module-level bus ────────────────────────────────────── */
const bus = new EventTarget();

/* ─── ID factory ──────────────────────────────────────────── */
let _seq = 0;
function makeId() {
    return `ff-t-${++_seq}-${Math.random().toString(36).slice(2, 6)}`;
}

/* ─── Default durations per type ─────────────────────────── */
const DEFAULT_DURATION = {
    success: 3500,
    error:   6000,
    warning: 5000,
    info:    4000,
    loading: 0,     // sticky — must be dismissed manually or via update()
};

/* ═══════════════════════════════════════════════════════════
   CORE DISPATCH (used by all helpers below)
   ═══════════════════════════════════════════════════════════ */

/**
 * Internal — dispatch a SHOW event.
 * @returns {string} id — use with update() / dismiss()
 */
function _show({
    type     = 'info',
    message,
    title,
    duration,
    action,
    id       = makeId(),
}) {
    const ev = Object.assign(new Event('ff-toast'), {
        detail: {
            id,
            type,
            message,
            title,
            action,
            duration: duration ?? DEFAULT_DURATION[type] ?? 4000,
        },
    });
    bus.dispatchEvent(ev);
    return id;
}

/**
 * Internal — dispatch an UPDATE event (mutates a live toast).
 */
function _update(id, patch) {
    const ev = Object.assign(new Event('ff-toast-update'), {
        detail: { id, ...patch },
    });
    bus.dispatchEvent(ev);
}

/**
 * Internal — dispatch a DISMISS event.
 */
function _dismiss(id) {
    const ev = Object.assign(new Event('ff-toast-dismiss'), {
        detail: { id },
    });
    bus.dispatchEvent(ev);
}

/**
 * Internal — dispatch DISMISS-ALL.
 */
function _dismissAll() {
    bus.dispatchEvent(new Event('ff-toast-dismiss-all'));
}

/* ═══════════════════════════════════════════════════════════
   PUBLIC SUBSCRIPTION (used by ToastContainer)
   ═══════════════════════════════════════════════════════════ */

/** Register the toast renderer. Returns unsubscribe fn. */
export function onToast(onShow, onUpdate, onDismiss, onDismissAll) {
    const h1 = (e) => onShow?.(e.detail);
    const h2 = (e) => onUpdate?.(e.detail);
    const h3 = (e) => onDismiss?.(e.detail);
    const h4 = ()  => onDismissAll?.();

    bus.addEventListener('ff-toast',             h1);
    bus.addEventListener('ff-toast-update',      h2);
    bus.addEventListener('ff-toast-dismiss',     h3);
    bus.addEventListener('ff-toast-dismiss-all', h4);

    return () => {
        bus.removeEventListener('ff-toast',             h1);
        bus.removeEventListener('ff-toast-update',      h2);
        bus.removeEventListener('ff-toast-dismiss',     h3);
        bus.removeEventListener('ff-toast-dismiss-all', h4);
    };
}

/* ═══════════════════════════════════════════════════════════
   TOAST OBJECT — default export & named export
   ═══════════════════════════════════════════════════════════ */

/**
 * Show options shared by all helpers:
 * @typedef {Object} ToastOptions
 * @property {string}  [title]             Bold heading above message
 * @property {number}  [duration]          ms — 0 = sticky
 * @property {{ label: string, onClick: fn }} [action]  CTA button
 * @property {string}  [id]                Override generated ID
 */

const toast = {
    /** @param {string} message @param {ToastOptions} [opts] @returns {string} id */
    success: (message, opts = {}) => _show({ type: 'success', message, ...opts }),
    error:   (message, opts = {}) => _show({ type: 'error',   message, ...opts }),
    warning: (message, opts = {}) => _show({ type: 'warning', message, ...opts }),
    info:    (message, opts = {}) => _show({ type: 'info',    message, ...opts }),

    /**
     * Sticky loading toast — returns id.
     * Call toast.update(id, {...}) or toast.dismiss(id) when done.
     */
    loading: (message, opts = {}) => _show({ type: 'loading', message, ...opts }),

    /**
     * Mutate a live toast in-place (e.g. loading → success).
     * @param {string} id
     * @param {{ type?, message?, title?, duration?, action? }} patch
     */
    update: (id, patch) => _update(id, {
        duration: DEFAULT_DURATION[patch.type] ?? 3500,
        ...patch,
    }),

    /** Dismiss a specific toast by id. */
    dismiss:    (id) => _dismiss(id),

    /** Dismiss every visible toast. */
    dismissAll: () => _dismissAll(),

    /**
     * Promise helper — shows loading → success/error automatically.
     *
     * @param {Promise}  promise
     * @param {{
     *   loading: string,
     *   success: string | ((data: any)  => string),
     *   error:   string | ((err: Error) => string),
     *   loadingTitle?: string,
     *   successTitle?: string,
     *   errorTitle?:   string,
     * }} messages
     * @returns {Promise} — resolves/rejects with original promise value
     */
    promise: async (promise, messages) => {
        const id = toast.loading(messages.loading, {
            title: messages.loadingTitle,
        });

        try {
            const data = await promise;

            const msg = typeof messages.success === 'function'
                ? messages.success(data)
                : messages.success;

            toast.update(id, {
                type:    'success',
                message: msg,
                title:   messages.successTitle,
            });
            return data;

        } catch (err) {
            const msg = typeof messages.error === 'function'
                ? messages.error(err)
                : messages.error;

            toast.update(id, {
                type:     'error',
                message:  msg,
                title:    messages.errorTitle,
                duration: 6000,
            });
            throw err;
        }
    },
};

export default toast;

/* ─── Named export for convenience ───────────────────────── */
export const { success, error, warning, info, loading, update, dismiss, dismissAll, promise } = toast;

/* ═══════════════════════════════════════════════════════════
   REACT HOOK (optional)
   ═══════════════════════════════════════════════════════════ */
/**
 * useToast — stable reference to the toast object.
 * All methods are already stable (module-level), so this is
 * just a convenience wrapper so you can destructure in components.
 *
 * const { success, error, loading, promise } = useToast();
 */
export function useToast() {
    const success = useCallback(toast.success, []);
    const error   = useCallback(toast.error,   []);
    const warning = useCallback(toast.warning, []);
    const info    = useCallback(toast.info,    []);
    const loading = useCallback(toast.loading, []);
    const update  = useCallback(toast.update,  []);
    const dismiss = useCallback(toast.dismiss, []);
    const promise = useCallback(toast.promise, []);

    return { success, error, warning, info, loading, update, dismiss, dismissAll, promise };
}

// ─── Backward-compat shim ─────────────────────────────────
// Keeps old imports like: import { showToast } from '../hooks/useToast'
export function showToast({ message, type = 'info', duration, title, action } = {}) {
    return _show({ type, message, duration, title, action });
}
