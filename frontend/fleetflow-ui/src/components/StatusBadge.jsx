const LABELS = {
    available: 'Available', on_trip: 'On Trip', in_shop: 'In Shop', retired: 'Retired',
    on_duty: 'On Duty', off_duty: 'Off Duty', suspended: 'Suspended',
    draft: 'Draft', dispatched: 'Dispatched', completed: 'Completed', cancelled: 'Cancelled',
    scheduled: 'Scheduled', in_progress: 'In Progress', done: 'Done',
    van: 'Van', truck: 'Truck', bike: 'Bike',
    expired: 'Expired',
};

export default function StatusBadge({ status }) {
    return (
        <span className={`badge badge-${status}`}>
            {LABELS[status] || status}
        </span>
    );
}
