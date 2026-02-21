/**
 * useToast — zero-dependency toast system using a module-level EventTarget.
 *
 * Usage (anywhere in the app, no React context needed):
 *   import { showToast } from '../hooks/useToast';
 *   showToast({ message: 'Saved!', type: 'success' });
 *   showToast({ message: 'Failed', type: 'error', duration: 6000 });
 *
 * Types: 'success' | 'error' | 'warning' | 'info'
 */

const bus = new EventTarget();

export function showToast({ message, type = 'info', duration = 4000 }) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    bus.dispatchEvent(
        Object.assign(new Event('ff-toast'), { detail: { id, message, type, duration } })
    );
}

export function onToast(callback) {
    const handler = (e) => callback(e.detail);
    bus.addEventListener('ff-toast', handler);
    return () => bus.removeEventListener('ff-toast', handler);
}
