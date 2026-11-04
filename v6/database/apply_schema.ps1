param (
    [string]$DbUser = "postgres",
    [string]$DbPassword = $env:PGPASSWORD,
    [string]$DbHost = "localhost",
    [int]$DbPort = 5432,
    [string]$DbName = "solarscope_db",
    [string]$PsqlPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
)

if (-not $DbPassword) {
    Write-Host "Please provide the PostgreSQL password via -DbPassword parameter or `$env:PGPASSWORD." -ForegroundColor Yellow
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

Write-Host "`nDatabase setup completed successfully!" -ForegroundColor Green

