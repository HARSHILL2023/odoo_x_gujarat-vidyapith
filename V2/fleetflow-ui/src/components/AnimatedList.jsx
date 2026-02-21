import { useEffect, useRef, useState } from 'react';

/**
 * AnimatedList — two modes:
 *
 * loop={false}  (default in WelcomeModal)
 *   Staggered entrance: items appear one by one from below, pause between each.
 *   delay = ms between appearance of each card.
 *
 * loop={true}  (used in Help page Quick Tips)
 *   Continuous ticker: shows `visible` items at once, cycles through the full
 *   list forever.  A new item slides in from below every `delay` ms, pushing
 *   older ones upward.
 *
 * Props:
 *   children   — React elements
 *   delay      — ms between items (default 800)
 *   loop       — enable looping ticker mode (default false)
 *   visible    — how many cards to show at once in loop mode (default 4)
 */
export default function AnimatedList({ children, delay = 800, loop = false, visible: visibleCount = 4 }) {
  const items = Array.isArray(children) ? children : [children];

  /* ─── STAGGER MODE ─────────────────────────────────────────────────── */
  const [count, setCount] = useState(1);

  useEffect(() => {
    if (loop) return;
    if (count >= items.length) return;
    const t = setTimeout(() => setCount(c => c + 1), delay);
    return () => clearTimeout(t);
  }, [count, items.length, delay, loop]);

  /* ─── LOOP / TICKER MODE ────────────────────────────────────────────── */
  // `head` is the index of the OLDEST visible item (top of the window).
  // `newKey` increments each tick so the newest card always re-animates.
  const [head, setHead] = useState(0);
  const [newKey, setNewKey] = useState(0);
  const loopRef = useRef(null);

  useEffect(() => {
    if (!loop) return;
    loopRef.current = setInterval(() => {
      setHead(h => (h + 1) % items.length);
      setNewKey(k => k + 1);
    }, delay);
    return () => clearInterval(loopRef.current);
  }, [loop, delay, items.length]);

  /* ─── SHARED KEYFRAMES ──────────────────────────────────────────────── */
  const css = `
    @keyframes ff-card-in {
      0%   { opacity: 0; transform: translateY(36px) scale(0.95); filter: blur(8px); }
      55%  { opacity: 1; transform: translateY(-3px) scale(1.005); filter: blur(0px); }
      100% { opacity: 1; transform: translateY(0)    scale(1);     filter: blur(0px); }
    }
    @keyframes ff-card-out {
      0%   { opacity: 1; transform: translateY(0) scale(1); }
      100% { opacity: 0; transform: translateY(-20px) scale(0.97); }
    }
    .ff-card {
      animation: ff-card-in 0.85s cubic-bezier(0.16, 1, 0.3, 1) both;
      will-change: transform, opacity, filter;
    }
    .ff-card:hover {
      transform: translateY(-2px) scale(1.018) !important;
      transition: transform 0.25s ease, box-shadow 0.25s ease !important;
    }
  `;

  /* ─── LOOP RENDER ───────────────────────────────────────────────────── */
  if (loop) {
    // Build the window: visibleCount items ending with the "newest" at bottom
    const window = [];
    for (let i = visibleCount - 1; i >= 0; i--) {
      const idx = (head + items.length - i) % items.length;
      window.push({ idx, isNew: i === 0 });
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <style>{css}</style>
        {window.map(({ idx, isNew }) => (
          <div
            key={isNew ? `new-${newKey}` : `item-${idx}`}
            className="ff-card"
            style={isNew ? {} : { animation: 'none' }}
          >
            {items[idx]}
          </div>
        ))}
      </div>
    );
  }

  /* ─── STAGGER RENDER ────────────────────────────────────────────────── */
  const staggerVisible = items.slice(0, count);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <style>{css}</style>
      {staggerVisible.map((child, i) => (
        <div key={`stagger-${i}`} className="ff-card">
          {child}
        </div>
      ))}
    </div>
  );
}
