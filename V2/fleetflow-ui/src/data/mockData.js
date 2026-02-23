// ============================================================
// FleetFlow Mock Data — v2
// ─ String _id fields, compatible with sid() in FleetContext
// ─ snake_case field names mirror real MongoDB API responses
// ─ Cross-references use _id strings, not numeric foreign keys
// ─ Locations: Gujarat, India  (realistic for your deployment)
// ============================================================

/* ─── ID factories ────────────────────────────────────────── */
const vId = (n) => `veh_${String(n).padStart(3, '0')}`;
const dId = (n) => `drv_${String(n).padStart(3, '0')}`;
const tId = (n) => `trp_${String(n).padStart(3, '0')}`;
const mId = (n) => `mnt_${String(n).padStart(3, '0')}`;
const fId = (n) => `ful_${String(n).padStart(3, '0')}`;
const uId = (n) => `usr_${String(n).padStart(3, '0')}`;

/* ─── Sequence counters — for mock API auto-increment ─────── */
export const MOCK_SEQ = {
    vehicle: 8, driver: 8, trip: 8,
    maintenance: 8, fuel: 10, user: 4,
};

/**
 * Generate the next mock _id for a given entity.
 * Call this in your mock POST handler.
 * @example nextMockId('veh') → 'veh_009'
 */
export function nextMockId(prefix) {
    const keyMap = {
        veh: 'vehicle', drv: 'driver', trp: 'trip',
        mnt: 'maintenance', ful: 'fuel', usr: 'user',
    };
    const key = keyMap[prefix];
    if (key) MOCK_SEQ[key]++;
    return `${prefix}_${String(MOCK_SEQ[key] ?? 99).padStart(3, '0')}`;
}

/* ─── License expiry helper ───────────────────────────────── */
const isExpired = (dateStr) => new Date(dateStr) < new Date();

/* ─── Fuel cost helper ────────────────────────────────────── */
const cpl = (cost, liters) => +(cost / liters).toFixed(2);


/* ════════════════════════════════════════════════════════════
   VEHICLES  (8 entries)
   Fields: _id, name, licenseplate, type, maxcapacity,
           odometer, status, region, acquisitioncost,
           created_at, updated_at
   ════════════════════════════════════════════════════════════ */
export const MOCK_VEHICLES = [
    {
        _id: vId(1), name: 'Toyota Hiace Van-01',
        licenseplate: 'GJ-01-AA-1234', type: 'van',
        maxcapacity: 800,  odometer: 45200, status: 'available',
        region: 'North', acquisitioncost: 25000,
        created_at: '2024-01-10T08:00:00Z', updated_at: '2026-02-20T09:15:00Z',
    },
    {
        _id: vId(2), name: 'Isuzu NLR Truck-03',
        licenseplate: 'GJ-02-AB-5678', type: 'truck',
        maxcapacity: 5000, odometer: 112400, status: 'on_trip',
        region: 'South', acquisitioncost: 80000,
        created_at: '2023-11-05T09:30:00Z', updated_at: '2026-02-21T06:00:00Z',
    },
    {
        _id: vId(3), name: 'Honda ADV Bike-07',
        licenseplate: 'GJ-05-AC-9012', type: 'bike',
        maxcapacity: 50,   odometer: 9800,  status: 'in_shop',
        region: 'East', acquisitioncost: 3500,
        created_at: '2024-03-20T11:00:00Z', updated_at: '2026-02-19T08:45:00Z',
    },
    {
        _id: vId(4), name: 'Ford Transit Van-05',
        licenseplate: 'GJ-01-AD-3456', type: 'van',
        maxcapacity: 1200, odometer: 67300, status: 'available',
        region: 'West', acquisitioncost: 35000,
        created_at: '2023-09-14T10:00:00Z', updated_at: '2026-02-20T15:05:00Z',
    },
    {
        _id: vId(5), name: 'Mitsubishi Fuso Truck-02',
        licenseplate: 'GJ-04-AE-7890', type: 'truck',
        maxcapacity: 8000, odometer: 203100, status: 'retired',
        region: 'North', acquisitioncost: 95000,
        created_at: '2021-06-01T07:00:00Z', updated_at: '2025-12-31T16:00:00Z',
    },
    {
        _id: vId(6), name: 'Toyota Dyna Truck-06',
        licenseplate: 'GJ-02-AF-2345', type: 'truck',
        maxcapacity: 3000, odometer: 78500, status: 'on_trip',
        region: 'South', acquisitioncost: 55000,
        created_at: '2024-04-18T09:00:00Z', updated_at: '2026-02-22T07:00:00Z',
    },
    {
        _id: vId(7), name: 'Yamaha Mio Bike-02',
        licenseplate: 'GJ-05-AG-6789', type: 'bike',
        maxcapacity: 30,   odometer: 15600, status: 'available',
        region: 'East', acquisitioncost: 1800,
        created_at: '2024-07-22T10:30:00Z', updated_at: '2026-02-18T14:20:00Z',
    },
    {
        _id: vId(8), name: 'Hyundai H350 Van-09',
        licenseplate: 'GJ-03-AH-0123', type: 'van',
        maxcapacity: 1500, odometer: 34200, status: 'in_shop',
        region: 'West', acquisitioncost: 42000,
        created_at: '2024-05-10T08:45:00Z', updated_at: '2026-02-20T11:30:00Z',
    },
];


