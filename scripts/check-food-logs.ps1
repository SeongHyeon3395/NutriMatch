# Check actual food_logs in Supabase
# This will show if images were stored locally or in Storage

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Check Food Logs Status" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Load .env
$envFile = ".env"
$envVars = @{}
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $envVars[$matches[1].Trim()] = $matches[2].Trim()
        }
    }
}

$supabaseUrl = $envVars["SUPABASE_URL"]
$anonKey = $envVars["SUPABASE_ANON_KEY"]

if (-not $supabaseUrl -or -not $anonKey) {
    Write-Host "ERROR: Missing Supabase config" -ForegroundColor Red
    exit 1
}

Write-Host "Checking Supabase database..." -ForegroundColor Yellow
Write-Host ""

# Query food_logs
$headers = @{
    "apikey" = $anonKey
    "Authorization" = "Bearer $anonKey"
}

try {
    $url = "$supabaseUrl/rest/v1/food_logs"
    $queryString = "?select=id,user_id,image_uri,image_path,occurred_at&order=occurred_at.desc&limit=10"
    $logs = Invoke-RestMethod -Uri ($url + $queryString) -Method GET -Headers $headers
    
    if ($logs -and $logs.Count -gt 0) {
        Write-Host "Found $($logs.Count) food logs:" -ForegroundColor Green
        Write-Host ""
        
        $localOnlyCount = 0
        $storageCount = 0
        
        foreach ($log in $logs) {
            Write-Host "Record: $($log.id)" -ForegroundColor Cyan
            Write-Host "  User ID: $($log.user_id)" -ForegroundColor White
            Write-Host "  Date: $($log.occurred_at)" -ForegroundColor White
            
            if ($log.image_path) {
                Write-Host "  image_path: $($log.image_path)" -ForegroundColor Green
                Write-Host "  STATUS: Stored in Supabase Storage (GOOD)" -ForegroundColor Green
                $storageCount++
            } else {
                Write-Host "  image_path: NULL" -ForegroundColor Red
                
                if ($log.image_uri) {
                    $uri = $log.image_uri
                    if ($uri -match '^file://|^content://') {
                        Write-Host "  image_uri: LOCAL PATH ($($uri.Substring(0,40))...)" -ForegroundColor Yellow
                        Write-Host "  STATUS: Only saved locally (BAD - won't work on other devices)" -ForegroundColor Red
                        $localOnlyCount++
                    } elseif ($uri -match 'supabase\.co') {
                        Write-Host "  image_uri: Supabase URL" -ForegroundColor Green
                        $storageCount++
                    } else {
                        Write-Host "  image_uri: $($uri.Substring(0,40))..." -ForegroundColor White
                    }
                } else {
                    Write-Host "  image_uri: NULL" -ForegroundColor Red
                }
            }
            Write-Host ""
        }
        
        Write-Host "==================================" -ForegroundColor Cyan
        Write-Host "SUMMARY" -ForegroundColor Yellow
        Write-Host "==================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Total records: $($logs.Count)" -ForegroundColor White
        Write-Host "Properly stored in Storage: $storageCount" -ForegroundColor Green
        Write-Host "Only saved locally (problem): $localOnlyCount" -ForegroundColor Red
        Write-Host ""
        
        if ($localOnlyCount -gt 0) {
            Write-Host "DIAGNOSIS:" -ForegroundColor Red
            Write-Host "  - Storage bucket was missing when these were saved" -ForegroundColor Yellow
            Write-Host "  - Images only saved on original device" -ForegroundColor Yellow
            Write-Host "  - Cannot access from other devices" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "SOLUTION:" -ForegroundColor Cyan
            Write-Host "  1. Create Storage buckets (run setup-storage.ps1)" -ForegroundColor White
            Write-Host "  2. Scan NEW foods - they will save properly" -ForegroundColor White
            Write-Host "  3. Old records cannot be fixed (no image file)" -ForegroundColor DarkGray
        } else {
            Write-Host "All images properly stored!" -ForegroundColor Green
        }
        
    } else {
        Write-Host "No food logs found in database" -ForegroundColor Yellow
        Write-Host "This could mean:" -ForegroundColor Cyan
        Write-Host "  - Different user account" -ForegroundColor White
        Write-Host "  - Using local mode only" -ForegroundColor White
        Write-Host "  - No foods scanned yet" -ForegroundColor White
    }
    
} catch {
    Write-Host "ERROR: Cannot access food_logs table" -ForegroundColor Red
    Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
