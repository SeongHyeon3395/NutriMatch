# NutriMatch 백엔드 진단 스크립트
# 이미지 문제 및 Gemini API 설정 확인

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "NutriMatch 백엔드 진단 시작" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# 1. 환경 변수 파일 확인
Write-Host "1. 환경 변수 파일 확인..." -ForegroundColor Yellow
$envFile = ".env"
if (Test-Path $envFile) {
    Write-Host "  ✅ .env 파일 존재" -ForegroundColor Green
    
    $content = Get-Content $envFile
    $hasSupabaseUrl = $content | Where-Object { $_ -match "^SUPABASE_URL=" }
    $hasSupabaseKey = $content | Where-Object { $_ -match "^SUPABASE_ANON_KEY=" }
    $hasBaseUrl = $content | Where-Object { $_ -match "^BASE_URL=" }
    
    if ($hasSupabaseUrl) {
        Write-Host "  ✅ SUPABASE_URL 설정됨" -ForegroundColor Green
        $url = ($hasSupabaseUrl -split "=", 2)[1].Trim()
        if ($url -match "https://([^.]+)\.supabase\.co") {
            $projectRef = $matches[1]
            Write-Host "  📌 Project REF: $projectRef" -ForegroundColor Cyan
        }
    } else {
        Write-Host "  ❌ SUPABASE_URL 없음" -ForegroundColor Red
    }
    
    if ($hasSupabaseKey) {
        Write-Host "  ✅ SUPABASE_ANON_KEY 설정됨" -ForegroundColor Green
    } else {
        Write-Host "  ❌ SUPABASE_ANON_KEY 없음" -ForegroundColor Red
    }
    
    if ($hasBaseUrl) {
        Write-Host "  ✅ BASE_URL 설정됨" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  BASE_URL 없음 (SUPABASE_URL에서 자동 생성됨)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ❌ .env 파일 없음!" -ForegroundColor Red
    Write-Host "  → .env.example을 복사해서 .env를 만들어주세요" -ForegroundColor Yellow
}
Write-Host ""

# 2. Supabase 설정 로드
Write-Host "2. Supabase 연결 테스트..." -ForegroundColor Yellow
try {
    if (Test-Path $envFile) {
        $envVars = @{}
        Get-Content $envFile | ForEach-Object {
            if ($_ -match "^([^#][^=]+)=(.*)$") {
                $key = $matches[1].Trim()
                $value = $matches[2].Trim()
                $envVars[$key] = $value
            }
        }
        
        $supabaseUrl = $envVars["SUPABASE_URL"]
        $supabaseKey = $envVars["SUPABASE_ANON_KEY"]
        
        if ($supabaseUrl -and $supabaseKey) {
            # Health check 호출
            $healthUrl = "$($supabaseUrl.Replace('.supabase.co', '.functions.supabase.co'))/health"
            Write-Host "  📡 Health Check 호출: $healthUrl" -ForegroundColor Cyan
            
            $headers = @{
                "apikey" = $supabaseKey
                "Authorization" = "Bearer $supabaseKey"
            }
            
            try {
                $response = Invoke-RestMethod -Uri $healthUrl -Method GET -Headers $headers -TimeoutSec 10
                Write-Host "  ✅ API 응답 성공" -ForegroundColor Green
                Write-Host ""
                Write-Host "  📊 상태 정보:" -ForegroundColor Cyan
                Write-Host "    - ok: $($response.ok)" -ForegroundColor White
                Write-Host "    - message: $($response.message)" -ForegroundColor White
                
                if ($response.env) {
                    Write-Host "    - hasSupabaseUrl: $($response.env.hasSupabaseUrl)" -ForegroundColor $(if ($response.env.hasSupabaseUrl) { "Green" } else { "Red" })
                    Write-Host "    - hasSupabaseKey: $($response.env.hasSupabaseKey)" -ForegroundColor $(if ($response.env.hasSupabaseKey) { "Green" } else { "Red" })
                    Write-Host "    - hasGeminiKey: $($response.env.hasGeminiKey)" -ForegroundColor $(if ($response.env.hasGeminiKey) { "Green" } else { "Red" })
                    
                    if (-not $response.env.hasGeminiKey) {
                        Write-Host ""
                        Write-Host "  ⚠️  GEMINI_API_KEY가 설정되지 않았습니다!" -ForegroundColor Red
                        Write-Host "  → Supabase에서 Edge Function 환경변수를 설정해야 합니다" -ForegroundColor Yellow
                        Write-Host "  → 방법: TROUBLESHOOTING.md 참조" -ForegroundColor Yellow
                    }
                }
            } catch {
                Write-Host "  ❌ Health Check 실패" -ForegroundColor Red
                Write-Host "  오류: $($_.Exception.Message)" -ForegroundColor Red
                
                if ($_.Exception.Message -match "404") {
                    Write-Host "  → Health Function이 배포되지 않았거나 URL이 잘못되었습니다" -ForegroundColor Yellow
                } elseif ($_.Exception.Message -match "unauthorized|403") {
                    Write-Host "  → API Key가 잘못되었습니다" -ForegroundColor Yellow
                } else {
                    Write-Host "  → 네트워크 문제이거나 Supabase 서비스가 다운되었을 수 있습니다" -ForegroundColor Yellow
                }
            }
        } else {
            Write-Host "  ❌ SUPABASE_URL 또는 SUPABASE_ANON_KEY가 없습니다" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "  ❌ 설정 로드 실패: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 3. Storage 버킷 확인 안내
Write-Host "3. Supabase Storage 확인 필요 항목" -ForegroundColor Yellow
Write-Host "  📌 다음 항목들을 Supabase Dashboard에서 확인하세요:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  버킷 확인 (Storage → Buckets):" -ForegroundColor White
Write-Host "    - [ ] food-images 버킷 존재" -ForegroundColor White
Write-Host "    - [ ] profile-avatars 버킷 존재" -ForegroundColor White
Write-Host "    - [ ] 두 버킷 모두 Public 설정" -ForegroundColor White
Write-Host ""
Write-Host "  RLS 정책 확인 (각 버킷의 Policies 탭):" -ForegroundColor White
Write-Host "    - [ ] INSERT 정책 (authenticated 사용자 업로드 허용)" -ForegroundColor White
Write-Host "    - [ ] SELECT 정책 (public 읽기 허용)" -ForegroundColor White
Write-Host "    - [ ] DELETE 정책 (본인 파일 삭제 허용)" -ForegroundColor White
Write-Host ""

# 4. Edge Function 환경변수 확인 안내
Write-Host "4. Edge Function 환경변수 확인 방법" -ForegroundColor Yellow
Write-Host "  📌 Supabase Dashboard → Edge Functions → analyze-food-image" -ForegroundColor Cyan
Write-Host "    → Secrets 탭에서 확인:" -ForegroundColor Cyan
Write-Host ""
Write-Host "    필수 환경변수:" -ForegroundColor White
Write-Host "    - GEMINI_API_KEY (필수)" -ForegroundColor White
Write-Host "    - GEMINI_IMAGE_MODEL (선택, 기본: gemini-2.5-flash)" -ForegroundColor White
Write-Host "    - GEMINI_TEXT_MODEL (선택, 기본: gemini-2.5-flash-lite)" -ForegroundColor White
Write-Host ""

# 5. 데이터베이스 테이블 확인
Write-Host "5. 데이터베이스 테이블 확인" -ForegroundColor Yellow
Write-Host "  📌 다음 테이블들이 있어야 합니다:" -ForegroundColor Cyan
Write-Host "    - [ ] app_users (사용자 프로필)" -ForegroundColor White
Write-Host "    - [ ] food_logs (음식 기록)" -ForegroundColor White
Write-Host "    - [ ] food_nutrition (가공식품 DB)" -ForegroundColor White
Write-Host "    - [ ] foot_normal (일반음식 DB)" -ForegroundColor White
Write-Host ""

# 6. 종합 진단 결과
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "진단 완료" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📖 자세한 해결 방법:" -ForegroundColor Yellow
Write-Host "   → TROUBLESHOOTING.md 파일 참조" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔧 다음 단계:" -ForegroundColor Yellow
Write-Host "   1. 위 체크리스트를 확인하세요" -ForegroundColor White
Write-Host "   2. 누락된 항목을 Supabase Dashboard에서 설정하세요" -ForegroundColor White
Write-Host "   3. 앱을 재실행하고 스캔을 테스트하세요" -ForegroundColor White
Write-Host ""
