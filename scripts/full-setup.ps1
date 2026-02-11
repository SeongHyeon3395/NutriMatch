# NutriMatch 전체 백엔드 자동 설정
# 이 스크립트는 Gemini API + Storage를 한 번에 설정합니다

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "NutriMatch 전체 설정 시작" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "이 스크립트는 다음을 자동으로 설정합니다:" -ForegroundColor Yellow
Write-Host "  1. Gemini API Key 설정" -ForegroundColor White
Write-Host "  2. Storage 버킷 생성" -ForegroundColor White
Write-Host "  3. RLS 정책 생성 (SQL 제공)" -ForegroundColor White
Write-Host "  4. 전체 상태 확인" -ForegroundColor White
Write-Host ""

# 0. 사전 확인
Write-Host "0. 사전 확인..." -ForegroundColor Yellow
$envFile = ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "  ❌ .env 파일이 없습니다!" -ForegroundColor Red
    Write-Host "  → .env.example을 복사해서 .env를 만들고 설정해주세요" -ForegroundColor Yellow
    exit 1
}

$envVars = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match "^([^#][^=]+)=(.*)$") {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        $envVars[$key] = $value
    }
}

$supabaseUrl = $envVars["SUPABASE_URL"]
$anonKey = $envVars["SUPABASE_ANON_KEY"]

if (-not $supabaseUrl -or -not $anonKey) {
    Write-Host "  ❌ .env에 SUPABASE_URL 또는 SUPABASE_ANON_KEY가 없습니다" -ForegroundColor Red
    exit 1
}

Write-Host "  ✅ .env 설정 확인 완료" -ForegroundColor Green
Write-Host ""

# 1. 필요한 정보 수집
Write-Host "1. 설정 정보 입력..." -ForegroundColor Yellow
Write-Host ""

# Gemini API Key
Write-Host "  💡 Gemini API Key 입력 (https://aistudio.google.com/)" -ForegroundColor Cyan
$geminiKey = Read-Host "  Gemini API Key"

if (-not $geminiKey -or $geminiKey.Trim() -eq "") {
    Write-Host "  ❌ Gemini API Key가 필요합니다" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Service Role Key
Write-Host "  💡 Supabase Service Role Key 입력" -ForegroundColor Cyan
Write-Host "     (Dashboard → Settings → API → service_role key)" -ForegroundColor DarkGray
$serviceRoleKey = Read-Host "  Service Role Key"

if (-not $serviceRoleKey -or $serviceRoleKey.Trim() -eq "") {
    Write-Host "  ❌ Service Role Key가 필요합니다" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "  ✅ 정보 입력 완료" -ForegroundColor Green
Write-Host ""

# 2. Gemini API 설정
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "2. Gemini API 설정" -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

try {
    & ".\scripts\update-gemini-key.ps1" -ApiKey $geminiKey
    Write-Host ""
    Write-Host "  ✅ Gemini API 설정 완료" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Gemini API 설정 중 문제 발생: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "  → 계속 진행합니다..." -ForegroundColor Yellow
}
Write-Host ""

# 3. Storage 설정
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "3. Storage 설정" -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

try {
    & ".\scripts\setup-storage.ps1" -ServiceRoleKey $serviceRoleKey
    Write-Host ""
    Write-Host "  ✅ Storage 설정 진행 완료" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Storage 설정 중 문제 발생: $($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Host ""

# 4. 최종 진단
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "4. 전체 상태 확인" -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

Start-Sleep -Seconds 2

try {
    & ".\scripts\diagnose-backend.ps1"
} catch {
    Write-Host "  ⚠️  진단 스크립트 실행 실패: $($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Host ""

# 5. 최종 안내
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "설정 완료!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ 완료된 작업:" -ForegroundColor Green
Write-Host "  1. Gemini API Key 설정" -ForegroundColor White
Write-Host "  2. Storage 버킷 생성 (food-images, profile-avatars)" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  수동 작업 필요:" -ForegroundColor Yellow
Write-Host "  → Supabase SQL Editor에서 RLS 정책 실행" -ForegroundColor White
Write-Host "  → SQL 코드는 클립보드 또는 supabase/migrations/*.sql 파일 참조" -ForegroundColor White
Write-Host ""
Write-Host "📋 다음 단계:" -ForegroundColor Cyan
Write-Host "  1. Supabase Dashboard 접속" -ForegroundColor White
Write-Host "  2. SQL Editor → New Query" -ForegroundColor White
Write-Host "  3. 클립보드의 SQL 붙여넣기 (Ctrl+V)" -ForegroundColor White
Write-Host "  4. Run 버튼 클릭 또는 Ctrl+Enter" -ForegroundColor White
Write-Host "  5. 앱 재시작: npm start -- --reset-cache" -ForegroundColor White
Write-Host "  6. 음식 스캔 테스트" -ForegroundColor White
Write-Host ""
Write-Host "🎉 설정이 완료되면 히스토리에서 이미지가 정상적으로 표시됩니다!" -ForegroundColor Green
Write-Host ""
Write-Host "❓ 문제가 있다면:" -ForegroundColor Yellow
Write-Host "  → TROUBLESHOOTING.md 참조" -ForegroundColor Cyan
Write-Host "  → .\scripts\diagnose-backend.ps1 재실행" -ForegroundColor Cyan
Write-Host ""
