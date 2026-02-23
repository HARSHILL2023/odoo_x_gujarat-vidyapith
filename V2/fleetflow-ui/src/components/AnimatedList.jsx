import { Children, useCallback, useEffect, useRef, useState, useMemo } from 'react';

/* ─── Constants ───────────────────────────────────────────── */
const STYLE_ID = 'ff-al-styles';
const ENTER_MS = 1000;
const EXIT_MS = 400;

let _uid = 0;
const nextId = () => String(++_uid);

/* ─── CSS ─────────────────────────────────────────────────── */
const CSS = `
/* ── Enter keyframes ───────────────────────────────────────── */
@keyframes ff-al-slide {
    0%   { opacity: 0; transform: translateY(28px) scale(0.97); }
    60%  { opacity: 1; transform: translateY(-3px) scale(1.003); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes ff-al-fade {
    from { opacity: 0; }
    to   { opacity: 1; }
}
@keyframes ff-al-scale {
    0%   { opacity: 0; transform: scale(0.82); }
    65%  { opacity: 1; transform: scale(1.04); }
    100% { opacity: 1; transform: scale(1); }
}
@keyframes ff-al-blur {
    from { opacity: 0; transform: translateY(16px); filter: blur(7px); }
    to   { opacity: 1; transform: translateY(0);    filter: blur(0);   }
}
@keyframes ff-al-spring {
    0%   { opacity: 0; transform: translateY(38px) scale(0.9) rotate(-1.2deg); }
    55%  { opacity: 1; transform: translateY(-7px) scale(1.02) rotate(0.4deg); }
    78%  { transform: translateY(2px) scale(0.999) rotate(0deg); }
    100% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
}

/* ── Slot shell — grid-template-rows collapses height smoothly */
.ff-al-slot {
    display: grid;
    grid-template-rows: 1fr;
    opacity: 1;
    transition:
        grid-template-rows ${EXIT_MS}ms cubic-bezier(0.4, 0, 0.2, 1),
        opacity             ${EXIT_MS}ms ease;
}
.ff-al-slot-inner { overflow: hidden; min-height: 0; }

/* ── Phase: leaving ────────────────────────────────────────── */
.ff-al-slot.ff-leaving {
    grid-template-rows: 0fr;
    opacity: 0;
}

/* ── Phase: entering (loop) ────────────────────────────────── */
.ff-al-slot.ff-entering .ff-al-slot-inner {
    animation-duration: ${ENTER_MS}ms;
    animation-fill-mode: both;
}
.ff-al-slot.ff-entering.v-slide  .ff-al-slot-inner { animation-name: ff-al-slide;  animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1); }
.ff-al-slot.ff-entering.v-fade   .ff-al-slot-inner { animation-name: ff-al-fade;   animation-timing-function: ease; }
.ff-al-slot.ff-entering.v-scale  .ff-al-slot-inner { animation-name: ff-al-scale;  animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1); }
.ff-al-slot.ff-entering.v-blur   .ff-al-slot-inner { animation-name: ff-al-blur;   animation-timing-function: ease; }
.ff-al-slot.ff-entering.v-spring .ff-al-slot-inner { animation-name: ff-al-spring; animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }

/* ── Stagger mode ──────────────────────────────────────────── */
.ff-al-stagger {
    animation-duration: ${ENTER_MS}ms;
    animation-fill-mode: both;
}
.ff-al-stagger.v-slide  { animation-name: ff-al-slide;  animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1); }
.ff-al-stagger.v-fade   { animation-name: ff-al-fade;   animation-timing-function: ease; }
.ff-al-stagger.v-scale  { animation-name: ff-al-scale;  animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1); }
.ff-al-stagger.v-blur   { animation-name: ff-al-blur;   animation-timing-function: ease; }
.ff-al-stagger.v-spring { animation-name: ff-al-spring; animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }

/* ── Progress dots ─────────────────────────────────────────── */
.ff-al-dots {
    display: flex; align-items: center; justify-content: center;
    gap: 5px; margin-top: 10px;
}
.ff-al-dot {
    height: 6px; border-radius: 3px; border: none; cursor: pointer; padding: 0;
    background: rgba(255,255,255,0.12);
    transition: background 0.25s ease, width 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s ease;
    width: 6px;
}
.ff-al-dot.active {
    width: 20px;
    background: var(--accent, #3b82f6);
    box-shadow: 0 0 8px rgba(59,130,246,0.5);
}
.ff-al-dot:hover:not(.active) {
    background: var(--text-muted, #64748b);
    transform: scaleY(1.3);
}
.ff-al-dot:focus-visible {
    outline: 2px solid var(--accent, #3b82f6);
    outline-offset: 2px;
}

/* ── Pause overlay hint ────────────────────────────────────── */
.ff-al-paused-hint {
    display: flex; align-items: center; justify-content: center;
    gap: 5px; margin-top: 6px;
    font-size: 10px; color: var(--text-muted, #64748b);
    opacity: 0; transition: opacity 0.2s ease;
    pointer-events: none;
}
.ff-al-loop-wrap:hover .ff-al-paused-hint { opacity: 1; }

/* ── Reduced motion ────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
    .ff-al-slot        { transition: none; }
    .ff-al-slot-inner  { animation: none !important; opacity: 1; }
    .ff-al-stagger     { animation: none !important; opacity: 1; }
    .ff-al-slot.ff-leaving { display: none; }
    .ff-al-dot         { transition: none; }
}
`;

