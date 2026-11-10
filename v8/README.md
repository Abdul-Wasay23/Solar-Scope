# SolarScope — Rooftop Solar Engineering, CAD & Feasibility Platform

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9-green?style=flat&logo=leaflet)](https://leafletjs.com/)
[![License](https://img.shields.io/badge/License-Academic%20FYP-orange)](#)

**SolarScope** is a solar planning prototype for creating rooftop layouts, estimating energy yield, and preparing feasibility reports. Estimates are preliminary and should be reviewed by a qualified solar professional before being used for a purchase or installation decision.

---

## 🚀 Quick Start Guide (GitHub Clone / Download)

Follow these steps to run SolarScope locally on your machine after downloading or cloning from GitHub:

### 1. Prerequisites
- **Node.js**: v18.18 or higher (v20+ recommended). [Download Node.js](https://nodejs.org/)
- **npm**: v9 or higher (bundled with Node.js)
- **Git** (optional, for cloning)

### 2. Installation

1. **Clone the repository** (or extract the downloaded ZIP folder):
   ```bash
   git clone https://github.com/Abdul-Wasay23/Solar-Scope.git
   cd Solar-Scope
   ```

2. **Install project dependencies**:
   ```bash
   npm install
   ```

3. **Configure local environment variables**:
   Copy `.env.example` to `.env.local` and set your PostgreSQL credentials:
   ```bash
   cp .env.example .env.local
   ```
   Update `DATABASE_URL` inside `.env.local`:
   ```env
   DATABASE_URL="postgresql://postgres:your_password@localhost:5432/solarscope_db"
   ```

4. **Set up the PostgreSQL Database & Tables**:
   Follow the detailed [Database Setup Guide](#-database-setup-guide-postgresql--postgis) below or run the automatic script:
   ```powershell
   .\database\apply_schema.ps1 -DbPassword "your_postgres_password"
   ```

5. **Start the local development server**:
   ```bash
   npm run dev
   ```

6. **Open in browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 🗄️ Database Setup Guide (PostgreSQL + PostGIS)

SolarScope uses **PostgreSQL 14+** (tested with PostgreSQL 18) and the **PostGIS** extension for spatial geospatial mapping, authentication, seller marketplace, and admin management.

---

### Method A: One-Click PowerShell Script (Fastest for Windows)

Open PowerShell in the project root directory and run:

```powershell
.\database\apply_schema.ps1 -DbPassword "your_postgres_password"
```

*Optional parameters:*
```powershell
.\database\apply_schema.ps1 -DbUser postgres -DbPassword "your_password" -DbHost localhost -DbPort 5432 -DbName solarscope_db
```

This automated script will:
1. Verify connection to your PostgreSQL server.
2. Automatically create the `solarscope_db` database if it doesn't exist.
3. Enable the `postgis` extension.
4. Execute `database/schema.sql` to build all tables and indexes.
5. Seed initial system roles (`buyer`, `seller`, `admin`).
6. Print verification summary of all created tables.

---

### Method B: Step-by-Step Manual Setup (psql CLI)

If you prefer running commands manually in your terminal or command prompt:

#### Step 1: Open PostgreSQL Shell (`psql`)
```bash
psql -U postgres -h localhost -p 5432
```
*(Enter your PostgreSQL master password when prompted)*

#### Step 2: Create the Database
```sql
CREATE DATABASE solarscope_db;
```

#### Step 3: Connect to the Database
```sql
\c solarscope_db
```

#### Step 4: Enable PostGIS Spatial Extension
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

#### Step 5: Execute the Schema File
You can load the entire schema directly from the project directory:

```bash
# From Windows Command Prompt or Terminal:
psql -U postgres -d solarscope_db -f ./database/schema.sql
```

---

### Method C: Manual SQL Commands for Table Creation

You can also copy and paste the following SQL commands directly into **pgAdmin 4 (Query Tool)**, **DBeaver**, or **psql**:

#### 1. Roles & Permissions Table
```sql
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Seed Core System Roles
INSERT INTO roles (name, description, permissions)
VALUES
    ('buyer', 'Standard buyer: solar PV project planning, purchasing, and service requests', '{"can_plan": true, "can_buy": true}'::jsonb),
    ('seller', 'Solar marketplace vendor: product, accessory, and installment listings', '{"can_sell": true}'::jsonb),
    ('admin', 'Platform administrator: system management and moderation', '{"is_admin": true}'::jsonb)
ON CONFLICT (name) DO NOTHING;
```

#### 2. Users Table
```sql
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(50),
    organization VARCHAR(255) DEFAULT 'SolarScope Engineering Solutions',
    professional_title VARCHAR(255) DEFAULT 'Senior PV Systems Designer',
    city VARCHAR(255) DEFAULT 'Karachi, Pakistan',
    password_hash VARCHAR(255) NOT NULL,
    google_sub VARCHAR(255) UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    is_email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

#### 3. User Roles Assignment Table
```sql
CREATE TABLE IF NOT EXISTS user_roles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_role UNIQUE (user_id, role_id)
);
```

#### 4. OTP Verifications Table (Email Verification)
```sql
CREATE TABLE IF NOT EXISTS otp_verifications (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INT DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_verifications(email);
```

#### 5. Dynamic Site Content CMS Table
```sql
CREATE TABLE IF NOT EXISTS site_content (
    section_key VARCHAR(100) PRIMARY KEY,
    content JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

#### 6. Marketplace Products Table
```sql
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    seller_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    description TEXT,
    unit_price VARCHAR(100) NOT NULL,
    stock_quantity INT DEFAULT 10,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
```

#### 7. Marketplace Services Table
```sql
CREATE TABLE IF NOT EXISTS services (
    id BIGSERIAL PRIMARY KEY,
    seller_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    base_fee VARCHAR(100) NOT NULL,
    coverage_area VARCHAR(255) DEFAULT 'Karachi & Nationwide',
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_services_seller ON services(seller_id);
```

---

### Step 6: Verify Database & Tables

Inside `psql` connected to `solarscope_db`, run:

```sql
-- 1. List all created tables
\dt

-- 2. Verify roles seed
SELECT * FROM roles;

-- 3. Verify PostGIS spatial capability
SELECT PostGIS_Full_Version();
```

Expected output for tables:
- `otp_verifications`
- `products`
- `roles`
- `services`
- `site_content`
- `user_roles`
- `users`

---

### Step 7: Configure Application `.env.local`

In the root directory, create/edit `.env.local`:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/solarscope_db"
```

Once saved, restart Next.js (`npm run dev`), and SolarScope will immediately connect to your live PostgreSQL database!

---

## 🔑 Authentication & Demo Access

The local demo uses browser `localStorage` for account and session state. It does not provide production authentication or server-side account storage. Do not use it to protect real customer data.

- **Sign In**: Navigate to `/login` and use a valid email address with the local demo form.
- **Register**: Navigate to `/register` to create a local demo profile.
- **Sample Projects**: Example projects are loaded on first launch and stored in the browser.

The development-only Admin login is disabled unless `DEMO_ADMIN_EMAIL` and `DEMO_ADMIN_PASSWORD` are set in `.env.local`. It is not available in production.

### Google Sign-In Integration

The login page starts a server-side Google Authorization Code flow with PKCE, state, and nonce. Google identity is checked server-side, then handed to a configured FastAPI endpoint that must authenticate only an already-linked Google `sub` and return the existing SolarScope role and application JWT. Google login does not register or link accounts by email.

For local Google Cloud configuration:

- Authorized JavaScript origin: `http://localhost:3000`
- Authorized redirect URI: `http://localhost:3000/api/auth/google/callback`

Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` in the untracked `.env.local` file. Set `GOOGLE_ACCOUNT_LOGIN_URL` to the actual FastAPI existing-account login endpoint. The backend endpoint must independently verify the Google ID token, resolve an existing Google subject association, reject unknown/conflicting accounts with HTTP 404/409, and return `{ "access_token": "...", "expires_in": 3600, "user": { "id": "...", "fullName": "...", "email": "...", "role": "BUYER|SELLER|SERVICE_PROVIDER|ADMIN" } }` for a linked account. The FastAPI endpoint and database are not included in this repository, so Google sign-in cannot complete until that endpoint and valid credentials are configured. This integration is not a production-ready account system on its own.

---

## 🛠️ Complete User Workflow & Features

### 1. Interactive Landing Page (`/`)
- High-resolution visual showcase with live performance metrics.
- Equipment catalogue featuring Tier-1 monocrystalline panels, hybrid inverters, and LiFePO4 batteries.
- Interactive FAQ and direct onboarding CTAs.

### 2. Engineering Dashboard (`/dashboard`)
- Real-time aggregation of designed solar capacity (kWp), roof coverage (m²), annual energy generation (kWh/yr), and estimated financial savings (PKR/yr).
- Pipeline filtering by status (`Draft`, `In Progress`, `Completed`, `Archived`).

### 3. Project Creation & Geolocation (`/projects/new`)
- **Country & City Selection**: Quick presets for major Pakistani cities (Karachi, Lahore, Islamabad, Rawalpindi, Peshawar, Multan, Faisalabad, Quetta) plus global support.
- **Address Autocomplete**: Real-time OpenStreetMap / Nominatim geocoding.
- **Direct Coordinate Input**: Enter precise decimal latitude and longitude.
- **Interactive Satellite Pin**: Drag and drop the pin directly onto the building rooftop.

### 4. 4-Step Solar CAD Studio (`/projects/[id]/map`)
The flagship rooftop layout engineering suite:
- **Step 1 — Boundary & Obstruction Restrictions**:
  - Click corners on high-resolution satellite imagery (Esri World Imagery with zoom up to level 25) to outline roof perimeter.
  - Trace restricted zones (chimneys, water tanks, skylights, AC units, access walkways).
  - Draggable corner pins allow fine-tuning vertex coordinates in real time.
- **Step 2 — Solar Panel Layout & Optimization**:
  - **Model Specification**: Quick cards for top models:
    - *400W Monocrystalline* (1.05m × 1.75m)
    - *540W Tier-1 Bifacial* (1.13m × 2.28m)
    - *650W Commercial Grade* (1.30m × 2.40m)
  - **Catalogue Modal**: Click *"View All Panel Models"* to open a full catalogue with instant search and wattage filters (`All`, `400W`, `540W`, `650W`).
  - **Orientation**: Toggle between Portrait (Vertical) and Landscape (Horizontal).
  - **Capacity Cap (Max kWp)**: Set maximum desired system size (e.g., 5 kWp, 10 kWp). SolarScope automatically clusters panels toward the optimal center of the roof.
  - **Live Auto-Regeneration**: Changing row pitch, module spacing, or perimeter setbacks automatically recalculates and renders the compliant array.
  - **Keyboard Arrow Movement**: Click any panel to select it, or hold **Shift + Click** to select multiple panels (they glow yellow `#FFB800`), then use keyboard arrow keys (`←`, `→`, `↑`, `↓`) to nudge panels smoothly across the roof.
- **Step 3 — Battery Storage System**:
  - **Master Toggle Switch**: Default is OFF (standard grid-tied net metering).
  - Switch ON to unlock battery capacity choices:
    - *3.5 kWh Compact Backup* (~4–6 hours essential loads)
    - *5.12 kWh Standard Home* (~8–10 hours standard home)
    - *10.24 kWh Extended PowerWall* (~14–18 hours with AC/pump)
    - *15.36 kWh Heavy Duty / Commercial* (~24+ hours full immunity)
- **Step 4 — Finalize & Export**:
  - Validation check verifies zero boundary overlaps, restricted zone collisions, or panel-on-panel interference.
  - Lock design and transition project status to `COMPLETED`.
  - Direct one-click link to the Engineering Report.

### 5. Official Engineering Report (`/projects/[id]/report`)
- Executive summary with solar system capacity, battery specifications, and site coordinates.
- Financial ROI analysis, 25-year lifetime generation forecast, and CO₂ offset equivalent in trees planted.
- **PDF Export**: Print or download a client-ready multi-page PDF via `html2pdf.js` with print styles.

---

## 📂 Project Architecture & Directory Structure

```text
Solar-Scope/
├── public/                     # Static assets & product imagery
│   ├── images/                 # Panels, inverters, batteries, banners
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (app)/              # Authenticated workspace layout
│   │   │   ├── dashboard/      # Projects analytics dashboard
│   │   │   ├── projects/       # Projects list, creation, details, map, report
│   │   │   └── settings/       # User profile and solar calculation defaults
│   │   ├── login/              # Sign In page
│   │   ├── register/           # Registration page
│   │   ├── layout.tsx          # Root HTML shell & providers
│   │   ├── page.tsx            # Public landing page
│   │   └── not-found.tsx       # Custom 404 page
│   ├── components/             # Reusable UI & domain components
│   │   ├── layout/             # AppHeader, AppSidebar, AppShell, RouteGuard
│   │   ├── projects/           # SiteLayoutMap, LocationMap, ProjectCard
│   │   └── ui/                 # Button, Input, Select, Dialog, Badge
│   ├── context/                # React contexts (ProjectsContext, etc.)
│   ├── data/                   # Sample project data
│   ├── lib/
│   │   ├── geo/                # Geodesic WGS84 math, boundary polygons, regions
│   │   ├── projects/           # Project data types and validation
│   │   └── solar/              # Spatial layout algorithm, SAT collision, history
│   ├── providers/              # AuthProvider, storage management
│   └── styles/                 # Global variables, tokens, and CSS reset
├── package.json                # Project dependencies & scripts
├── tsconfig.json               # TypeScript configuration
└── README.md                   # Project documentation
```

---

## 📜 Available NPM Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `dev` | `npm run dev` | Start Next.js development server at `localhost:3000` |
| `build` | `npm run build` | Compile and bundle production application |
| `start` | `npm run start` | Run production build locally |
| `lint` | `npm run lint` | Run ESLint static analysis checks |
| `type-check` | `npm run type-check` | Run TypeScript compiler type checking without emitting files |
| `test` | `npm test` | Run Vitest unit & component test suite |

---

## ⚖️ Engineering Accuracy & Disclaimer

1. **Preliminary Feasibility**: All rooftop surface areas, solar generation outputs, module layouts, and financial payback timelines generated by SolarScope are preliminary estimates intended for feasibility assessment and preliminary design proposals.
2. **On-Site Verification**: Actual solar generation depends on local meteorological factors, micro-shading, structural roof integrity, component brand specifications, and utility net metering regulations (e.g. NEPRA guidelines in Pakistan).
3. **Professional Consultation**: A certified professional solar engineer or EPC contractor should conduct a physical site survey prior to equipment procurement or structural roof mounting.

---

## 👨‍💻 Author & Final Year Project (FYP)

- **Developer**: Abdul Wasay
- **Project**: SolarScope — Solar Planning & Marketplace Workspace
- **Institution**: Final Year Project (FYP)
