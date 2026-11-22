# Kubera — Robotics Club Inventory Management System

Kubera is a full-stack web application built to manage the physical inventory of a university robotics club. It tracks electronic components and equipment across a physical storage system of color-coded racks and drawers, handles member checkouts and returns, maintains a full audit trail of inventory movements, and enforces role-based access control across all operations.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Core Concepts](#core-concepts)
  - [Storage System](#storage-system)
  - [Components & Assets](#components--assets)
  - [Inventory Movements & Loans](#inventory-movements--loans)
  - [Users & Roles](#users--roles)
- [Data Model](#data-model)
- [API Modules](#api-modules)
- [Frontend Pages](#frontend-pages)
- [Authentication](#authentication)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [Role Hierarchy & Permissions](#role-hierarchy--permissions)

---

## Overview

Kubera solves a real, physical problem: tracking hundreds of electronic components (resistors, Arduinos, sensors, motor drivers, etc.) that are shared among club members. Without a system like this, items get lost, stock counts drift, and no one knows who last borrowed what.

Key capabilities:

- **Physical location tracking** — every component is mapped to a specific rack and drawer using human-readable location codes like `GREEN-R03-C01-D02`
- **Dual inventory tracking modes** — *bulk* components (e.g., resistors counted by quantity) and *individual* assets (e.g., serialized Arduino boards with asset tags)
- **Full audit trail** — every stock-in, checkout, return, adjustment, damage, or retirement is recorded as an `InventoryMovement`
- **Member loan management** — formal borrow/return cycles with due dates and write-off support
- **Role-based access control** — fine-grained permissions enforced at the API level

---

## Tech Stack

### Backend

| Layer | Technology |
|---|---|
| Runtime | Node.js (ESM) |
| Framework | Express 5 |
| Language | TypeScript 7 |
| ORM | Prisma 7 |
| Database | PostgreSQL (Neon serverless) |
| Auth | Neon Auth + JOSE (JWT) |
| Security | Helmet, CORS |
| Dev Server | `tsx watch` |

### Frontend

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Language | TypeScript |
| Routing | React Router 7 |
| Styling | Tailwind CSS 4 |
| Icons | Lucide React |
| Auth | Neon Auth (`@neondatabase/auth`) |
| Build Tool | Vite 8 |

---

## Project Structure

```
Kubera/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Full database schema
│   ├── src/
│   │   ├── app.ts                 # Express app setup
│   │   ├── server.ts              # HTTP server entry point
│   │   ├── config/
│   │   │   ├── auth.ts            # Neon Auth / JWT config
│   │   │   └── database.ts        # Prisma client singleton
│   │   ├── middlewares/
│   │   │   ├── requireAuth.ts     # Verifies JWT, hydrates req.user
│   │   │   ├── requireRole.ts     # Role-based access guard
│   │   │   ├── resolveKuberaUser.ts
│   │   │   └── verifyNeonAuth.ts
│   │   ├── modules/
│   │   │   ├── auth/              # /api/auth routes
│   │   │   ├── storage/           # /api/storage routes
│   │   │   ├── components/        # /api/components routes
│   │   │   │   ├── component.controller.ts
│   │   │   │   ├── component.service.ts
│   │   │   │   └── component.routes.ts
│   │   │   └── assets/            # /api/assets routes
│   │   │       ├── asset.controller.ts
│   │   │       ├── asset.service.ts
│   │   │       └── asset.routes.ts
│   │   └── generated/prisma/      # Generated Prisma client
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/
    ├── public/
    │   └── icons.svg
    ├── src/
    │   ├── App.tsx                # Route definitions
    │   ├── main.tsx               # React entry point
    │   ├── auth/
    │   │   ├── auth.client.ts     # Neon Auth client
    │   │   └── RequiredAuth.tsx   # Auth-guarded route wrapper
    │   ├── components/
    │   │   ├── common/            # Shared UI (StatCard, etc.)
    │   │   └── layout/            # DashboardLayout, sidebar, nav
    │   ├── pages/
    │   │   ├── HomePage.tsx       # Public landing page
    │   │   ├── LoginPage.tsx      # Login / sign-up
    │   │   ├── DashboardPage.tsx  # Overview & stats
    │   │   ├── InventoryPage.tsx  # Component browser
    │   │   ├── StoragePage.tsx    # Rack & drawer viewer
    │   │   ├── PlaceholderPage.tsx
    │   ├── services/
    │   │   ├── api-client.ts      # Axios/fetch base client
    │   │   ├── auth.api.ts        # Auth API calls
    │   │   └── storage.api.ts     # Storage API calls
    │   └── types/
    │       └── storage.ts         # Shared TypeScript types
    ├── package.json
    └── vite.config.ts
```

---

## Core Concepts

### Storage System

The physical inventory lives in **Storage Racks**, each of which holds a fixed number of **Storage Drawers**. Racks are identified by color (`GREEN`, `BLACK`, `ORANGE`) and a rack number within that color group. This produces a human-readable **location code** for every container:

```
GREEN-R03-C01-D02
  │       │    └── Drawer 2
  │       └────── Rack 1 (in the green group, which has 3 drawers per rack)
  └────────────── Color group: GREEN
```

**Valid rack configurations:**

| Color | Drawers Per Rack |
|---|---|
| `GREEN` | 3 |
| `BLACK` | 2, 3, or 4 |
| `ORANGE` | 2 |

Racks can be **ACTIVE** or **RETIRED**. A rack cannot be retired while it still holds components, and components cannot be assigned to a retired rack's drawers.

---

### Components & Assets

Kubera supports two fundamentally different inventory tracking strategies:

#### BULK Tracking
For consumable or fungible items counted by quantity — resistors, jumper wires, capacitors.

- Has a `quantityAvailable` field
- Movements record `quantityChange` values (positive for stock-in, negative for checkout)
- An initial `STOCK_IN` movement is auto-created when the component is registered with an `initialQuantity`

#### INDIVIDUAL Tracking
For serialized, one-of-a-kind items — development boards, instruments, tools.

- `quantityAvailable` is `null` (not applicable)
- Each physical item is registered as a separate **Asset** record with a unique `assetTag` and optional `serialNumber`
- Assets carry their own lifecycle status: `AVAILABLE`, `CHECKED_OUT`, `UNDER_MAINTENANCE`, `DAMAGED`, `LOST`, or `RETIRED`

Every **Component** belongs to a **ComponentCategory** (e.g., Microcontrollers, Sensors, Resistors) and can be assigned to a specific storage drawer.

---

### Inventory Movements & Loans

**InventoryMovement** is the immutable audit log at the heart of Kubera. Every change to stock or asset status creates a movement record:

| Movement Type | Description |
|---|---|
| `STOCK_IN` | Stock added (purchase, donation, initial registration) |
| `CHECKOUT` | Item borrowed by a member |
| `RETURN` | Borrowed item returned |
| `ADJUSTMENT` | Manual correction to quantity |
| `MARK_DAMAGED` | Item flagged as damaged |
| `MARK_LOST` | Item flagged as lost |
| `RETIRE` | Item permanently retired from service |

**InventoryLoan** wraps a borrow-return cycle, tracking quantities borrowed, returned, and written off, along with who issued the loan and an optional due date.

---

### Users & Roles

Users authenticate through **Neon Auth** (OAuth / email). After authentication, their identity is linked to a Kubera `User` record via `neonAuthUserId`. Each user can hold multiple **Role** assignments, optionally with expiry dates.

Defined system roles (examples from the codebase):

- `SUPER_ADMIN` — full access
- `ADMIN` — administrative access
- `CLUB_PRESIDENT` — club leadership, can manage storage and categories
- `VICE_PRESIDENT` — can create components and assets
- `MEMBER` — can browse inventory and borrow items

Role assignments are audited: each records who granted the role and when, and can be revoked with a timestamp.

---

## Data Model

```
User ──────────────┬── UserRoleAssignment ── Role
                   ├── checkedOutAssets (Asset)
                   ├── performedInventoryMovements
                   ├── memberInventoryMovements
                   ├── receivedLoans (InventoryLoan)
                   └── issuedLoans (InventoryLoan)

StorageRack ───────── StorageDrawer ─────────── Component
                                                    ├── ComponentCategory
                                                    ├── Asset[]
                                                    ├── InventoryMovement[]
                                                    └── InventoryLoan[]

InventoryLoan ─────── InventoryMovement
Asset ─────────────── InventoryMovement
```

---

## API Modules

The backend exposes a REST API at `http://localhost:5000`. All endpoints except `/api/health` require a `Bearer` token.

| Module | Base Path | Description |
|---|---|---|
| Health | `GET /api/health` | Server liveness check |
| Auth | `GET /api/auth/me` | Fetch authenticated user profile + roles |
| Storage | `/api/storage/racks` | CRUD for storage racks and drawers |
| Component Categories | `/api/components/categories` | CRUD for component categories |
| Components | `/api/components` | Search, filter, paginate, create, update components |
| Assets | `/api/assets` | Register, search, filter, checkout, and return physical assets |

For the full endpoint reference, see [`backend/API.md`](backend/API.md).

---

## Frontend Pages

| Route | Page | Auth Required |
|---|---|---|
| `/` | `HomePage` | No |
| `/login` | `LoginPage` | No |
| `/dashboard` | `DashboardPage` | Yes |
| `/inventory` | `InventoryPage` | Yes |
| `/storage` | `StoragePage` | Yes |
| `/members` | Member Management (placeholder) | Yes |
| `/activity` | Activity Log (placeholder) | Yes |
| `/settings` | Settings (placeholder) | Yes |

The dashboard shows an overview of total components, items checked out, active members, and low-stock alerts, along with a live authentication status panel and a recent activity feed.

---

## Authentication

Kubera uses **Neon Auth** as its identity provider. The flow is:

1. The user signs in through Neon Auth on the frontend (OAuth or email/password)
2. Neon Auth issues a JWT
3. Every API request sends the JWT as `Authorization: Bearer <token>`
4. The `requireAuth` middleware verifies the token using JOSE, then resolves the corresponding Kubera `User` record (auto-creating it on first login if needed)
5. The `requireRole` middleware checks the user's active role assignments before allowing write operations

---

## Getting Started

### Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) PostgreSQL database (free tier is sufficient)
- Neon Auth configured for your project

### Backend Setup

```bash
cd backend
npm install

# Copy and fill in the environment file
cp .env.example .env

# Push the schema to your database and generate the Prisma client
npx prisma db push
npx prisma generate

# Start the development server (port 5000)
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install

# Start the Vite dev server (port 5173 by default)
npm run dev
```

---

## Environment Variables

Create `backend/.env` based on `backend/.env.example`:

| Variable | Description |
|---|---|
| `PORT` | Port the Express server listens on (default: `5000`) |
| `NODE_ENV` | `development` or `production` |
| `DATABASE_URL` | Neon PostgreSQL pooled connection string |
| `DATABASE_URL_UNPOOLED` | Neon PostgreSQL direct (unpooled) connection string |
| `INITIAL_SUPER_ADMIN_NEON_AUTH_USER_ID` | Neon Auth user ID of the first super-admin (used for bootstrap) |
| `INITIAL_SUPER_ADMIN_AUTH_EMAIL` | Email of the initial super-admin |

---

## Role Hierarchy & Permissions

| Action | SUPER_ADMIN | ADMIN | CLUB_PRESIDENT | VICE_PRESIDENT | MEMBER |
|---|:---:|:---:|:---:|:---:|:---:|
| View inventory | ✅ | ✅ | ✅ | ✅ | ✅ |
| View storage | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create components | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create storage racks | ✅ | ✅ | ✅ | ✅ | ❌ |
| Manage categories | ✅ | ✅ | ✅ | ❌ | ❌ |
| Retire / restore racks | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete racks / categories | ✅ | ✅ | ✅ | ❌ | ❌ |
| Assign roles | ✅ | ✅ | ❌ | ❌ | ❌ |
| Full system access | ✅ | ❌ | ❌ | ❌ | ❌ |
