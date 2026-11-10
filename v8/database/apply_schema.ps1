param (
    [string]$DbUser = "postgres",
    [string]$DbPassword = $env:PGPASSWORD,
    [string]$DbHost = "localhost",
    [int]$DbPort = 5432,
    [string]$DbName = "solarscope_db",
    [string]$PsqlPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
)

# 0. Read .env.local for database credentials and DEMO_ADMIN configuration
$projectRoot = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $projectRoot ".env.local"
$adminEmail = $null
$adminPassword = $null

if (Test-Path $envFile) {
    Write-Host "Reading configuration from $envFile..." -ForegroundColor Cyan
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $key = $parts[0].Trim()
            $val = $parts[1].Trim().Trim('"').Trim("'")
            if ($key -eq "DEMO_ADMIN_EMAIL") {
                $adminEmail = $val.Trim().ToLower()
            }
            if ($key -eq "DEMO_ADMIN_PASSWORD") {
                $adminPassword = $val
            }
            if ($key -eq "DATABASE_URL" -and -not $DbPassword) {
                # Format: postgresql://user:password@host:port/dbname
                if ($val -match "postgresql://([^:]+):([^@]+)@([^:/]+)(?::(\d+))?/(.+)") {
                    $DbUser = $matches[1]
                    $DbPassword = [System.Uri]::UnescapeDataString($matches[2])
                    $DbHost = $matches[3]
                    if ($matches[4]) { $DbPort = [int]$matches[4] }
                    $DbName = $matches[5]
                }
            }
        }
    }
}

if (-not $DbPassword) {
    Write-Host "Please provide the PostgreSQL password via -DbPassword parameter, `$env:PGPASSWORD, or DATABASE_URL in .env.local." -ForegroundColor Yellow
    exit 1
}

$env:PGPASSWORD = $DbPassword

Write-Host "1. Checking connection to PostgreSQL server at $DbHost`:$DbPort..." -ForegroundColor Cyan
& $PsqlPath -U $DbUser -h $DbHost -p $DbPort -w -d postgres -c "SELECT version();"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to connect to PostgreSQL server. Please verify username and password." -ForegroundColor Red
    exit 1
}

Write-Host "`n2. Ensuring database '$DbName' exists..." -ForegroundColor Cyan
$dbExists = & $PsqlPath -U $DbUser -h $DbHost -p $DbPort -w -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DbName';"
if ($dbExists -ne "1") {
    Write-Host "Creating database '$DbName'..." -ForegroundColor Green
    & $PsqlPath -U $DbUser -h $DbHost -p $DbPort -w -d postgres -c "CREATE DATABASE $DbName;"
} else {
    Write-Host "Database '$DbName' already exists." -ForegroundColor Green
}

Write-Host "`n3. Applying SolarScope schema with PostGIS extension to '$DbName'..." -ForegroundColor Cyan
$schemaFile = Join-Path $PSScriptRoot "schema.sql"
& $PsqlPath -U $DbUser -h $DbHost -p $DbPort -w -d $DbName -f $schemaFile
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error applying schema to '$DbName'." -ForegroundColor Red
    exit 1
}

Write-Host "`n4. Verifying created tables in '$DbName'..." -ForegroundColor Cyan
& $PsqlPath -U $DbUser -h $DbHost -p $DbPort -w -d $DbName -c "\dt"

Write-Host "`n5. Verifying PostGIS version in '$DbName'..." -ForegroundColor Cyan
& $PsqlPath -U $DbUser -h $DbHost -p $DbPort -w -d $DbName -c "SELECT PostGIS_Full_Version();"

Write-Host "`n6. Verifying initial seed roles..." -ForegroundColor Cyan
& $PsqlPath -U $DbUser -h $DbHost -p $DbPort -w -d $DbName -c "SELECT id, name, description FROM roles;"

