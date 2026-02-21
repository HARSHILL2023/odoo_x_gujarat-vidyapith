// ============================================================
// FleetFlow Mock Data – Replace with API calls later
// ============================================================

export const INITIAL_VEHICLES = [
  { id: 1, name: 'Toyota Hiace Van-01', licensePlate: 'ABC-1234', type: 'van', maxCapacity: 800, odometer: 45200, status: 'available', region: 'North', acquisitionCost: 25000, color: '#4ade80' },
  { id: 2, name: 'Isuzu Truck-03', licensePlate: 'XYZ-5678', type: 'truck', maxCapacity: 5000, odometer: 112400, status: 'on_trip', region: 'South', acquisitionCost: 80000, color: '#60a5fa' },
  { id: 3, name: 'Honda ADV Bike-07', licensePlate: 'MNO-9012', type: 'bike', maxCapacity: 50, odometer: 9800, status: 'in_shop', region: 'East', acquisitionCost: 3500, color: '#fb923c' },
  { id: 4, name: 'Ford Transit Van-05', licensePlate: 'DEF-3456', type: 'van', maxCapacity: 1200, odometer: 67300, status: 'available', region: 'West', acquisitionCost: 35000, color: '#4ade80' },
  { id: 5, name: 'Mitsubishi Fuso Truck-02', licensePlate: 'GHI-7890', type: 'truck', maxCapacity: 8000, odometer: 203100, status: 'retired', region: 'North', acquisitionCost: 95000, color: '#94a3b8' },
];

export const INITIAL_DRIVERS = [
  { id: 1, name: 'Alex Rivera', licenseNumber: 'LIC-001-2024', licenseExpiry: '2026-08-15', licenseCategory: 'van', status: 'on_duty', safetyScore: 94.5, tripsCompleted: 132, phone: '+63 912 345 6789', email: 'alex.r@fleetflow.com' },
  { id: 2, name: 'Maria Santos', licenseNumber: 'LIC-002-2024', licenseExpiry: '2025-03-01', licenseCategory: 'truck', status: 'on_duty', safetyScore: 88.0, tripsCompleted: 247, phone: '+63 913 456 7890', email: 'maria.s@fleetflow.com' },
  { id: 3, name: 'Jake Mendoza', licenseNumber: 'LIC-003-2023', licenseExpiry: '2024-12-31', licenseCategory: 'bike', status: 'off_duty', safetyScore: 76.3, tripsCompleted: 89, phone: '+63 914 567 8901', email: 'jake.m@fleetflow.com' },
  { id: 4, name: 'Lena Cruz', licenseNumber: 'LIC-004-2025', licenseExpiry: '2027-06-20', licenseCategory: 'van', status: 'suspended', safetyScore: 55.0, tripsCompleted: 45, phone: '+63 915 678 9012', email: 'lena.c@fleetflow.com' },
  { id: 5, name: 'Rico Tanaka', licenseNumber: 'LIC-005-2024', licenseExpiry: '2026-11-30', licenseCategory: 'truck', status: 'off_duty', safetyScore: 91.2, tripsCompleted: 178, phone: '+63 916 789 0123', email: 'rico.t@fleetflow.com' },
];

export const INITIAL_TRIPS = [
  { id: 1, reference: 'TRIP-2026-001', vehicleId: 1, driverId: 1, origin: 'Warehouse A – Manila', destination: 'SM North EDSA', cargoWeight: 450, state: 'completed', dateStart: '2026-02-18T08:00', dateEnd: '2026-02-18T14:30', odometerStart: 44800, odometerEnd: 45200 },
  { id: 2, reference: 'TRIP-2026-002', vehicleId: 2, driverId: 2, origin: 'Port of Manila', destination: 'Laguna Depot', cargoWeight: 4200, state: 'dispatched', dateStart: '2026-02-21T06:00', dateEnd: null, odometerStart: 111900, odometerEnd: null },
  { id: 3, reference: 'TRIP-2026-003', vehicleId: 4, driverId: 1, origin: 'Quezon City Hub', destination: 'Cavite Drop Point', cargoWeight: 800, state: 'draft', dateStart: '2026-02-22T09:00', dateEnd: null, odometerStart: null, odometerEnd: null },
  { id: 4, reference: 'TRIP-2026-004', vehicleId: 1, driverId: 3, origin: 'Pasay Terminal', destination: 'Makati CBD', cargoWeight: 30, state: 'cancelled', dateStart: '2026-02-15T11:00', dateEnd: null, odometerStart: 44600, odometerEnd: null },
  { id: 5, reference: 'TRIP-2026-005', vehicleId: 4, driverId: 5, origin: 'Clark FTZ', destination: 'Metro Manila Depot', cargoWeight: 950, state: 'completed', dateStart: '2026-02-20T05:30', dateEnd: '2026-02-20T15:00', odometerStart: 66800, odometerEnd: 67300 },
];

export const INITIAL_MAINTENANCE = [
  { id: 1, name: 'Oil Change + Filter', vehicleId: 3, serviceDate: '2026-02-19', serviceType: 'oil_change', cost: 180, state: 'in_progress', mechanic: 'AutoShop Plus' },
  { id: 2, name: 'Tire Rotation & Balancing', vehicleId: 1, serviceDate: '2026-02-25', serviceType: 'tire', cost: 90, state: 'scheduled', mechanic: 'QuickFix Auto' },
  { id: 3, name: 'Brake Pad Replacement', vehicleId: 2, serviceDate: '2026-02-10', serviceType: 'brake', cost: 350, state: 'done', mechanic: 'TruckCare Center' },
  { id: 4, name: 'Annual Engine Inspection', vehicleId: 5, serviceDate: '2026-02-14', serviceType: 'engine', cost: 600, state: 'done', mechanic: 'Dealers Workshop' },
];

export const INITIAL_FUEL_LOGS = [
  { id: 1, vehicleId: 1, tripId: 1, date: '2026-02-18', liters: 35.5, cost: 2150, odometer: 45200 },
  { id: 2, vehicleId: 2, tripId: 2, date: '2026-02-21', liters: 85.0, cost: 5100, odometer: 112400 },
  { id: 3, vehicleId: 4, tripId: 5, date: '2026-02-20', liters: 42.0, cost: 2520, odometer: 67300 },
  { id: 4, vehicleId: 3, tripId: null, date: '2026-02-17', liters: 8.5, cost: 510, odometer: 9700 },
];
