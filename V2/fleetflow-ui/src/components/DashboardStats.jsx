import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTip } from 'recharts';

const STATUS_COLORS = {
    on_trip: '#38bdf8',
    available: '#22c55e',
    in_shop: '#f59e0b',
    retired: '#94a3b8',
    suspended: '#ef4444',
};

function DonutTooltip({ active, payload }) {
    if (!active || !payload?.[0]) return null;
    const { value, payload: p } = payload[0];
    return (
        <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
            borderRadius: 10, padding: '8px 14px', fontSize: 12,
            boxShadow: 'var(--shadow-lg)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: p.color, display: 'inline-block',
                }} />
                <strong>{p.label}</strong>
            </div>
            <div style={{ color: 'var(--text-muted)', marginTop: 3 }}>
                {value} vehicle{value !== 1 ? 's' : ''}
            </div>
        </div>
    );
}

export default function DashboardStats({ vehicles, utilization, statusGroups }) {
    return (
        <div style={{ position: 'relative', minHeight: 180 }}>
            <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                    <Pie
                        data={statusGroups}
                        cx="50%" cy="50%"
                        innerRadius={55} outerRadius={82}
                        paddingAngle={3} dataKey="value"
                        startAngle={90} endAngle={-270}
                        isAnimationActive
                        animationDuration={800}
                        animationEasing="ease-out"
                    >
                        {statusGroups.map((entry, i) => (
                            <Cell
                                key={i}
                                fill={entry.color}
                                stroke="transparent"
                                style={{
                                    filter: `drop-shadow(0 0 5px ${entry.color}40)`,
                                }}
                            />
                        ))}
                    </Pie>
                    <RechartsTip content={<DonutTooltip />} />
                </PieChart>
            </ResponsiveContainer>

            {/* Centre label */}
            <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center', pointerEvents: 'none',
            }}>
                <div style={{
                    fontSize: 32, fontWeight: 900,
                    fontFamily: 'var(--font-heading)',
                    color: 'var(--text-primary)',
                    lineHeight: 1,
                }}>
                    {utilization}%
                </div>
                <div style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    marginTop: 2,
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                }}>
                    Active
                </div>
            </div>
        </div>
    );
}
