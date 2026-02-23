import { forwardRef, useEffect } from 'react';
import {
  AlertTriangle, Ban, CheckCircle2, CircleX,
  Clock, Pause, Timer, Truck, Wrench,
} from 'lucide-react';

/* ─── Constants ───────────────────────────────────────────── */
const STYLE_ID = 'ff-badge-styles';

/* ─── CSS ─────────────────────────────────────────────────── */
const CSS = `
@keyframes ff-badge-pulse {
    0%, 100% { box-shadow: 0 0 0 0 var(--ff-badge-dot);  }
    55%       { box-shadow: 0 0 0 4px transparent;        }
}
@keyframes ff-badge-shake {
    0%,100% { transform: translateX(0)   rotate(0deg);    }
    20%     { transform: translateX(-3px) rotate(-1.2deg); }
    40%     { transform: translateX(3px)  rotate(1.2deg);  }
    60%     { transform: translateX(-2px) rotate(0deg);    }
    80%     { transform: translateX(2px);                  }
}
@keyframes ff-badge-spin {
    to { transform: rotate(360deg); }
}
@keyframes ff-badge-in {
    from { opacity: 0; transform: scale(0.8); }
    to   { opacity: 1; transform: scale(1);   }
}

/* ── Base ──────────────────────────────────────────────────── */
.ff-badge {
    display: inline-flex; align-items: center;
    border-radius: 999px; white-space: nowrap;
    font-family: var(--font-body); font-weight: 600;
    letter-spacing: 0.25px; user-select: none;
    border: 1px solid transparent; line-height: 1;
    animation: ff-badge-in 0.18s cubic-bezier(0.16,1,0.3,1) both;
    transition: filter 0.12s ease, transform 0.12s ease;
}
.ff-badge:focus-visible {
    outline: 2px solid var(--accent, #3b82f6);
    outline-offset: 2px;
}

/* ── Sizes ─────────────────────────────────────────────────── */
.ff-badge-xs { font-size: 9.5px;  padding: 2px 7px;  gap: 3px; }
.ff-badge-sm { font-size: 10.5px; padding: 3px 8px;  gap: 4px; }
.ff-badge-md { font-size: 11.5px; padding: 4px 10px; gap: 5px; }
.ff-badge-lg { font-size: 13px;   padding: 5px 13px; gap: 6px; }

/* ── Interactive ───────────────────────────────────────────── */
.ff-badge-btn { cursor: pointer; }
.ff-badge-btn:hover  { filter: brightness(1.14); transform: scale(1.04); }
.ff-badge-btn:active { transform: scale(0.96); }

/* ── State modifiers ───────────────────────────────────────── */
.ff-badge-shake        { animation: ff-badge-shake 0.44s ease both; }
.ff-badge-strikethrough { text-decoration: line-through; opacity: 0.7; }
.ff-badge-spin-icon    { display: inline-flex; animation: ff-badge-spin 2.8s linear infinite; }

/* ── Dot ───────────────────────────────────────────────────── */
.ff-badge-dot {
    border-radius: 50%; flex-shrink: 0;
    background: var(--ff-badge-dot);
}
.ff-badge-xs .ff-badge-dot,
.ff-badge-sm .ff-badge-dot { width: 5px; height: 5px; }
.ff-badge-md .ff-badge-dot { width: 6px; height: 6px; }
.ff-badge-lg .ff-badge-dot { width: 7px; height: 7px; }
.ff-badge-dot-pulse { animation: ff-badge-pulse 1.9s ease-in-out infinite; }

/* ══════════════════════════════════════════════════════════
   COLOR × VARIANT MATRIX  (soft | solid | outline | ghost)
   ══════════════════════════════════════════════════════════ */

/* ── Green ──────────────────────────────────── */
.ff-c-green { --ff-badge-dot: #22c55e; }
.ff-c-green.ff-v-soft    { background:rgba(34,197,94,0.12);  border-color:rgba(34,197,94,0.22);  color:#4ade80; }
.ff-c-green.ff-v-solid   { background:#16a34a;               border-color:#15803d;               color:#fff;    }
.ff-c-green.ff-v-outline { background:transparent;           border-color:rgba(34,197,94,0.55);  color:#4ade80; }
.ff-c-green.ff-v-ghost   { background:transparent;           border-color:transparent;           color:#4ade80; }

/* ── Blue ───────────────────────────────────── */
.ff-c-blue { --ff-badge-dot: #3b82f6; }
.ff-c-blue.ff-v-soft    { background:rgba(59,130,246,0.12); border-color:rgba(59,130,246,0.22); color:#60a5fa; }
.ff-c-blue.ff-v-solid   { background:#2563eb;               border-color:#1d4ed8;               color:#fff;    }
.ff-c-blue.ff-v-outline { background:transparent;           border-color:rgba(59,130,246,0.55); color:#60a5fa; }
.ff-c-blue.ff-v-ghost   { background:transparent;           border-color:transparent;           color:#60a5fa; }

/* ── Sky ────────────────────────────────────── */
.ff-c-sky { --ff-badge-dot: #38bdf8; }
.ff-c-sky.ff-v-soft    { background:rgba(56,189,248,0.12); border-color:rgba(56,189,248,0.22); color:#7dd3fc; }
.ff-c-sky.ff-v-solid   { background:#0284c7;               border-color:#0369a1;               color:#fff;    }
.ff-c-sky.ff-v-outline { background:transparent;           border-color:rgba(56,189,248,0.55); color:#7dd3fc; }
.ff-c-sky.ff-v-ghost   { background:transparent;           border-color:transparent;           color:#7dd3fc; }

/* ── Amber ──────────────────────────────────── */
.ff-c-amber { --ff-badge-dot: #f59e0b; }
.ff-c-amber.ff-v-soft    { background:rgba(245,158,11,0.12); border-color:rgba(245,158,11,0.22); color:#fbbf24; }
.ff-c-amber.ff-v-solid   { background:#d97706;               border-color:#b45309;               color:#fff;    }
.ff-c-amber.ff-v-outline { background:transparent;           border-color:rgba(245,158,11,0.55); color:#fbbf24; }
.ff-c-amber.ff-v-ghost   { background:transparent;           border-color:transparent;           color:#fbbf24; }

/* ── Orange ─────────────────────────────────── */
.ff-c-orange { --ff-badge-dot: #f97316; }
.ff-c-orange.ff-v-soft    { background:rgba(249,115,22,0.12); border-color:rgba(249,115,22,0.22); color:#fb923c; }
.ff-c-orange.ff-v-solid   { background:#ea580c;               border-color:#c2410c;               color:#fff;    }
.ff-c-orange.ff-v-outline { background:transparent;           border-color:rgba(249,115,22,0.55); color:#fb923c; }
.ff-c-orange.ff-v-ghost   { background:transparent;           border-color:transparent;           color:#fb923c; }

/* ── Red ────────────────────────────────────── */
.ff-c-red { --ff-badge-dot: #ef4444; }
.ff-c-red.ff-v-soft    { background:rgba(239,68,68,0.12);  border-color:rgba(239,68,68,0.22);  color:#f87171; }
.ff-c-red.ff-v-solid   { background:#dc2626;               border-color:#b91c1c;               color:#fff;    }
.ff-c-red.ff-v-outline { background:transparent;           border-color:rgba(239,68,68,0.55);  color:#f87171; }
.ff-c-red.ff-v-ghost   { background:transparent;           border-color:transparent;           color:#f87171; }

/* ── Purple ─────────────────────────────────── */
.ff-c-purple { --ff-badge-dot: #a855f7; }
.ff-c-purple.ff-v-soft    { background:rgba(168,85,247,0.12); border-color:rgba(168,85,247,0.22); color:#c084fc; }
.ff-c-purple.ff-v-solid   { background:#9333ea;               border-color:#7e22ce;               color:#fff;    }
.ff-c-purple.ff-v-outline { background:transparent;           border-color:rgba(168,85,247,0.55); color:#c084fc; }
.ff-c-purple.ff-v-ghost   { background:transparent;           border-color:transparent;           color:#c084fc; }

/* ── Gray ───────────────────────────────────── */
.ff-c-gray { --ff-badge-dot: #64748b; }
.ff-c-gray.ff-v-soft    { background:rgba(100,116,139,0.1);  border-color:rgba(100,116,139,0.2);  color:#94a3b8; }
.ff-c-gray.ff-v-solid   { background:#475569;                border-color:#334155;                color:#fff;    }
.ff-c-gray.ff-v-outline { background:transparent;            border-color:rgba(100,116,139,0.45); color:#94a3b8; }
.ff-c-gray.ff-v-ghost   { background:transparent;            border-color:transparent;            color:#94a3b8; }

/* ── Reduced motion ────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
    .ff-badge, .ff-badge-dot-pulse,
    .ff-badge-shake, .ff-badge-spin-icon { animation: none !important; }
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

/* ─── Status map ──────────────────────────────────────────── */
export const STATUS_MAP = {
  /* ── Vehicle ──────────────────────────────── */
  available: { label: 'Available', color: 'green', dot: true, pulse: true },
  on_trip: { label: 'On Trip', color: 'sky', Icon: Truck, pulse: true },
  in_shop: { label: 'In Shop', color: 'amber', Icon: Wrench, spin: true },
  idle: { label: 'Idle', color: 'gray', dot: true, pulse: false },
  retired: { label: 'Retired', color: 'gray', dot: false, strikethrough: true },

  /* ── Driver ───────────────────────────────── */
  on_duty: { label: 'On Duty', color: 'green', dot: true, pulse: false },
  off_duty: { label: 'Off Duty', color: 'gray', dot: true, pulse: false },
  suspended: { label: 'Suspended', color: 'red', Icon: Ban, shake: true },
  expired: { label: 'Expired', color: 'red', Icon: AlertTriangle, shake: true },

  /* ── Trip ─────────────────────────────────── */
  draft: { label: 'Draft', color: 'gray', dot: true, pulse: false },
  pending: { label: 'Pending', color: 'amber', Icon: Timer, pulse: false },
  dispatched: { label: 'Dispatched', color: 'blue', dot: true, pulse: true },
  in_transit: { label: 'In Transit', color: 'sky', dot: true, pulse: true },
  completed: { label: 'Completed', color: 'green', Icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'red', Icon: CircleX },
  overdue: { label: 'Overdue', color: 'orange', Icon: AlertTriangle, shake: true },

  /* ── Maintenance ──────────────────────────── */
  scheduled: { label: 'Scheduled', color: 'amber', Icon: Clock, pulse: false },
  in_progress: { label: 'In Progress', color: 'blue', dot: true, pulse: true },
  done: { label: 'Done', color: 'green', Icon: CheckCircle2 },

  /* ── Generic ──────────────────────────────── */
  active: { label: 'Active', color: 'green', dot: true, pulse: true },
  inactive: { label: 'Inactive', color: 'gray', dot: true, pulse: false },
  paused: { label: 'Paused', color: 'amber', Icon: Pause },
  error: { label: 'Error', color: 'red', Icon: AlertTriangle, shake: true },
};

/* ─── Icon size map ───────────────────────────────────────── */
const ICON_SIZE = { xs: 9, sm: 10, md: 11, lg: 13 };

/* ─── Component ───────────────────────────────────────────── */
/**
 * Props:
 *   status        string key from STATUS_MAP               (required)
 *   variant       'soft' | 'solid' | 'outline' | 'ghost'  (default 'soft')
 *   size          'xs' | 'sm' | 'md' | 'lg'               (default 'md')
 *   config        partial STATUS_MAP entry — overrides     (optional)
 *   noAnimation   suppress all animations                  (default false)
 *   onClick       fn — makes badge a <button>              (optional)
 *   className     extra class on root element              (optional)
 */
const StatusBadge = forwardRef(function StatusBadge(
  {
    status,
    variant = 'soft',
    size = 'md',
    config: configOverride,
    noAnimation = false,
    onClick,
    className = '',
  },
  ref
) {
  useEffect(injectStyles, []);

  /* Merge: STATUS_MAP base → caller override */
  const cfg = {
    ...(STATUS_MAP[status] ?? {
      label: status ?? '—',
      color: 'gray',
      dot: true,
    }),
    ...configOverride,
  };

  /* ── Class assembly ───────────────────────────────────── */
  const cls = [
    'ff-badge',
    `ff-badge-${size}`,
    `ff-c-${cfg.color}`,
    `ff-v-${variant}`,
    !noAnimation && cfg.shake ? 'ff-badge-shake' : '',
    cfg.strikethrough ? 'ff-badge-strikethrough' : '',
    onClick ? 'ff-badge-btn' : '',
    className,
  ].filter(Boolean).join(' ');

  const dotCls = [
    'ff-badge-dot',
    !noAnimation && cfg.pulse ? 'ff-badge-dot-pulse' : '',
  ].filter(Boolean).join(' ');

  const Tag = onClick ? 'button' : 'span';
  const iconSize = ICON_SIZE[size] ?? 11;

  return (
    <Tag
      ref={ref}
      className={cls}
      onClick={onClick}
      {...(onClick ? { type: 'button' } : {})}
      aria-label={`Status: ${cfg.label}`}
    >
      {/* Left indicator: Lucide icon OR dot OR nothing */}
      {cfg.Icon ? (
        <span
          className={!noAnimation && cfg.spin ? 'ff-badge-spin-icon' : undefined}
          aria-hidden="true"
          style={{ display: 'inline-flex', flexShrink: 0 }}
        >
          <cfg.Icon size={iconSize} strokeWidth={2.5} />
        </span>
      ) : cfg.dot !== false ? (
        <span className={dotCls} aria-hidden="true" />
      ) : null}

      {cfg.label}
    </Tag>
  );
});

import { memo } from 'react';

StatusBadge.displayName = 'StatusBadge';
export default memo(StatusBadge);
