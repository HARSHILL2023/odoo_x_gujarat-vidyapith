-- FleetFlow Database Schema
-- Run: psql $DATABASE_URL -f db/schema.sql

-- Enable pgcrypto for UUID generation (optional)
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- USERS (Authentication)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(30)  NOT NULL DEFAULT 'dispatcher'
                CHECK (role IN ('fleet_manager','dispatcher','safety_officer','financial_analyst')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VEHICLES
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(100) NOT NULL,
  license_plate    VARCHAR(30)  UNIQUE NOT NULL,
  type             VARCHAR(20)  NOT NULL DEFAULT 'van'
                   CHECK (type IN ('van','truck','bike')),
  max_capacity     NUMERIC(10,2) NOT NULL DEFAULT 0,
  odometer         NUMERIC(10,2) NOT NULL DEFAULT 0,
  status           VARCHAR(20)  NOT NULL DEFAULT 'available'
                   CHECK (status IN ('available','on_trip','in_shop','retired')),
  region           VARCHAR(100),
  acquisition_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DRIVERS
-- ============================================================
CREATE TABLE IF NOT EXISTS drivers (
  id                SERIAL PRIMARY KEY,
  name              VARCHAR(100) NOT NULL,
  license_number    VARCHAR(50)  UNIQUE NOT NULL,
  license_expiry    DATE         NOT NULL,
  license_category  VARCHAR(20)  NOT NULL DEFAULT 'van'
                    CHECK (license_category IN ('van','truck','bike')),
  status            VARCHAR(20)  NOT NULL DEFAULT 'off_duty'
                    CHECK (status IN ('on_duty','off_duty','suspended')),
  safety_score      SMALLINT     NOT NULL DEFAULT 100
                    CHECK (safety_score BETWEEN 0 AND 100),
  trips_completed   INT          NOT NULL DEFAULT 0,
  phone             VARCHAR(30),
  email             VARCHAR(150),
  created_at        TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- TRIPS
-- ============================================================
CREATE TABLE IF NOT EXISTS trips (
  id              SERIAL PRIMARY KEY,
  reference       VARCHAR(30)   UNIQUE NOT NULL,
  vehicle_id      INT           NOT NULL REFERENCES vehicles(id),
  driver_id       INT           NOT NULL REFERENCES drivers(id),
  origin          VARCHAR(150)  NOT NULL,
  destination     VARCHAR(150)  NOT NULL,
  cargo_weight    NUMERIC(10,2) NOT NULL DEFAULT 0,
  state           VARCHAR(20)   NOT NULL DEFAULT 'draft'
                  CHECK (state IN ('draft','dispatched','completed','cancelled')),
  date_start      TIMESTAMPTZ,
  date_end        TIMESTAMPTZ,
  odometer_start  NUMERIC(10,2),
  odometer_end    NUMERIC(10,2),
  created_at      TIMESTAMPTZ   DEFAULT NOW()
);

-- ============================================================
-- MAINTENANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS maintenance (
  id           SERIAL PRIMARY KEY,
  vehicle_id   INT          NOT NULL REFERENCES vehicles(id),
  name         VARCHAR(200) NOT NULL,
  service_type VARCHAR(50)  NOT NULL DEFAULT 'other'
               CHECK (service_type IN ('oil_change','tire','brake','engine','electrical','bodywork','scheduled','other')),
  service_date DATE,
  cost         NUMERIC(12,2) NOT NULL DEFAULT 0,
  mechanic     VARCHAR(100),
  state        VARCHAR(20)  NOT NULL DEFAULT 'scheduled'
               CHECK (state IN ('scheduled','in_progress','done')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FUEL LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS fuel_logs (
  id         SERIAL PRIMARY KEY,
  vehicle_id INT           NOT NULL REFERENCES vehicles(id),
  trip_id    INT           REFERENCES trips(id) ON DELETE SET NULL,
  date       DATE          NOT NULL,
  liters     NUMERIC(8,2)  NOT NULL DEFAULT 0,
  cost       NUMERIC(10,2) NOT NULL DEFAULT 0,
  odometer   NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ   DEFAULT NOW()
);

-- ============================================================
-- ANALYTICS VIEWS
-- ============================================================

-- Per-vehicle operational cost summary
CREATE OR REPLACE VIEW vehicle_cost_summary AS
SELECT
  v.id                                          AS vehicle_id,
  v.name,
  v.type,
  v.max_capacity,
  v.acquisition_cost,
  COALESCE(SUM(f.cost),0)                       AS total_fuel_cost,
  COALESCE(SUM(m.cost),0)                       AS total_maintenance_cost,
  COALESCE(SUM(f.cost),0) + COALESCE(SUM(m.cost),0) AS total_operational_cost
FROM vehicles v
LEFT JOIN fuel_logs  f ON f.vehicle_id = v.id
LEFT JOIN maintenance m ON m.vehicle_id = v.id
GROUP BY v.id, v.name, v.type, v.max_capacity, v.acquisition_cost;

-- Per-vehicle fuel efficiency (completed trips with both odometer readings)
CREATE OR REPLACE VIEW vehicle_fuel_efficiency AS
SELECT
  v.id  AS vehicle_id,
  v.name,
  COALESCE(SUM(t.odometer_end - t.odometer_start), 0)      AS total_km,
  COALESCE(SUM(f.liters), 0)                                AS total_liters,
  CASE
    WHEN COALESCE(SUM(f.liters),0) > 0
    THEN ROUND(SUM(t.odometer_end - t.odometer_start) / SUM(f.liters), 2)
    ELSE NULL
  END                                                        AS km_per_liter
FROM vehicles v
LEFT JOIN trips t ON t.vehicle_id = v.id
  AND t.state = 'completed'
  AND t.odometer_end IS NOT NULL
  AND t.odometer_start IS NOT NULL
LEFT JOIN fuel_logs f ON f.vehicle_id = v.id
GROUP BY v.id, v.name;

-- Driver performance view  
CREATE OR REPLACE VIEW driver_performance AS
SELECT
  d.id                                                     AS driver_id,
  d.name,
  d.safety_score,
  d.license_expiry,
  d.status,
  COUNT(t.id)                                              AS total_trips,
  COUNT(t.id) FILTER (WHERE t.state = 'completed')         AS completed_trips,
  CASE
    WHEN COUNT(t.id) > 0
    THEN ROUND(COUNT(t.id) FILTER (WHERE t.state='completed')::NUMERIC / COUNT(t.id) * 100, 1)
    ELSE 0
  END                                                      AS completion_rate
FROM drivers d
LEFT JOIN trips t ON t.driver_id = d.id
GROUP BY d.id, d.name, d.safety_score, d.license_expiry, d.status;
