# Gemini API 테스트 스크립트
Write-Host "🔍 Gemini API 테스트 준비 중..." -ForegroundColor Cyan
Write-Host ""

# Supabase Secrets에서 API 키를 가져올 수 없으므로 사용자에게 안내
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "⚠️  Supabase Secrets는 보안상 직접 조회할 수 없습니다." -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host ""
Write-Host "다음 두 가지 방법 중 하나를 선택하세요:" -ForegroundColor White
Write-Host ""
Write-Host "방법 1: Gemini API 키를 직접 입력" -ForegroundColor Green
Write-Host "  1. https://aistudio.google.com/app/apikey 방문" -ForegroundColor Gray
Write-Host "  2. API 키 생성 또는 기존 키 복사" -ForegroundColor Gray
Write-Host "  3. 아래에 붙여넣기" -ForegroundColor Gray
Write-Host ""
Write-Host "방법 2: Supabase Dashboard에서 Edge Function 로그 확인" -ForegroundColor Green
Write-Host "  1. https://supabase.com/dashboard/project/wrgeaabfsbjdgtjcwevv/functions" -ForegroundColor Gray
Write-Host "  2. analyze-food-image 함수 클릭" -ForegroundColor Gray
Write-Host "  3. Logs 탭에서 [DEBUG] 메시지 확인" -ForegroundColor Gray
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host ""

$apiKey = Read-Host "Gemini API 키를 입력하세요 (Enter로 건너뛰기)"

if ([string]::IsNullOrWhiteSpace($apiKey)) {
    Write-Host ""
    Write-Host "❌ API 키가 입력되지 않았습니다." -ForegroundColor Red
    Write-Host ""
    Write-Host "📱 대신 앱에서 직접 테스트하세요:" -ForegroundColor Cyan
    Write-Host "  1. 에뮬레이터에서 앱 실행" -ForegroundColor Gray
    Write-Host "  2. 스캔 화면에서 음식 사진 촬영" -ForegroundColor Gray
    Write-Host "  3. Supabase Dashboard 로그 확인:" -ForegroundColor Gray
    Write-Host "     https://supabase.com/dashboard/project/wrgeaabfsbjdgtjcwevv/functions" -ForegroundColor Gray
    Write-Host ""
    exit 0
}

Write-Host ""
Write-Host "🚀 API 테스트 실행 중..." -ForegroundColor Cyan
Write-Host ""

node test-gemini-api.js $apiKey

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