function injectStyles() {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
}

/**
 * AnimatedList — two modes:
 *
 * loop={false}  (default — used in WelcomeModal)
 *   Staggered entrance: items appear one-by-one from below.
 *   Uses IntersectionObserver — only starts when component is in viewport.
 *   Resets automatically when children array length changes.
 *
 * loop={true}   (used in Help page Quick Tips)
 *   Continuous ticker with smooth enter+exit animations.
 *   Top item collapses away (CSS grid-template-rows), new item slides in.
 *
 * Props:
 *   children        React elements
 *   delay           ms between items / tick interval        (default 800)
 *   loop            enable loop/ticker mode                 (default false)
 *   visible         items shown at once in loop mode        (default 4)
 *   variant         'slide' | 'fade' | 'scale' | 'blur' | 'spring'  (default 'slide')
 *   gap             px gap between items                    (default 10)
 *   direction       'forward' | 'backward' in loop mode    (default 'forward')
 *   pauseOnHover    pause ticker on mouse hover             (default true)
 *   showProgress    show clickable dot progress bar         (default false)
 *   onActiveChange  (idx: number) => void callback          (optional)
 *   itemClassName   extra class on each item wrapper        (optional)
 */
export default function AnimatedList({
    children,
    delay = 800,
    loop = false,
    visible: visibleCount = 4,
    variant = 'slide',
    gap = 10,
    direction = 'forward',
    pauseOnHover = true,
    showProgress = false,
    onActiveChange,
    itemClassName = '',
    autoScroll = false,
}) {
    const items = Children.toArray(children);
    const itemCount = items.length;
    const effective = Math.min(visibleCount, itemCount);

    useEffect(injectStyles, []);

    /* ─── LOOP MODE ───────────────────────────────────────────── */
    const [slots, setSlots] = useState([]);
    const paused = useRef(false);
    const pendingIds = useRef([]);

    const clearPending = useCallback(() => {
        pendingIds.current.forEach(clearTimeout);
        pendingIds.current = [];
    }, []);

    // Advance one tick — marks oldest slot as leaving, appends new entering slot
    const advance = useCallback(() => {
        if (paused.current) return;

        setSlots(prev => {
            // Guard: don't overlap transitions (handles fast intervals)
            const busy = prev.some(s => s.phase === 'leaving' || s.phase === 'entering');
            if (busy) return prev;

            const nonLeaving = prev.filter(s => s.phase !== 'leaving');
            if (nonLeaving.length === 0) return prev;

            const lastStable = nonLeaving.at(-1);
            const nextIdx = direction === 'forward'
                ? (lastStable.idx + 1) % itemCount
                : (lastStable.idx - 1 + itemCount) % itemCount;

            onActiveChange?.(nextIdx);

            // Mark first slot as leaving; append new entering slot
            let markedLeaving = false;
            return [
                ...prev.map(s => {
                    if (!markedLeaving) { markedLeaving = true; return { ...s, phase: 'leaving' }; }
                    return s;
                }),
                { id: nextId(), idx: nextIdx, phase: 'entering' },
            ];
        });

        // Remove leaving slot after CSS transition completes
        const t1 = setTimeout(() => {
            setSlots(p => p.filter(s => s.phase !== 'leaving'));
        }, EXIT_MS + 40);

        // Promote entering slot to stable after animation
        const t2 = setTimeout(() => {
            setSlots(p => p.map(s =>
                s.phase === 'entering' ? { ...s, phase: 'stable' } : s
            ));
        }, ENTER_MS + 40);

        pendingIds.current.push(t1, t2);
    }, [itemCount, direction, onActiveChange]);

    // Jump directly to a specific item index (used by progress dots)
    const jumpTo = useCallback((targetIdx) => {
        clearPending();
        setSlots(
            Array.from({ length: effective }, (_, i) => ({
                id: nextId(),
                idx: (targetIdx + i) % Math.max(1, itemCount),
                phase: i === effective - 1 ? 'entering' : 'stable',
            }))
        );
        onActiveChange?.(targetIdx);
        const t = setTimeout(() => {
            setSlots(p => p.map(s =>
                s.phase === 'entering' ? { ...s, phase: 'stable' } : s
            ));
        }, ENTER_MS + 40);
        pendingIds.current.push(t);
    }, [itemCount, effective, clearPending, onActiveChange]);

    // Initialize slots when loop params change
    useEffect(() => {
        if (!loop || itemCount === 0) return;
        clearPending();
        setSlots(
            Array.from({ length: effective }, (_, i) => ({
                id: nextId(),
                idx: i % Math.max(1, itemCount),
                phase: 'stable',
            }))
        );
    }, [loop, itemCount, effective, clearPending]);

    // Main ticker interval
    useEffect(() => {
        if (!loop || itemCount === 0) return;
        const id = setInterval(advance, delay);
        return () => { clearInterval(id); clearPending(); };
    }, [loop, delay, itemCount, advance, clearPending]);

    // Page Visibility API — pause when tab is backgrounded
    useEffect(() => {
        if (!loop) return;
        const handler = () => { paused.current = document.hidden; };
        document.addEventListener('visibilitychange', handler);
        return () => document.removeEventListener('visibilitychange', handler);
    }, [loop]);

    // Cleanup all pending timers on unmount
    useEffect(() => clearPending, [clearPending]);

    /* ─── STAGGER MODE ────────────────────────────────────────── */
    const [shown, setShown] = useState(0);
    const [inView, setInView] = useState(false);
    const containerRef = useRef(null);
    const prevCountRef = useRef(itemCount);

    // Reset when children array length changes (e.g. data reload)
    useEffect(() => {
        if (!loop && prevCountRef.current !== itemCount) {
            setShown(0);
            setInView(false);
            prevCountRef.current = itemCount;
        }
    }, [itemCount, loop]);

    // IntersectionObserver — only animate into view, not on initial hidden render
    useEffect(() => {
        if (loop) return;
        if (!('IntersectionObserver' in window)) { setInView(true); return; }
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setInView(true); },
            { threshold: 0.1 }
        );
        const el = containerRef.current;
        if (el) observer.observe(el);
        return () => observer.disconnect();
    }, [loop]);

    // Trigger first item once in view
    useEffect(() => {
        if (!loop && inView && shown === 0) setShown(1);
    }, [inView, loop, shown]);

    // Cascade remaining items
    useEffect(() => {
        if (loop || !inView || shown === 0 || shown >= itemCount) return;
        const t = setTimeout(() => setShown(n => n + 1), delay);
        return () => clearTimeout(t);
    }, [shown, itemCount, delay, loop, inView]);

    // Auto-scroll logic for staggered mode
    useEffect(() => {
        if (!loop && autoScroll && shown > 0 && containerRef.current) {
            const container = containerRef.current;
            // Recursively find the closest scrollable parent
            let parent = container.parentElement;
            while (parent && parent !== document.body) {
                const overflowY = window.getComputedStyle(parent).overflowY;
                if (overflowY === 'auto' || overflowY === 'scroll') {
                    parent.scrollTo({
                        top: parent.scrollHeight,
                        behavior: 'smooth'
                    });
                    break;
                }
                parent = parent.parentElement;
            }
        }
    }, [shown, loop, autoScroll]);

    /* ─── Active index for progress dots ─────────────────────── */
    const activeIdx = useMemo(() => {
        const s = slots.find(s => s.phase === 'entering') ?? slots.find(s => s.phase === 'stable');
        return s?.idx ?? 0;
    }, [slots]);

    /* ─── Empty guard ─────────────────────────────────────────── */
    if (itemCount === 0) return null;

    /* ─── LOOP RENDER ─────────────────────────────────────────── */
    if (loop) {
        return (
            <div>
                <div
                    className="ff-al-loop-wrap"
                    style={{ display: 'flex', flexDirection: 'column', gap }}
                    aria-live="polite"
                    aria-atomic="false"
                    aria-label="Rotating tips"
                    onMouseEnter={pauseOnHover ? () => { paused.current = true; } : undefined}
                    onMouseLeave={pauseOnHover ? () => { paused.current = false; } : undefined}
                >
                    {slots.map(slot => (
                        <div
                            key={slot.id}
                            className={[
                                'ff-al-slot',
                                slot.phase === 'leaving' ? 'ff-leaving' : '',
                                slot.phase === 'entering' ? `ff-entering v-${variant}` : '',
                                itemClassName,
                            ].filter(Boolean).join(' ')}
                        >
                            <div className="ff-al-slot-inner">
                                {items[slot.idx]}
                            </div>
                        </div>
                    ))}

                    {/* Pause hint — visible on hover */}
                    {pauseOnHover && (
                        <div className="ff-al-paused-hint" aria-hidden="true">
                            ⏸ Paused
                        </div>
                    )}
                </div>

                {/* Progress dots */}
                {showProgress && itemCount > 1 && (
                    <div className="ff-al-dots" role="tablist" aria-label="Navigate tips">
                        {items.map((_, i) => (
                            <button
                                key={i}
                                role="tab"
                                className={`ff-al-dot ${i === activeIdx ? 'active' : ''}`}
                                aria-selected={i === activeIdx}
                                aria-label={`Tip ${i + 1} of ${itemCount}`}
                                onClick={() => jumpTo(i)}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    /* ─── STAGGER RENDER ──────────────────────────────────────── */
    return (
        <div
            ref={containerRef}
            style={{ display: 'flex', flexDirection: 'column', gap }}
        >
            {items.slice(0, shown).map((child, i) => (
                <div
                    key={i}
                    className={`ff-al-stagger v-${variant} ${itemClassName}`.trim()}
                >
                    {child}
                </div>
            ))}
        </div>
    );
}