/* ════════════════════════════════════════════════════════════
   DRIVERS  (8 entries)
   Fields: _id, name, license_number, license_expiry,
           license_category, status, safety_score,
           trips_completed, phone, email,
           is_license_expired, region, created_at, updated_at
   ════════════════════════════════════════════════════════════ */
export const MOCK_DRIVERS = [
    {
        _id: dId(1), name: 'Arjun Mehta',
        license_number: 'GJ-01-2024-001', license_expiry: '2026-08-15',
        license_category: 'van',   status: 'on_duty',
        safety_score: 94.5, trips_completed: 132,
        phone: '+91 98765 43210', email: 'arjun.m@fleetflow.in',
        is_license_expired: isExpired('2026-08-15'), region: 'North',
        created_at: '2024-01-15T09:00:00Z', updated_at: '2026-02-21T06:00:00Z',
    },
    {
        _id: dId(2), name: 'Sonal Patel',
        license_number: 'GJ-02-2024-002', license_expiry: '2025-03-01',
        license_category: 'truck',  status: 'on_duty',
        safety_score: 88.0, trips_completed: 247,
        phone: '+91 97654 32109', email: 'sonal.p@fleetflow.in',
        is_license_expired: isExpired('2025-03-01'), region: 'South',
        created_at: '2023-08-20T10:30:00Z', updated_at: '2026-02-21T06:05:00Z',
    },
    {
        _id: dId(3), name: 'Rahul Joshi',
        license_number: 'GJ-05-2023-003', license_expiry: '2024-12-31',
        license_category: 'bike',   status: 'off_duty',
        safety_score: 76.3, trips_completed: 89,
        phone: '+91 96543 21098', email: 'rahul.j@fleetflow.in',
        is_license_expired: isExpired('2024-12-31'), region: 'East',
        created_at: '2023-12-05T11:00:00Z', updated_at: '2026-02-10T14:00:00Z',
    },
    {
        _id: dId(4), name: 'Pooja Desai',
        license_number: 'GJ-01-2025-004', license_expiry: '2027-06-20',
        license_category: 'van',   status: 'suspended',
        safety_score: 55.0, trips_completed: 45,
        phone: '+91 95432 10987', email: 'pooja.d@fleetflow.in',
        is_license_expired: isExpired('2027-06-20'), region: 'West',
        created_at: '2025-01-10T08:30:00Z', updated_at: '2026-01-15T09:00:00Z',
    },
    {
        _id: dId(5), name: 'Kiran Shah',
        license_number: 'GJ-04-2024-005', license_expiry: '2026-11-30',
        license_category: 'truck',  status: 'off_duty',
        safety_score: 91.2, trips_completed: 178,
        phone: '+91 94321 09876', email: 'kiran.s@fleetflow.in',
        is_license_expired: isExpired('2026-11-30'), region: 'North',
        created_at: '2024-02-28T09:15:00Z', updated_at: '2026-02-20T15:10:00Z',
    },
    {
        _id: dId(6), name: 'Nisha Trivedi',
        license_number: 'GJ-02-2025-006', license_expiry: '2028-04-10',
        license_category: 'van',   status: 'off_duty',
        safety_score: 97.1, trips_completed: 63,
        phone: '+91 93210 98765', email: 'nisha.t@fleetflow.in',
        is_license_expired: isExpired('2028-04-10'), region: 'South',
        created_at: '2025-03-01T10:00:00Z', updated_at: '2026-02-19T16:30:00Z',
    },
    {
        _id: dId(7), name: 'Vikram Rao',
        license_number: 'GJ-03-2023-007', license_expiry: '2025-01-15',
        license_category: 'truck',  status: 'expired',
        safety_score: 82.5, trips_completed: 310,
        phone: '+91 92109 87654', email: 'vikram.r@fleetflow.in',
        is_license_expired: isExpired('2025-01-15'), region: 'East',
        created_at: '2022-05-15T08:00:00Z', updated_at: '2026-01-16T09:00:00Z',
    },
    {
        _id: dId(8), name: 'Meera Nair',
        license_number: 'GJ-05-2025-008', license_expiry: '2027-09-25',
        license_category: 'bike',   status: 'off_duty',
        safety_score: 89.8, trips_completed: 44,
        phone: '+91 91098 76543', email: 'meera.n@fleetflow.in',
        is_license_expired: isExpired('2027-09-25'), region: 'West',
        created_at: '2025-05-20T11:30:00Z', updated_at: '2026-02-17T10:00:00Z',
    },
];


