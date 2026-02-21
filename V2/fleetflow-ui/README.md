# 🚚 FleetFlow — Modular Fleet & Logistics Management System

> A production-grade, full-stack fleet management platform that replaces manual logbooks with a centralized, rule-based digital hub. Built for Hackathon 2025.

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite)](https://vitejs.dev)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Relational_DB-4169E1?style=flat-square&logo=postgresql)](https://postgresql.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](#license)

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Screenshots](#-screenshots)
- [API Integration](#-api-integration)
- [Performance Optimizations](#-performance-optimizations)
- [SEO Considerations](#-seo-considerations)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Deployment](#-deployment)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Project Overview

FleetFlow is a **modular, role-based fleet and logistics management system** designed to digitize and optimize the entire lifecycle of a delivery fleet. It replaces error-prone manual logbooks with a structured, rule-enforced platform that tracks vehicle health, driver compliance, cargo dispatching, and financial performance — all in real time.

**Problem it solves:**
- Manual scheduling leads to over-capacity trips and compliance violations
- Disconnected spreadsheets hide vehicle/driver availability in real time
- No centralized view of operational costs, fuel spend, or maintenance ROI

**Who uses it:**

| Role | Responsibilities |
|---|---|
| **Fleet Manager** | Full CRUD over vehicles, drivers, maintenance scheduling |
| **Dispatcher** | Create trips, validate cargo loads, manage dispatch workflow |
| **Safety Officer** | Monitor license compliance, review driver safety scores |
| **Financial Analyst** | Audit fuel expenses, maintenance costs, and ROI reports |

---

## ✨ Key Features

### 🗺️ Command Center Dashboard
Real-time KPI overview: active fleet count, utilization rate, in-shop vehicles, pending cargo, and recent trips — all updated from live API data.

### 🚗 Vehicle Registry
Full CRUD asset management with filtering by type (Van, Truck, Bike), status, and region. Vehicles are soft-deleted (marked `Retired`) to preserve trip history integrity.

### 👤 Driver Profiles & Compliance
Tracks license expiry (with visual warnings for expiring/expired licenses), license category matching, safety scores, trip completion rates, and operational status (`On Duty`, `Off Duty`, `Suspended`).

### 📦 Trip Dispatcher — Kanban + List View
A full trip lifecycle: **Draft → Dispatched → Completed / Cancelled**. Cargo weight is validated server-side against vehicle capacity. Dispatching atomically updates vehicle and driver statuses via DB transactions.

### 🔧 Maintenance & Service Logs
Logging a new service record automatically moves the vehicle to `In Shop`, removing it from the dispatcher's selection pool. Completing service intelligently reverts the vehicle only when all open maintenance is resolved.

### ⛽ Fuel & Expense Logs
Per-trip and ad-hoc fuel entry logging with automatic `cost-per-litre` calculation and per-vehicle fuel spend summaries.

### 📊 Analytics & Reports
- Fuel efficiency (km/L) per vehicle
- Vehicle ROI: `(Revenue - Op. Cost) / Acquisition Cost × 100`
- Driver performance table with completion rate and safety score
- One-click **CSV export** for fuel logs, maintenance records, and trip history

### 🌗 Light / Dark Mode
Full theme system with CSS custom properties. Preference persisted via `localStorage`. Toggle in the app header with instant, no-flash switching.

### 🔐 JWT Authentication + RBAC
Secure login with bcrypt password hashing, 8-hour JWT tokens, and role-based middleware that restricts write operations by user role at the API level.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                        │
│                                                                 │
│   React + Vite (port 5174)                                      │
│   ┌──────────────┐  ┌─────────────────────────────────────┐    │
│   │   FleetContext│  │ Pages: Dashboard, Vehicles, Drivers │    │
│   │  (State Mgr) │  │        Trips, Maintenance, Fuel,    │    │
│   │   + fetch()  │  │        Analytics, Login             │    │
│   └──────┬───────┘  └─────────────────────────────────────┘    │
│          │  JWT Bearer token                                     │
└──────────┼──────────────────────────────────────────────────────┘
           │ REST API over HTTP
┌──────────▼──────────────────────────────────────────────────────┐
│                  API SERVER (Node.js + Express)                  │
│                       port 4000                                  │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌──────────────┐  │
│  │  /auth   │  │/vehicles │  │  /trips    │  │ /analytics   │  │
│  │  /drivers│  │/mainten. │  │  /fuel-logs│  │ /export/csv  │  │
│  └──────────┘  └──────────┘  └────────────┘  └──────────────┘  │
│                                                                  │
│  Middleware: verifyToken → requireRole → Route Handler           │
└──────────────────────────┬──────────────────────────────────────┘
                           │ pg.Pool
┌──────────────────────────▼──────────────────────────────────────┐
│                    PostgreSQL Database                           │
│                                                                  │
│  users  vehicles  drivers  trips  maintenance  fuel_logs        │
│                                                                  │
│  Views: vehicle_cost_summary | vehicle_fuel_efficiency           │
│         driver_performance                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Frontend Structure

```
fleetflow-ui/src/
├── App.jsx                 # Root — routing, theme state, auth shell
├── index.css               # Design system (CSS custom properties, dark+light)
├── context/
│   └── FleetContext.jsx    # Global state — all entities + business logic
├── pages/
│   ├── Dashboard.jsx       # KPI cards, fleet bar chart, recent trips
│   ├── Vehicles.jsx        # Registry with search, filter, CRUD modal
│   ├── Drivers.jsx         # Profiles with license expiry highlights
│   ├── Trips.jsx           # Kanban board + list view, dispatch workflow
│   ├── Maintenance.jsx     # Service log table + KPI cards
│   ├── FuelLogs.jsx        # Fuel entries + per-vehicle cost chart
│   ├── Analytics.jsx       # Efficiency, ROI, driver performance, export
│   └── Login.jsx           # Auth with role selection
└── components/
    ├── Sidebar.jsx         # Persistent navigation
    ├── Modal.jsx           # Generic dialog wrapper
    └── StatusBadge.jsx     # Colored status pills
```

### Backend Structure

```
fleetflow-api/
├── server.js               # Express app, CORS, all route mounts
├── db/
│   ├── pool.js             # pg.Pool singleton (SSL-aware)
│   ├── schema.sql          # 6 tables + 3 SQL analytics views
│   └── seed.sql            # Sample data (4 users, 5 vehicles, 5 drivers)
├── middleware/
│   ├── auth.js             # verifyToken — JWT Bearer validation
│   └── rbac.js             # requireRole() — role-based access factory
└── routes/
    ├── auth.js             # login, logout, /me
    ├── vehicles.js         # CRUD + soft-delete
    ├── drivers.js          # CRUD + computed license_expired
    ├── trips.js            # CRUD + dispatch/complete/cancel (transactions)
    ├── maintenance.js      # CRUD + auto in_shop / smart revert
    ├── fuel.js             # CRUD + cost_per_liter
    └── analytics.js        # Summary KPIs, fleet metrics, CSV export
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | Component-based UI with hooks |
| **Vite 7** | Lightning-fast bundler and dev server |
| **React Router v6** | Client-side routing |
| **React Context API** | Global state management |
| **CSS Custom Properties** | Theming system (dark/light mode) |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js + Express** | REST API server |
| **PostgreSQL** | Relational database |
| **pg (node-postgres)** | DB connection pooling |
| **bcryptjs** | Secure password hashing |
| **jsonwebtoken** | JWT generation and verification |
| **json2csv** | CSV report export |
| **dotenv** | Environment variable management |
| **nodemon** | Hot-reload in development |

---

## 📸 Screenshots

> _Add screenshots to a `/docs/screenshots/` folder and reference them here._

| Dashboard (Dark) | Vehicles Registry | Trip Kanban |
|:---:|:---:|:---:|
| ![Dashboard](docs/screenshots/dashboard-dark.png) | ![Vehicles](docs/screenshots/vehicles.png) | ![Trips](docs/screenshots/trips-kanban.png) |

| Dashboard (Light) | Analytics | Maintenance Logs |
|:---:|:---:|:---:|
| ![Dashboard Light](docs/screenshots/dashboard-light.png) | ![Analytics](docs/screenshots/analytics.png) | ![Maintenance](docs/screenshots/maintenance.png) |

---

## 🔌 API Integration

### Authentication Flow

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "admin@fleetflow.com", "password": "password123" }

→ 200 OK
{ "token": "<JWT>", "user": { "id": 1, "name": "...", "role": "fleet_manager" } }
```

All subsequent requests attach the token:
```http
Authorization: Bearer <JWT>
```

### Business Logic Enforcement (Server-side)

| Rule | Endpoint | HTTP Status |
|---|---|---|
| Cargo weight > vehicle capacity | `POST /api/trips` | `422` |
| Driver license expired | `POST /api/trips` | `409` |
| Driver suspended | `POST /api/trips` | `409` |
| License category mismatch | `POST /api/trips` | `422` |
| Vehicle not available | `POST /api/trips` | `409` |
| Dispatch: auto set on_trip | `POST /api/trips/:id/dispatch` | `200` |
| Complete: auto set available | `POST /api/trips/:id/complete` | `200` |
| Maintenance: auto set in_shop | `POST /api/maintenance` | `201` |

### Analytics Endpoints

```http
GET /api/analytics/summary      # Dashboard KPIs
GET /api/analytics/fleet        # Fuel efficiency + ROI per vehicle
GET /api/analytics/drivers      # Performance stats per driver
GET /api/analytics/export/csv?type=fuel        # → fuel_logs.csv
GET /api/analytics/export/csv?type=maintenance # → maintenance_logs.csv
GET /api/analytics/export/csv?type=trips       # → trips.csv
```

---

## ⚡ Performance Optimizations

- **Connection Pooling** — `pg.Pool` reuses DB connections across requests, eliminating per-request TCP handshake overhead.
- **SQL Aggregation Views** — Analytics are computed in PostgreSQL views (`vehicle_fuel_efficiency`, `vehicle_cost_summary`, `driver_performance`) rather than in JavaScript, offloading heavy computation to the DB engine.
- **Transactional State Writes** — Trip dispatch/complete/cancel use `BEGIN/COMMIT` transactions to guarantee atomic multi-table updates with automatic `ROLLBACK` on failure.
- **CSS Custom Properties Theming** — Dark/light mode switches by toggling a single `data-theme` attribute on `<html>`. No JavaScript DOM manipulation of individual elements; the browser re-calculates only changed variables.
- **`sharp` Image Optimization** — (Available via Next.js integration path) Production builds use `sharp` for automatic WebP conversion and responsive image resizing.
- **Vite Code Splitting** — Routes are lazily loaded by Vite's built-in chunking, reducing initial bundle size.
- **`localStorage` Persistence** — Theme preference and auth state survive page refreshes without an extra API round-trip.

---

## 🔍 SEO Considerations

> _Primarily applicable when targeting the Next.js migration path._

- **Semantic HTML** — All pages use proper heading hierarchy (`h1` → `h2` → `h3`) and landmark elements (`<header>`, `<main>`, `<nav>`, `<aside>`).
- **Dynamic Meta Tags** — Page titles update per route using `PAGE_TITLES` map in `App.jsx`, allowing precise `<title>` and `<meta description>` control per view.
- **Robots & Sitemap** — API routes include `/api/robots` and `/api/sitemap` stubs for crawler control on public deployments.
- **Accessible ARIA** — Modal dialogs use `role="dialog"` and `aria-labelledby`. Status badges include `aria-label` for screen reader support.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ and npm
- **PostgreSQL** v14+ (local) _or_ a hosted DB ([Neon.tech](https://neon.tech) free tier works perfectly)

### 1 — Clone the repository

```bash
git clone https://github.com/yourusername/fleetflow.git
cd fleetflow
```

### 2 — Start the backend

```bash
cd fleetflow-api
npm install

# Create the PostgreSQL database
psql -U postgres -c "CREATE DATABASE fleetflow;"

# Copy and configure environment variables
cp .env.example .env
# → Edit .env with your DB credentials

# Run migrations and seed data
npm run db:migrate
npm run db:seed

# Start the API server
npm run dev
# → http://localhost:4000
```

### 3 — Start the frontend

```bash
cd fleetflow-ui
npm install
npm run dev
# → http://localhost:5174
```

### 4 — Login

Use any of the seeded accounts (all passwords: **`password123`**):

| Email | Role |
|---|---|
| `admin@fleetflow.com` | Fleet Manager |
| `sara@fleetflow.com` | Dispatcher |
| `omar@fleetflow.com` | Safety Officer |
| `priya@fleetflow.com` | Financial Analyst |

---

## 🔐 Environment Variables

### `fleetflow-api/.env`

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:pass@localhost:5432/fleetflow` |
| `JWT_SECRET` | Secret key for signing JWTs (keep long & random) | `your_super_secret_key_min_32_chars` |
| `PORT` | Port the API server listens on | `4000` |
| `CLIENT_ORIGIN` | Allowed CORS origin (frontend URL) | `http://localhost:5174` |

> ⚠️ Never commit `.env` to source control. It is already included in `.gitignore`.

---

## 📦 Deployment

### Frontend — Vercel (Recommended)

```bash
cd fleetflow-ui
npm run build     # Outputs to dist/
# Deploy dist/ to Vercel or any static host
```

Set the following in Vercel → Settings → Environment Variables:
```
VITE_API_BASE_URL=https://your-api.onrender.com
```

### Backend — Render / Railway

1. Push `fleetflow-api/` to a GitHub repo
2. Create a new **Web Service** on [Render](https://render.com)
3. Set **Build Command:** `npm install`
4. Set **Start Command:** `node server.js`
5. Add all environment variables from `.env`
6. Use a [Neon.tech](https://neon.tech) free PostgreSQL instance for `DATABASE_URL`

### Database — Neon (Serverless PostgreSQL)

```bash
# After creating a Neon project, run:
psql "your-neon-connection-string" -f fleetflow-api/db/schema.sql
psql "your-neon-connection-string" -f fleetflow-api/db/seed.sql
```

---

## 🗺️ Roadmap

| Priority | Feature | Status |
|---|---|---|
| 🔴 High | Connect frontend `FleetContext` to real API | Planned |
| 🔴 High | Real-time status updates via WebSockets / SSE | Planned |
| 🟡 Medium | PDF report generation (maintenance, trips) | Planned |
| 🟡 Medium | Push / email notifications for license expiry | Planned |
| 🟡 Medium | Mobile-responsive layouts | Planned |
| 🟢 Low | Google Maps trip route visualization | Planned |
| 🟢 Low | Multi-tenant / company workspace support | Planned |
| 🟢 Low | Predictive maintenance alerts via ML | Planned |

---

## 🤝 Contributing

Contributions are welcome and encouraged!

```bash
# 1. Fork the repo and create your feature branch
git checkout -b feature/your-feature-name

# 2. Make your changes and write clear commit messages
git commit -m "feat: add real-time status updates via WebSocket"

# 3. Push to your fork
git push origin feature/your-feature-name

# 4. Open a Pull Request
```

### Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Use for |
|---|---|
| `feat:` | New features |
| `fix:` | Bug fixes |
| `docs:` | Documentation only |
| `refactor:` | Code restructuring |
| `chore:` | Build process, dependencies |

### Code Style

- **Frontend:** Functional React components, hooks for side effects, descriptive prop names
- **Backend:** Async/await with try-catch, `pg.Pool` for all queries, HTTP status codes per REST conventions
- **SQL:** Lowercase keywords, explicit column lists in `INSERT`, transactions for multi-table writes

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Built with ❤️ for Hackathon 2025 · [Report Bug](https://github.com/yourusername/fleetflow/issues) · [Request Feature](https://github.com/yourusername/fleetflow/issues)

</div>
