# Update Gemini API Key in Supabase Edge Functions
# Simple version

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Update Gemini API Key" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Get Project REF
$envFile = ".env"
$projectRef = $null

if (Test-Path $envFile) {
    $content = Get-Content $envFile -Raw
    if ($content -match 'SUPABASE_URL=https://(\w+)\.supabase\.co') {
        $projectRef = $matches[1]
        Write-Host "Project REF: $projectRef" -ForegroundColor Green
    }
}

if (-not $projectRef) {
    $projectRef = Read-Host "Enter Project REF"
}
Write-Host ""

# Get API Key
Write-Host "Get your Gemini API Key from:" -ForegroundColor Cyan
Write-Host "  https://aistudio.google.com/" -ForegroundColor White
Write-Host ""
$apiKey = Read-Host "Enter Gemini API Key"

if (-not $apiKey -or $apiKey.Trim() -eq "") {
    Write-Host "ERROR: API Key required" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Login to Supabase
Write-Host "Logging in to Supabase..." -ForegroundColor Yellow
try {
    npx supabase login 2>&1 | Out-Null
    Write-Host "Login successful" -ForegroundColor Green
} catch {
    Write-Host "Login failed or already logged in" -ForegroundColor Yellow
}
Write-Host ""

# Link project
Write-Host "Linking project..." -ForegroundColor Yellow
try {
    npx supabase link --project-ref $projectRef 2>&1 | Out-Null
    Write-Host "Project linked" -ForegroundColor Green
} catch {
    Write-Host "Link failed or already linked" -ForegroundColor Yellow
}
Write-Host ""

# Set API Key
Write-Host "Setting GEMINI_API_KEY..." -ForegroundColor Yellow
$secretCommand = "GEMINI_API_KEY=$apiKey"

try {
    $result = npx supabase secrets set $secretCommand 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS: API Key set!" -ForegroundColor Green
    } else {
        Write-Host "FAILED: Could not set API key" -ForegroundColor Red
        Write-Host "Error: $result" -ForegroundColor Red
        Write-Host ""
        Write-Host "Manual method:" -ForegroundColor Yellow
        Write-Host "  1. Go to Supabase Dashboard" -ForegroundColor White
        Write-Host "  2. Edge Functions -> analyze-food-image" -ForegroundColor White
        Write-Host "  3. Secrets tab -> Add Secret" -ForegroundColor White
        Write-Host "  4. Name: GEMINI_API_KEY" -ForegroundColor White
        Write-Host "  5. Value: (paste your key)" -ForegroundColor White
        exit 1
    }
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Wait a moment
Write-Host "Waiting for changes to propagate..." -ForegroundColor Cyan
Start-Sleep -Seconds 3
Write-Host ""

# Verify
Write-Host "Verifying..." -ForegroundColor Yellow

$supabaseUrl = $envVars["SUPABASE_URL"]
$anonKey = $envVars["SUPABASE_ANON_KEY"]

if ($supabaseUrl -and $anonKey) {
    try {
        $healthUrl = $supabaseUrl.Replace('.supabase.co', '.functions.supabase.co') + '/health'
        $headers = @{
            "apikey" = $anonKey
            "Authorization" = "Bearer $anonKey"
        }
        
        $health = Invoke-RestMethod -Uri $healthUrl -Method GET -Headers $headers -TimeoutSec 10
        
        if ($health.envGemini) {
            Write-Host "VERIFIED: Gemini API Key is set correctly!" -ForegroundColor Green
        } else {
            Write-Host "WARNING: Key may not be set yet" -ForegroundColor Yellow
            Write-Host "Wait a few minutes and try again" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Could not verify (health check failed)" -ForegroundColor Yellow
    }
}
Write-Host ""

# Done
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Done!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Test API: .\scripts\test-gemini-api.ps1" -ForegroundColor White
Write-Host "  2. Try scanning food in app" -ForegroundColor White
Write-Host ""