/* ════════════════════════════════════════════════════════════
   TRIPS  (8 entries)
   Fields: _id, reference, vehicle (_id), driver (_id),
           origin, destination, cargo_weight, status,
           date_start, date_end, odometer_start, odometer_end,
           notes, created_at
   ════════════════════════════════════════════════════════════ */
export const MOCK_TRIPS = [
    {
        _id: tId(1), reference: 'TRIP-2026-001',
        vehicle: vId(1), driver: dId(1),
        origin: 'Warehouse A, Ahmedabad', destination: 'Distribution Hub, Surat',
        cargo_weight: 450, status: 'completed',
        date_start: '2026-02-18T08:00:00Z', date_end: '2026-02-18T14:30:00Z',
        odometer_start: 44800, odometer_end: 45200,
        notes: 'FMCG goods — handle with care',
        created_at: '2026-02-17T16:00:00Z',
    },
    {
        _id: tId(2), reference: 'TRIP-2026-002',
        vehicle: vId(2), driver: dId(2),
        origin: 'Mundra Port Terminal', destination: 'Logistics Depot, Rajkot',
        cargo_weight: 4200, status: 'dispatched',
        date_start: '2026-02-21T06:00:00Z', date_end: null,
        odometer_start: 111900, odometer_end: null,
        notes: 'Bulk cargo — fragile electronics',
        created_at: '2026-02-20T18:00:00Z',
    },
    {
        _id: tId(3), reference: 'TRIP-2026-003',
        vehicle: vId(4), driver: dId(1),
        origin: 'Central Warehouse, Vadodara', destination: 'Retail Drop, Anand',
        cargo_weight: 800, status: 'draft',
        date_start: '2026-02-22T09:00:00Z', date_end: null,
        odometer_start: null, odometer_end: null,
        notes: '',
        created_at: '2026-02-21T20:00:00Z',
    },
    {
        _id: tId(4), reference: 'TRIP-2026-004',
        vehicle: vId(7), driver: dId(3),
        origin: 'City Hub, Ahmedabad', destination: 'Satellite Office, Gandhinagar',
        cargo_weight: 28, status: 'cancelled',
        date_start: '2026-02-15T11:00:00Z', date_end: null,
        odometer_start: 15400, odometer_end: null,
        notes: 'Cancelled — driver license expired',
        created_at: '2026-02-14T09:00:00Z',
    },
    {
        _id: tId(5), reference: 'TRIP-2026-005',
        vehicle: vId(4), driver: dId(5),
        origin: 'Industrial Zone, Ankleshwar', destination: 'Metro Depot, Ahmedabad',
        cargo_weight: 950, status: 'completed',
        date_start: '2026-02-20T05:30:00Z', date_end: '2026-02-20T15:00:00Z',
        odometer_start: 66800, odometer_end: 67300,
        notes: 'Chemicals — hazmat compliant packaging',
        created_at: '2026-02-19T14:00:00Z',
    },
    {
        _id: tId(6), reference: 'TRIP-2026-006',
        vehicle: vId(6), driver: dId(5),
        origin: 'Warehouse South, Surat', destination: 'Cold Storage, Navsari',
        cargo_weight: 2100, status: 'dispatched',
        date_start: '2026-02-22T07:00:00Z', date_end: null,
        odometer_start: 78100, odometer_end: null,
        notes: 'Perishables — priority run, ETA 4 hrs',
        created_at: '2026-02-21T22:00:00Z',
    },
    {
        _id: tId(7), reference: 'TRIP-2026-007',
        vehicle: vId(1), driver: dId(6),
        origin: 'Airport Cargo, Ahmedabad', destination: 'Retail Park, Mehsana',
        cargo_weight: 600, status: 'completed',
        date_start: '2026-02-16T08:00:00Z', date_end: '2026-02-16T13:45:00Z',
        odometer_start: 44100, odometer_end: 44600,
        notes: '',
        created_at: '2026-02-15T12:00:00Z',
    },
    {
        _id: tId(8), reference: 'TRIP-2026-008',
        vehicle: vId(4), driver: dId(6),
        origin: 'Fulfilment Centre, Vadodara', destination: 'Last-Mile Drop, Nadiad',
        cargo_weight: 400, status: 'draft',
        date_start: '2026-02-23T10:00:00Z', date_end: null,
        odometer_start: null, odometer_end: null,
        notes: 'E-commerce batch — 47 packages',
        created_at: '2026-02-22T08:00:00Z',
    },
];


