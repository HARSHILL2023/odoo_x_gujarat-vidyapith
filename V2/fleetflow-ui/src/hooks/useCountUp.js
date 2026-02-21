import { useEffect, useRef, useState } from 'react';

/**
 * useCountUp — animates a number from 0 → target using rAF.
 *
 * @param {number|null} target   — the destination value
 * @param {number}      duration — animation duration in ms (default 1200)
 * @returns {number}             — current animated integer value
 */
export default function useCountUp(target, duration = 1200) {
    const safeTarget = target == null || isNaN(target) ? 0 : Number(target);
    const [value, setValue] = useState(0);
    const rafRef = useRef(null);
    const startRef = useRef(null);
    const startValRef = useRef(0);

    useEffect(() => {
        // Cancel any in-flight animation
        if (rafRef.current) cancelAnimationFrame(rafRef.current);

        // Snap immediately if target is 0 or duration is 0
        if (safeTarget === 0 || duration <= 0) {
            setValue(0);
            return;
        }

        startRef.current = null;
        startValRef.current = 0; // always count from 0 on target change

        const animate = (timestamp) => {
            if (!startRef.current) startRef.current = timestamp;
            const elapsed = timestamp - startRef.current;
            const progress = Math.min(elapsed / duration, 1);

            // Ease-out cubic: fast start, slow finish
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(startValRef.current + (safeTarget - startValRef.current) * eased);

            setValue(current);

            if (progress < 1) {
                rafRef.current = requestAnimationFrame(animate);
            } else {
                setValue(safeTarget);
            }
        };

        rafRef.current = requestAnimationFrame(animate);

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [safeTarget, duration]);

    return value;
}
