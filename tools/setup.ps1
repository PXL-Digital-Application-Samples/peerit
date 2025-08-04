# PowerShell script for Windows development setup

Write-Host "Setting up Peerit development environment..." -ForegroundColor Green

# Check if Docker is running
if (!(Get-Process "Docker Desktop" -ErrorAction SilentlyContinue)) {
    Write-Host "Please start Docker Desktop first" -ForegroundColor Red
    exit 1
}

# Create environment files from examples
Write-Host "Creating environment files..." -ForegroundColor Yellow

$services = @(
    "apps/frontend",
    "apps/bff",
    "services/auth-service", 
    "services/team-service"
)

foreach ($service in $services) {
    $envExample = "$service/.env.example"
    $envFile = "$service/.env"
    
    if (Test-Path $envExample) {
        if (!(Test-Path $envFile)) {
            Copy-Item $envExample $envFile
            Write-Host "Created $envFile" -ForegroundColor Green
        } else {
            Write-Host "$envFile already exists" -ForegroundColor Yellow
        }
    }
}

# Start infrastructure services
Write-Host "Starting infrastructure services..." -ForegroundColor Yellow
Set-Location "infra/docker"
docker-compose up -d postgres redis
Start-Sleep 10

# Wait for database to be ready
Write-Host "Waiting for database to be ready..." -ForegroundColor Yellow
do {
    Start-Sleep 2
    $result = docker exec peerit-postgres-1 pg_isready -U peerit 2>$null
} while ($LASTEXITCODE -ne 0)

Write-Host "Database is ready!" -ForegroundColor Green

# Start all services
Write-Host "Starting all services..." -ForegroundColor Yellow
docker-compose up -d

Write-Host "Development environment is ready!" -ForegroundColor Green
Write-Host "Access the application at: http://localhost" -ForegroundColor Cyan
Write-Host "API Gateway: http://localhost:80" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