/* ════════════════════════════════════════════════════════════
   MAINTENANCE  (8 entries)
   Fields: _id, name, vehicle (_id), service_date,
           service_type, cost, status, mechanic, notes,
           created_at
   ════════════════════════════════════════════════════════════ */
export const MOCK_MAINTENANCE = [
    {
        _id: mId(1), name: 'Oil Change + Air Filter',
        vehicle: vId(3), service_date: '2026-02-19', service_type: 'oil_change',
        cost: 180, status: 'in_progress', mechanic: 'AutoShop Plus, Ahmedabad',
        notes: 'Synthetic 10W-40, air filter replaced',
        created_at: '2026-02-19T08:30:00Z',
    },
    {
        _id: mId(2), name: 'Tire Rotation & Balancing',
        vehicle: vId(1), service_date: '2026-02-25', service_type: 'tire',
        cost: 90, status: 'scheduled', mechanic: 'QuickFix Auto, Naranpura',
        notes: '',
        created_at: '2026-02-20T11:00:00Z',
    },
    {
        _id: mId(3), name: 'Brake Pad Replacement',
        vehicle: vId(2), service_date: '2026-02-10', service_type: 'brake',
        cost: 350, status: 'done', mechanic: 'TruckCare Centre, Surat',
        notes: 'Front and rear pads replaced, rotors resurfaced',
        created_at: '2026-02-09T14:00:00Z',
    },
    {
        _id: mId(4), name: 'Annual Engine Inspection',
        vehicle: vId(5), service_date: '2026-02-14', service_type: 'engine',
        cost: 600, status: 'done', mechanic: 'Authorised Workshop, Rajkot',
        notes: 'Full engine diagnostic — coolant top-up, belt checked',
        created_at: '2026-02-13T09:00:00Z',
    },
    {
        _id: mId(5), name: 'AC Compressor Service',
        vehicle: vId(8), service_date: '2026-02-20', service_type: 'electrical',
        cost: 420, status: 'in_progress', mechanic: 'CoolAir Garage, Maninagar',
        notes: 'Compressor belt replaced, refrigerant refill',
        created_at: '2026-02-20T10:00:00Z',
    },
    {
        _id: mId(6), name: 'Transmission Fluid Change',
        vehicle: vId(6), service_date: '2026-03-01', service_type: 'transmission',
        cost: 240, status: 'scheduled', mechanic: 'TruckCare Centre, Surat',
        notes: '',
        created_at: '2026-02-21T13:00:00Z',
    },
    {
        _id: mId(7), name: 'Front Suspension Overhaul',
        vehicle: vId(4), service_date: '2026-02-12', service_type: 'suspension',
        cost: 310, status: 'done', mechanic: 'AutoShop Plus, Ahmedabad',
        notes: 'Left strut replaced, alignment done',
        created_at: '2026-02-11T08:30:00Z',
    },
    {
        _id: mId(8), name: 'Battery Replacement',
        vehicle: vId(7), service_date: '2026-03-05', service_type: 'electrical',
        cost: 75, status: 'scheduled', mechanic: 'QuickFix Auto, Naranpura',
        notes: '12V 7Ah AGM battery',
        created_at: '2026-02-21T15:00:00Z',
    },
];


