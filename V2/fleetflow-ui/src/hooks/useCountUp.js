import { useEffect, useRef, useState } from 'react';

/* ─── Easing library ──────────────────────────────────────── */
/**
 * All easings are pure functions: (t: 0→1) → (0→1).
 * Exported so callers can reference them for other animations.
 */
export const EASINGS = {
    'ease-out-cubic':    (t) => 1 - Math.pow(1 - t, 3),
    'ease-out-quart':    (t) => 1 - Math.pow(1 - t, 4),
    'ease-out-expo':     (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
    'ease-in-out-cubic': (t) => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2,
    'bounce': (t) => {
        const n = 7.5625, d = 2.75;
        if (t < 1/d)       return n*t*t;
        if (t < 2/d)       return n*(t -= 1.5/d)*t + 0.75;
        if (t < 2.5/d)     return n*(t -= 2.25/d)*t + 0.9375;
        return                    n*(t -= 2.625/d)*t + 0.984375;
    },
    'linear': (t) => t,
};

/* ─── Reduced-motion check ────────────────────────────────── */
const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ─── Rounding helper ─────────────────────────────────────── */
const round = (val, factor) => Math.round(val * factor) / factor;

/* ════════════════════════════════════════════════════════════
   useCountUp
   ════════════════════════════════════════════════════════════

   Backward compatible — second arg can be a number (legacy):
     useCountUp(100)                  → duration 1200ms, integer
     useCountUp(100, 800)             → duration 800ms  (legacy)

   Options API (new):
     useCountUp(94.5, { decimals: 1 })
     useCountUp(count, { duration: 800, delay: 200, easing: 'ease-out-expo' })
     useCountUp(stats.total, { onComplete: () => setDone(true) })

   Key upgrade over original:
     On target change, animation starts from the CURRENT displayed
     value (not 0). So 47→52 animates 47→52, not 0→52.

   @param  {number|null}   target
   @param  {object|number} [opts]
   @param  {number}          opts.duration   ms            (default 1200)
   @param  {number}          opts.decimals   0–6 places    (default 0)
   @param  {number}          opts.delay      ms before run (default 0)
   @param  {string}          opts.easing     key of EASINGS (default 'ease-out-cubic')
   @param  {function}        opts.onComplete called when finished
   @returns {number}         animated value
   ════════════════════════════════════════════════════════════ */
export default function useCountUp(target, opts = {}) {
    /* Backward compat: useCountUp(n, 800) */
    const options  = typeof opts === 'number' ? { duration: opts } : (opts ?? {});
    const {
        duration   = 1200,
        decimals   = 0,
        delay      = 0,
        easing     = 'ease-out-cubic',
        onComplete,
    } = options;

    const safeTarget = (target == null || isNaN(+target)) ? 0 : +target;

    const [value, setValue]  = useState(0);
    const fromRef            = useRef(0);      // continuously updated — enables smooth re-trigger
    const rafRef             = useRef(null);
    const delayRef           = useRef(null);
    const onCompleteRef      = useRef(onComplete);

    /* Keep callback ref fresh without affecting the animation effect */
    useEffect(() => { onCompleteRef.current = onComplete; });

    useEffect(() => {
        /* ── Cancel any in-flight animation/delay ─────────── */
        if (rafRef.current)   cancelAnimationFrame(rafRef.current);
        if (delayRef.current) clearTimeout(delayRef.current);
        rafRef.current = delayRef.current = null;

        /* ── Snap — reduced motion or zero duration ────────── */
        if (prefersReducedMotion() || duration <= 0) {
            setValue(safeTarget);
            fromRef.current = safeTarget;
            return;
        }

        /* ── No-op — already at target ─────────────────────── */
        if (safeTarget === fromRef.current) return;

        /* ── Capture start position + config for this run ──── */
        const factor    = Math.pow(10, Math.max(0, decimals));
        const easeFn    = EASINGS[easing] ?? EASINGS['ease-out-cubic'];
        const startFrom = fromRef.current;   // where we are RIGHT NOW

        /* ── Core animation loop ────────────────────────────── */
        const run = () => {
            let t0 = null;

            const tick = (ts) => {
                if (t0 === null) t0 = ts;

                const progress = Math.min((ts - t0) / duration, 1);
                const eased    = easeFn(progress);
                const raw      = startFrom + (safeTarget - startFrom) * eased;
                const current  = round(raw, factor);

                setValue(current);
                fromRef.current = current;   // update continuously — smooth interruption

                if (progress < 1) {
                    rafRef.current = requestAnimationFrame(tick);
                } else {
                    /* Snap exactly to target to avoid float drift */
                    setValue(safeTarget);
                    fromRef.current = safeTarget;
                    onCompleteRef.current?.();
                }
            };

            rafRef.current = requestAnimationFrame(tick);
        };

        /* ── Delayed start ──────────────────────────────────── */
        if (delay > 0) {
            delayRef.current = setTimeout(run, delay);
        } else {
            run();
        }

        /* ── Cleanup ────────────────────────────────────────── */
        return () => {
            if (rafRef.current)   cancelAnimationFrame(rafRef.current);
            if (delayRef.current) clearTimeout(delayRef.current);
        };
    }, [safeTarget, duration, delay, easing, decimals]);

    return value;
}
