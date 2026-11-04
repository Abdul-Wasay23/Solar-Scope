-- ============================================================================
-- SolarScope Database Schema
-- Database: solarscope_db
-- Target: PostgreSQL 14+ with PostGIS
-- ============================================================================

-- 1. Enable PostGIS Extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- ----------------------------------------------------------------------------
-- 2. Core Authentication & User Management (ACTIVE)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS user_roles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_role UNIQUE (user_id, role_id)
);

-- Authentication Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_verifications(email);

-- Seed 3 Core Roles (Admin, Buyer/User, Seller)
INSERT INTO roles (name, description, permissions)
VALUES
    ('buyer', 'Standard buyer: solar PV project planning, purchasing, and service requests', '{"can_plan": true, "can_buy": true}'::jsonb),
    ('seller', 'Solar marketplace vendor: product, accessory, and installment listings', '{"can_sell": true}'::jsonb),
    ('admin', 'Platform administrator: system management and moderation', '{"is_admin": true}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. Dynamic Site Content CMS (ACTIVE)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS site_content (
    section_key VARCHAR(100) PRIMARY KEY,
    content JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 4. Marketplace Subsystem: Products & Services (ACTIVE)
-- Note: Service Provider and Seller are unified into seller_id -> users(id)
-- ----------------------------------------------------------------------------

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

CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_services_seller ON services(seller_id);

/*
-- ============================================================================
-- FUTURE MODULES (COMMENTED OUT FOR FUTURE PHASES)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 5. Solar PV Planning & Spatial Subsystem (Future Phase)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS projects (
    id BIGSERIAL PRIMARY KEY,
    buyer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'DRAFT',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS locations (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    street_address TEXT,
    city VARCHAR(100),
    peak_sun_hours NUMERIC(5, 2),
    geom geometry(Point, 4326)
);

CREATE TABLE IF NOT EXISTS roofs (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    roof_type VARCHAR(100),
    total_area_sqm NUMERIC(10, 2),
    default_tilt_angle NUMERIC(5, 2),
    azimuth_angle NUMERIC(5, 2),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roof_areas (
    id BIGSERIAL PRIMARY KEY,
    roof_id BIGINT NOT NULL REFERENCES roofs(id) ON DELETE CASCADE,
    zone_type VARCHAR(50) NOT NULL,
    area_sqm NUMERIC(10, 2),
    polygon_coordinates JSONB,
    geom geometry(Polygon, 4326),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS panel_layouts (
    id BIGSERIAL PRIMARY KEY,
    roof_area_id BIGINT NOT NULL REFERENCES roof_areas(id) ON DELETE CASCADE,
    orientation VARCHAR(50) DEFAULT 'PORTRAIT',
    total_panels INT DEFAULT 0,
    row_spacing_m NUMERIC(5, 2) DEFAULT 0.50,
    system_capacity_kw NUMERIC(8, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS solar_panels (
    id BIGSERIAL PRIMARY KEY,
    layout_id BIGINT NOT NULL REFERENCES panel_layouts(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
    pos_x NUMERIC(10, 4) NOT NULL,
    pos_y NUMERIC(10, 4) NOT NULL,
    tilt_angle NUMERIC(5, 2),
    rated_wattage NUMERIC(7, 2),
    geom geometry(Polygon, 4326)
);

CREATE TABLE IF NOT EXISTS accessories (
    id BIGSERIAL PRIMARY KEY,
    seller_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    compatible_product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
    accessory_name VARCHAR(255) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    stock_quantity INT DEFAULT 0,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS installment_plans (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    plan_name VARCHAR(255) NOT NULL,
    duration_months INT NOT NULL,
    interest_rate_pct NUMERIC(5, 2) DEFAULT 0.00,
    down_payment_pct NUMERIC(5, 2) DEFAULT 0.00,
    monthly_installment NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    buyer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id BIGINT REFERENCES projects(id) ON DELETE SET NULL,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    plan_id BIGINT REFERENCES installment_plans(id) ON DELETE SET NULL,
    total_amount NUMERIC(14, 2) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'PENDING',
    order_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_requests (
    id BIGSERIAL PRIMARY KEY,
    buyer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    service_id BIGINT NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    project_id BIGINT REFERENCES projects(id) ON DELETE SET NULL,
    scheduled_date TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'PENDING',
    customer_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS calculations (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    calc_type VARCHAR(50) DEFAULT 'PRELIMINARY',
    annual_generation_kwh NUMERIC(12, 2),
    recommended_battery_kwh NUMERIC(10, 2),
    estimated_cost NUMERIC(14, 2),
    payback_period_years NUMERIC(5, 2),
    assumptions_json JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
*/