/* ════════════════════════════════════════════════════════════
   FUEL LOGS  (10 entries)
   Fields: _id, vehicle (_id), trip (_id | null),
           date, liters, cost, odometer, cost_per_liter
   ════════════════════════════════════════════════════════════ */
export const MOCK_FUEL_LOGS = [
    { _id: fId(1),  vehicle: vId(1), trip: tId(1), date: '2026-02-18', liters: 35.5, cost: 2910, odometer: 45200, cost_per_liter: cpl(2910, 35.5) },
    { _id: fId(2),  vehicle: vId(2), trip: tId(2), date: '2026-02-21', liters: 85.0, cost: 7225, odometer: 112400, cost_per_liter: cpl(7225, 85.0) },
    { _id: fId(3),  vehicle: vId(4), trip: tId(5), date: '2026-02-20', liters: 42.0, cost: 3612, odometer: 67300, cost_per_liter: cpl(3612, 42.0) },
    { _id: fId(4),  vehicle: vId(3), trip: null,    date: '2026-02-17', liters: 8.5,  cost: 680,  odometer: 9700,  cost_per_liter: cpl(680, 8.5)   },
    { _id: fId(5),  vehicle: vId(1), trip: tId(7), date: '2026-02-16', liters: 30.0, cost: 2490, odometer: 44600, cost_per_liter: cpl(2490, 30.0) },
    { _id: fId(6),  vehicle: vId(6), trip: tId(6), date: '2026-02-22', liters: 65.0, cost: 5525, odometer: 78500, cost_per_liter: cpl(5525, 65.0) },
    { _id: fId(7),  vehicle: vId(7), trip: null,    date: '2026-02-14', liters: 5.5,  cost: 440,  odometer: 15500, cost_per_liter: cpl(440, 5.5)   },
    { _id: fId(8),  vehicle: vId(4), trip: tId(3), date: '2026-02-15', liters: 48.0, cost: 3840, odometer: 66800, cost_per_liter: cpl(3840, 48.0) },
    { _id: fId(9),  vehicle: vId(2), trip: null,    date: '2026-02-15', liters: 70.0, cost: 5950, odometer: 111500, cost_per_liter: cpl(5950, 70.0) },
    { _id: fId(10), vehicle: vId(8), trip: null,    date: '2026-02-18', liters: 38.0, cost: 3040, odometer: 34000, cost_per_liter: cpl(3040, 38.0) },
];


/* ════════════════════════════════════════════════════════════
   USERS  (for AuthContext / WelcomeModal / login mock)
   ════════════════════════════════════════════════════════════ */
export const MOCK_USERS = [
    {
        _id: uId(1), name: 'Trikam Devasi', email: 'admin@fleetflow.in',
        password: 'admin123', role: 'fleet_manager',
        avatar: null, created_at: '2025-01-01T00:00:00Z',
    },
    {
        _id: uId(2), name: 'Dispatch Ops', email: 'dispatch@fleetflow.in',
        password: 'dispatch123', role: 'dispatcher',
        avatar: null, created_at: '2025-01-01T00:00:00Z',
    },
    {
        _id: uId(3), name: 'Safety Desk', email: 'safety@fleetflow.in',
        password: 'safety123', role: 'safety_officer',
        avatar: null, created_at: '2025-01-01T00:00:00Z',
    },
    {
        _id: uId(4), name: 'Finance Team', email: 'finance@fleetflow.in',
        password: 'finance123', role: 'financial_analyst',
        avatar: null, created_at: '2025-01-01T00:00:00Z',
    },
];


/* ════════════════════════════════════════════════════════════
   BACKWARD-COMPAT RE-EXPORTS
   Keeps existing pages working without any import changes.
   ════════════════════════════════════════════════════════════ */
export const INITIAL_VEHICLES    = MOCK_VEHICLES;
export const INITIAL_DRIVERS     = MOCK_DRIVERS;
export const INITIAL_TRIPS       = MOCK_TRIPS;
export const INITIAL_MAINTENANCE = MOCK_MAINTENANCE;
export const INITIAL_FUEL_LOGS   = MOCK_FUEL_LOGS;
