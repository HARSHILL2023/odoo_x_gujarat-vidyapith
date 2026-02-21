# 🔌 FleetFlow API

> REST API backend for the FleetFlow Fleet & Logistics Management System.

[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?style=flat-square&logo=postgresql)](https://postgresql.org)
[![JWT](https://img.shields.io/badge/Auth-JWT-orange?style=flat-square)](https://jwt.io)

For the full project documentation, see the [main README](../fleetflow-ui/README.md).

---

## Quick Start

```bash
npm install
cp .env.example .env          # Fill in your DB credentials
npm run db:migrate             # Create tables + views
npm run db:seed                # Load sample data
npm run dev                    # Start on http://localhost:4000
```

Health check: `GET http://localhost:4000/health`

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Long random string for signing JWTs |
| `PORT` | Server port (default: `4000`) |
| `CLIENT_ORIGIN` | Frontend URL for CORS (e.g. `http://localhost:5174`) |

---

## API Reference

### Auth
| Method | Endpoint | Auth |
|---|---|---|
| POST | `/api/auth/login` | ❌ |
| POST | `/api/auth/logout` | ❌ |
| GET | `/api/auth/me` | ✅ |

### Vehicles
| Method | Endpoint | Role |
|---|---|---|
| GET | `/api/vehicles` | any |
| POST | `/api/vehicles` | fleet_manager |
| PATCH | `/api/vehicles/:id` | fleet_manager |
| DELETE | `/api/vehicles/:id` | fleet_manager |

### Drivers
| Method | Endpoint | Role |
|---|---|---|
| GET | `/api/drivers` | any |
| POST | `/api/drivers` | fleet_manager, safety_officer |
| PATCH | `/api/drivers/:id` | fleet_manager, safety_officer |
| DELETE | `/api/drivers/:id` | fleet_manager |

### Trips
| Method | Endpoint | Role |
|---|---|---|
| GET | `/api/trips` | any |
| POST | `/api/trips` | fleet_manager, dispatcher |
| POST | `/api/trips/:id/dispatch` | fleet_manager, dispatcher |
| POST | `/api/trips/:id/complete` | fleet_manager, dispatcher |
| POST | `/api/trips/:id/cancel` | fleet_manager, dispatcher |

### Maintenance
| Method | Endpoint | Role |
|---|---|---|
| GET | `/api/maintenance` | any |
| POST | `/api/maintenance` | fleet_manager |
| PATCH | `/api/maintenance/:id` | fleet_manager |
| POST | `/api/maintenance/:id/complete` | fleet_manager |

### Fuel Logs
| Method | Endpoint | Role |
|---|---|---|
| GET | `/api/fuel-logs` | any |
| POST | `/api/fuel-logs` | fleet_manager, dispatcher |
| DELETE | `/api/fuel-logs/:id` | fleet_manager |

### Analytics
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/analytics/summary` | Dashboard KPIs |
| GET | `/api/analytics/fleet` | Per-vehicle efficiency + ROI |
| GET | `/api/analytics/drivers` | Driver performance stats |
| GET | `/api/analytics/export/csv?type=fuel` | Download CSV (fuel/maintenance/trips) |

---

## Business Logic

| Rule | Trigger |
|---|---|
| `cargo_weight > max_capacity` → 422 | `POST /trips` |
| Driver license expired → 409 | `POST /trips` |
| Driver suspended → 409 | `POST /trips` |
| License category ≠ vehicle type → 422 | `POST /trips` |
| Dispatch → vehicle + driver set to `on_trip` | Atomic transaction |
| Complete → vehicle + driver set to `available` | Atomic transaction |
| New maintenance → vehicle set to `in_shop` | Atomic transaction |
| Complete maintenance → vehicle reverted **only if no other open records** | Smart revert logic |

---

## Database Schema

```
users         id, name, email, password_hash, role
vehicles      id, name, license_plate, type, max_capacity, odometer, status, region, acquisition_cost
drivers       id, name, license_number, license_expiry, license_category, status, safety_score, phone, email
trips         id, reference, vehicle_id, driver_id, origin, destination, cargo_weight, state, date_start/end, odometer_start/end
maintenance   id, vehicle_id, name, service_type, service_date, cost, mechanic, state
fuel_logs     id, vehicle_id, trip_id, date, liters, cost, odometer
```

**Views:** `vehicle_cost_summary` · `vehicle_fuel_efficiency` · `driver_performance`

---

## Seed Accounts

All passwords: **`password123`**

| Email | Role |
|---|---|
| `admin@fleetflow.com` | fleet_manager |
| `sara@fleetflow.com` | dispatcher |
| `omar@fleetflow.com` | safety_officer |
| `priya@fleetflow.com` | financial_analyst |
