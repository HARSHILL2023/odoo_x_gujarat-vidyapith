-- FleetFlow Seed Data
-- Run after schema: psql $DATABASE_URL -f db/seed.sql
-- Passwords are bcrypt of "password123456"

TRUNCATE TABLE fuel_logs, maintenance, trips, drivers, vehicles, users RESTART IDENTITY CASCADE;

-- ============================================================
-- USERS
-- ============================================================
INSERT INTO users (name, email, password_hash, role) VALUES
  ('Admin Manager',    'admin@fleetflow.com',    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'fleet_manager'),
  ('Sara Dispatcher',  'sara@fleetflow.com',     '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'dispatcher'),
  ('Omar Safety',      'omar@fleetflow.com',     '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'safety_officer'),
  ('Priya Finance',    'priya@fleetflow.com',    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'financial_analyst');

-- ============================================================
-- VEHICLES
-- ============================================================
INSERT INTO vehicles (name, license_plate, type, max_capacity, odometer, status, region, acquisition_cost) VALUES
  ('Volvo FH-500',  'TN-01-AB-1234', 'truck', 15000, 45000, 'available', 'North',  1200000),
  ('Ford Transit',  'MH-03-CD-5678', 'van',    1500, 22000, 'on_trip',   'West',    550000),
  ('Tata Ace',      'DL-05-EF-9012', 'van',     750, 18500, 'in_shop',   'Central', 380000),
  ('Hero Splendor', 'KA-07-GH-3456', 'bike',    150, 12000, 'available', 'South',    95000),
  ('Ashok Leyland', 'GJ-09-IJ-7890', 'truck', 20000, 61000, 'available', 'East',   1850000);

-- ============================================================
-- DRIVERS
-- ============================================================
INSERT INTO drivers (name, license_number, license_expiry, license_category, status, safety_score, trips_completed, phone, email) VALUES
  ('Alex Kumar',   'DL-2020-1234567', '2026-12-31', 'truck', 'on_duty',  92, 145, '+91-9000000001', 'alex@fleetflow.com'),
  ('Priya Singh',  'MH-2019-7654321', '2025-03-10', 'van',   'on_duty',  78, 89,  '+91-9000000002', 'priya.d@fleetflow.com'),
  ('Ravi Thomas',  'TN-2021-1122334', '2027-06-30', 'van',   'off_duty', 95, 212, '+91-9000000003', 'ravi@fleetflow.com'),
  ('Aisha Mehta',  'GJ-2018-5566778', '2024-11-01', 'bike',  'off_duty', 85, 56,  '+91-9000000004', 'aisha@fleetflow.com'),
  ('Dev Nair',     'KA-2022-9988776', '2028-01-15', 'truck', 'suspended',60, 34,  '+91-9000000005', 'dev@fleetflow.com');

-- ============================================================
-- TRIPS
-- ============================================================
INSERT INTO trips (reference, vehicle_id, driver_id, origin, destination, cargo_weight, state, date_start, odometer_start) VALUES
  ('TRP-0001', 2, 1, 'Mumbai Central', 'Pune Depot',   1200, 'dispatched', NOW() - INTERVAL '2 hours',  22000),
  ('TRP-0002', 1, 3, 'Chennai Hub',    'Bangalore WH', 8000, 'draft',      NULL,                        NULL),
  ('TRP-0003', 5, 1, 'Delhi NCR',      'Agra DC',      5500, 'completed',  NOW() - INTERVAL '3 days',   60000);

UPDATE trips SET date_end = NOW() - INTERVAL '2 days', odometer_end = 60380 WHERE reference = 'TRP-0003';

-- ============================================================
-- MAINTENANCE
-- ============================================================
INSERT INTO maintenance (vehicle_id, name, service_type, service_date, cost, mechanic, state) VALUES
  (3, 'Engine Oil Change + Filter',  'oil_change', CURRENT_DATE,             3500, 'Sharma Auto Works',     'in_progress'),
  (1, 'Annual Scheduled Service',    'scheduled',  CURRENT_DATE + INTERVAL '7 days', 12000, 'Volvo Authorised', 'scheduled'),
  (2, 'Front Brake Pad Replacement', 'brake',      CURRENT_DATE - INTERVAL '10 days', 4200, 'QuickFix Garage', 'done');

-- ============================================================
-- FUEL LOGS
-- ============================================================
INSERT INTO fuel_logs (vehicle_id, trip_id, date, liters, cost, odometer) VALUES
  (1, NULL, CURRENT_DATE - 5, 120.5, 13255, 44800),
  (2, 1,    CURRENT_DATE - 1,  45.0,  4950, 21900),
  (3, NULL, CURRENT_DATE - 8,  32.0,  3520, 18200),
  (5, 3,    CURRENT_DATE - 3, 180.0, 19800, 60200);
