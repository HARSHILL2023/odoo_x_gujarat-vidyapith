const LABELS = {
    available: 'Available', on_trip: 'On Trip', in_shop: 'In Shop', retired: 'Retired',
    on_duty: 'On Duty', off_duty: 'Off Duty', suspended: 'Suspended',
    draft: 'Draft', dispatched: 'Dispatched', completed: 'Completed', cancelled: 'Cancelled',
    scheduled: 'Scheduled', in_progress: 'In Progress', done: 'Done',
    van: 'Van', truck: 'Truck', bike: 'Bike',
    expired: 'Expired',
};

export default function StatusBadge({ status }) {
    if (!status) return null;
    const s = String(status).toLowerCase().trim().replace(/\s+/g, '_');
    return (
        <span className={`badge badge-${s}`}>
            {LABELS[s] || status}
        </span>
    );
}
