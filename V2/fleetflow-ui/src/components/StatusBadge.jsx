import { useEffect } from 'react';

/* ─── Style injection (once per app lifetime) ─────────────────────────── */
const STYLE_ID = 'ff-status-badge-styles';

const CSS = `
  .ff-sb {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.3px;
    white-space: nowrap;
    font-family: var(--font-body);
    user-select: none;
  }

  /* Dot */
  .ff-sb-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
    display: inline-block;
  }

  /* Icon instead of dot */
  .ff-sb-icon {
    font-style: normal;
    font-size: 10px;
    line-height: 1;
  }

  /* Pulse animation on dot */
  .ff-sb-dot--pulse {
    animation: pulse-dot 1.6s ease-in-out infinite;
  }

  /* Shake on mount for suspended */
  .ff-sb--shake {
    animation: shake 0.4s ease both;
  }

  /* Slow spin for in_shop wrench */
  .ff-sb-icon--spin {
    display: inline-block;
    animation: slowSpin 3s linear infinite;
  }

  /* Strikethrough text for retired */
  .ff-sb--strikethrough {
    text-decoration: line-through;
    opacity: 0.75;
  }

  /* Color variants */
  .ff-sb--green  { background: var(--green-bg);  color: var(--green-t);  }
  .ff-sb--blue   { background: var(--blue-bg);   color: var(--blue-t);  }
  .ff-sb--amber  { background: var(--orange-bg); color: var(--orange-t); }
  .ff-sb--red    { background: var(--red-bg);    color: var(--red-t);   }
  .ff-sb--gray   { background: var(--gray-bg);   color: var(--gray-t);  }

  .ff-sb--green  .ff-sb-dot { background: var(--green-t);  }
  .ff-sb--blue   .ff-sb-dot { background: var(--blue-t);   }
  .ff-sb--amber  .ff-sb-dot { background: var(--orange-t); }
  .ff-sb--red    .ff-sb-dot { background: var(--red-t);    }
  .ff-sb--gray   .ff-sb-dot { background: var(--gray-t);   }
`;

/* ─── Status map ──────────────────────────────────────────── */
const STATUS_MAP = {
    // Vehicle statuses
    available: { label: 'Available', color: 'green', dot: true, pulse: true },
    on_trip: { label: 'On Trip', color: 'blue', dot: true, pulse: true },
    in_shop: { label: 'In Shop', color: 'amber', icon: '🔧', spin: true },
    retired: { label: 'Retired', color: 'gray', dot: false, strikethrough: true },

    // Driver statuses
    on_duty: { label: 'On Duty', color: 'green', dot: true, pulse: false },
    off_duty: { label: 'Off Duty', color: 'gray', dot: true, pulse: false },
    suspended: { label: 'Suspended', color: 'red', icon: '⚠', shake: true },
    expired: { label: 'Expired', color: 'red', icon: '⚠', shake: true },

    // Trip states
    draft: { label: 'Draft', color: 'gray', dot: true, pulse: false },
    dispatched: { label: 'Dispatched', color: 'blue', dot: true, pulse: true },
    completed: { label: 'Completed', color: 'green', dot: true, pulse: false },
    cancelled: { label: 'Cancelled', color: 'red', dot: true, pulse: false },

    // Maintenance states
    scheduled: { label: 'Scheduled', color: 'amber', dot: true, pulse: false },
    in_progress: { label: 'In Progress', color: 'blue', dot: true, pulse: true },
    done: { label: 'Done', color: 'green', dot: true, pulse: false },
};

/* ─── Component ───────────────────────────────────────────── */
export default function StatusBadge({ status }) {
    /* Inject styles once */
    useEffect(() => {
        if (document.getElementById(STYLE_ID)) return;
        const el = document.createElement('style');
        el.id = STYLE_ID;
        el.textContent = CSS;
        document.head.appendChild(el);
    }, []);

    const cfg = STATUS_MAP[status] ?? {
        label: status ?? '—',
        color: 'gray',
        dot: true,
        pulse: false,
    };

    const classes = [
        'ff-sb',
        `ff-sb--${cfg.color}`,
        cfg.shake ? 'ff-sb--shake' : '',
        cfg.strikethrough ? 'ff-sb--strikethrough' : '',
    ].filter(Boolean).join(' ');

    return (
        <span className={classes}>
            {/* Left indicator: icon OR dot */}
            {cfg.icon ? (
                <i className={`ff-sb-icon${cfg.spin ? ' ff-sb-icon--spin' : ''}`}>
                    {cfg.icon}
                </i>
            ) : cfg.dot !== false ? (
                <span className={`ff-sb-dot${cfg.pulse ? ' ff-sb-dot--pulse' : ''}`} />
            ) : null}

            {cfg.label}
        </span>
    );
}
