# Gemini API 작동 테스트
# Edge Function에서 실제로 API가 작동하는지 확인

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Gemini API Test" -ForegroundColor Cyan
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

# Get functions URL
$functionsUrl = $supabaseUrl -replace '\.supabase\.co', '.functions.supabase.co'

Write-Host "Supabase URL: $supabaseUrl" -ForegroundColor Green
Write-Host "Functions URL: $functionsUrl" -ForegroundColor Green
Write-Host ""

# 1. Health Check
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "1. Health Check" -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

$headers = @{
    "apikey" = $anonKey
    "Authorization" = "Bearer $anonKey"
}

try {
    $healthUrl = "$functionsUrl/health"
    $health = Invoke-RestMethod -Uri $healthUrl -Method GET -Headers $headers -TimeoutSec 10
    
    Write-Host "Response:" -ForegroundColor Green
    Write-Host "  ok: $($health.ok)" -ForegroundColor White
    Write-Host "  message: $($health.message)" -ForegroundColor White
    
    if ($health.env) {
        Write-Host ""
        Write-Host "Environment:" -ForegroundColor Cyan
        Write-Host "  hasSupabaseUrl: $($health.env.hasSupabaseUrl)" -ForegroundColor $(if ($health.env.hasSupabaseUrl) { "Green" } else { "Red" })
        Write-Host "  hasSupabaseKey: $($health.env.hasSupabaseKey)" -ForegroundColor $(if ($health.env.hasSupabaseKey) { "Green" } else { "Red" })
        Write-Host "  hasGeminiKey: $($health.env.hasGeminiKey)" -ForegroundColor $(if ($health.env.hasGeminiKey) { "Green" } else { "Red" })
        
        if (-not $health.env.hasGeminiKey) {
            Write-Host ""
            Write-Host "FAIL: GEMINI_API_KEY not set in Edge Function!" -ForegroundColor Red
            Write-Host "  Run: .\scripts\update-gemini-key.ps1" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "FAIL: Health check failed" -ForegroundColor Red
    Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 2. Test image analysis with sample
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "2. Test Image Analysis" -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Create a minimal test image (1x1 pixel PNG)
$testImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
$testImageBytes = [Convert]::FromBase64String($testImageBase64)

# Create form data
$boundary = [System.Guid]::NewGuid().ToString()
$LF = "`r`n"

$bodyLines = @(
    "--$boundary",
    'Content-Disposition: form-data; name="file"; filename="test.png"',
    'Content-Type: image/png',
    '',
    [System.Text.Encoding]::GetEncoding("iso-8859-1").GetString($testImageBytes),
    "--$boundary",
    'Content-Disposition: form-data; name="userContext"',
    '',
    '{"bodyGoal":"maintenance","healthDiet":"none_health"}',
    "--$boundary--"
)

$body = $bodyLines -join $LF

$analysisHeaders = @{
    "apikey" = $anonKey
    "Authorization" = "Bearer $anonKey"
    "Content-Type" = "multipart/form-data; boundary=$boundary"
}

try {
    Write-Host "Calling analyze-food-image..." -ForegroundColor Cyan
    Write-Host "(This may take 10-30 seconds)" -ForegroundColor DarkGray
    Write-Host ""
    
    $analysisUrl = "$functionsUrl/analyze-food-image"
    $result = Invoke-RestMethod -Uri $analysisUrl -Method POST -Headers $analysisHeaders -Body $body -TimeoutSec 60
    
    if ($result.ok) {
        Write-Host "SUCCESS: API is working!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Response data:" -ForegroundColor Cyan
        Write-Host "  dish: $($result.data.dish)" -ForegroundColor White
        Write-Host "  confidence: $($result.data.confidence)" -ForegroundColor White
        Write-Host "  userAnalysis grade: $($result.data.userAnalysis.grade)" -ForegroundColor White
        
        if ($result.data.dish -and $result.data.dish -ne "unknown") {
            Write-Host ""
            Write-Host "PASS: Gemini API is working correctly!" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "WARN: API returned 'unknown' - Gemini may not recognize test image" -ForegroundColor Yellow
            Write-Host "      Try with real food photo in app" -ForegroundColor Yellow
        }
    } else {
        Write-Host "FAIL: API returned error" -ForegroundColor Red
        Write-Host "  message: $($result.message)" -ForegroundColor Red
        Write-Host "  code: $($result.code)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "FAIL: API call failed" -ForegroundColor Red
    Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
    
    # Try to parse error response
    if ($_.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errorBody = $reader.ReadToEnd()
            Write-Host ""
            Write-Host "Error response:" -ForegroundColor Yellow
            Write-Host $errorBody -ForegroundColor White
        } catch {}
    }
}
Write-Host ""

# 3. Check Edge Function logs
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "3. Check Logs" -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "To see detailed logs:" -ForegroundColor Cyan
Write-Host "  1. Supabase Dashboard -> Edge Functions" -ForegroundColor White
Write-Host "  2. Click 'analyze-food-image'" -ForegroundColor White
Write-Host "  3. Click 'Logs' tab" -ForegroundColor White
Write-Host ""
Write-Host "Look for:" -ForegroundColor Yellow
Write-Host "  - [ERROR] GEMINI_API_KEY is not set" -ForegroundColor White
Write-Host "  - Gemini API Error (429) - rate limit" -ForegroundColor White
Write-Host "  - Gemini API Error (403) - invalid key" -ForegroundColor White
Write-Host ""

# 4. Summary
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Common Issues:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. 'GEMINI_API_KEY not set'" -ForegroundColor White
Write-Host "   Fix: .\scripts\update-gemini-key.ps1" -ForegroundColor DarkGray
Write-Host ""
Write-Host "2. 'Unknown food' always returned" -ForegroundColor White
Write-Host "   Possible reasons:" -ForegroundColor DarkGray
Write-Host "   - Invalid API key" -ForegroundColor DarkGray
Write-Host "   - Wrong Gemini model" -ForegroundColor DarkGray
Write-Host "   - Rate limit exceeded" -ForegroundColor DarkGray
Write-Host "   - Image upload/encoding issue" -ForegroundColor DarkGray
Write-Host ""
Write-Host "3. 'Gemini API Error (429)'" -ForegroundColor White
Write-Host "   Reason: Too many requests" -ForegroundColor DarkGray
Write-Host "   Fix: Wait a few minutes" -ForegroundColor DarkGray
Write-Host ""

Write-Host "Done! Check results above." -ForegroundColor Green