Write-Host "`n7. Ensuring Admin user in PostgreSQL from .env.local..." -ForegroundColor Cyan
if ($adminEmail -and $adminPassword) {
    Write-Host "Configuring Admin user: $adminEmail" -ForegroundColor Green
    
    # Securely hash password using bcryptjs (cost factor 10) matching existing auth method
    $hash = $null
    try {
        $env:NODE_PATH = Join-Path $projectRoot "node_modules"
        $nodeScript = "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync(process.argv[1], 10));"
        $rawHash = & node -e $nodeScript $adminPassword
        if ($rawHash) {
            $hash = $rawHash.Trim()
        }
    } catch {
        Write-Host "Node bcryptjs hashing encountered an issue, falling back to PostgreSQL pgcrypto." -ForegroundColor Yellow
    }

    # Prepare idempotent SQL statement
    if ($hash) {
        $adminSql = @"
DO `$`$
DECLARE
    v_user_id BIGINT;
    v_admin_role_id INT;
BEGIN
    SELECT id INTO v_admin_role_id FROM roles WHERE LOWER(name) = 'admin';
    IF v_admin_role_id IS NULL THEN
        INSERT INTO roles (name, description, permissions)
        VALUES ('admin', 'Platform administrator: system management and moderation', '{"is_admin": true}'::jsonb)
        RETURNING id INTO v_admin_role_id;
    END IF;

    INSERT INTO users (full_name, email, password_hash, is_active, is_email_verified, updated_at)
    VALUES ('Platform Admin', '$adminEmail', '$hash', true, true, NOW())
    ON CONFLICT (email) DO UPDATE
    SET password_hash = '$hash',
        is_active = true,
        is_email_verified = true,
        updated_at = NOW()
    RETURNING id INTO v_user_id;

    INSERT INTO user_roles (user_id, role_id)
    VALUES (v_user_id, v_admin_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
END `$`$;
"@
    } else {
        # Fallback to PostgreSQL pgcrypto crypt
        $escapedPassword = $adminPassword.Replace("'", "''")
        $adminSql = @"
DO `$`$
DECLARE
    v_user_id BIGINT;
    v_admin_role_id INT;
    v_hash VARCHAR(255);
BEGIN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    v_hash := crypt('$escapedPassword', gen_salt('bf', 10));

    SELECT id INTO v_admin_role_id FROM roles WHERE LOWER(name) = 'admin';
    IF v_admin_role_id IS NULL THEN
        INSERT INTO roles (name, description, permissions)
        VALUES ('admin', 'Platform administrator: system management and moderation', '{"is_admin": true}'::jsonb)
        RETURNING id INTO v_admin_role_id;
    END IF;

    INSERT INTO users (full_name, email, password_hash, is_active, is_email_verified, updated_at)
    VALUES ('Platform Admin', '$adminEmail', v_hash, true, true, NOW())
    ON CONFLICT (email) DO UPDATE
    SET password_hash = v_hash,
        is_active = true,
        is_email_verified = true,
        updated_at = NOW()
    RETURNING id INTO v_user_id;

    INSERT INTO user_roles (user_id, role_id)
    VALUES (v_user_id, v_admin_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
END `$`$;
"@
    }

    & $PsqlPath -U $DbUser -h $DbHost -p $DbPort -w -d $DbName -c $adminSql
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Warning: Could not create/update admin user in PostgreSQL." -ForegroundColor Red
    } else {
        Write-Host "Verifying Admin user and assigned role..." -ForegroundColor Green
        & $PsqlPath -U $DbUser -h $DbHost -p $DbPort -w -d $DbName -c "SELECT u.id, u.full_name, u.email, r.name AS role, u.is_active, u.is_email_verified FROM users u JOIN user_roles ur ON u.id = ur.user_id JOIN roles r ON ur.role_id = r.id WHERE LOWER(u.email) = LOWER('$adminEmail');"
    }
} else {
    Write-Host "DEMO_ADMIN_EMAIL and DEMO_ADMIN_PASSWORD not found in .env.local. Skipping admin user creation." -ForegroundColor Yellow
}

# ----------------------------------------------------------------------------
# Seed Default Landing Page Content (site_content table)
# ----------------------------------------------------------------------------
Write-Host "`nEnsuring default landing page site_content is seeded..." -ForegroundColor Cyan
if (Test-Path "$PSScriptRoot\..\scripts\seed_site_content.ts") {
    try {
        node "$PSScriptRoot\..\scripts\seed_site_content.ts"
    } catch {
        Write-Host "Notice: Could not run seed_site_content.ts via node. Default content preserved." -ForegroundColor Yellow
    }
}

Write-Host "`nDatabase setup completed successfully!" -ForegroundColor Green
