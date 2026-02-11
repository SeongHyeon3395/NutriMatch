# Supabase Edge Function에 Gemini API Key 설정 스크립트
# 사용법: .\scripts\update-gemini-key.ps1

param(
    [Parameter(Mandatory=$false)]
    [string]$ApiKey,
    
    [Parameter(Mandatory=$false)]
    [string]$ProjectRef
)

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Supabase Gemini API 업데이트" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# 1. Supabase CLI 설치 확인
Write-Host "1. Supabase CLI 확인..." -ForegroundColor Yellow
try {
    $cliVersion = npx supabase --version 2>&1
    Write-Host "  ✅ Supabase CLI 설치됨: $cliVersion" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Supabase CLI가 설치되지 않았습니다" -ForegroundColor Red
    Write-Host "  → npm install -g supabase 실행 또는" -ForegroundColor Yellow
    Write-Host "  → npx 명령어를 사용합니다" -ForegroundColor Yellow
}
Write-Host ""

# 2. Project REF 확인
if (-not $ProjectRef) {
    Write-Host "2. Project REF 확인..." -ForegroundColor Yellow
    $envFile = ".env"
    if (Test-Path $envFile) {
        $content = Get-Content $envFile
        $supabaseUrl = ($content | Where-Object { $_ -match "^SUPABASE_URL=" }) -replace "^SUPABASE_URL=", ""
        
        if ($supabaseUrl -and $supabaseUrl -match "https://([^.]+)\.supabase\.co") {
            $ProjectRef = $matches[1]
            Write-Host "  ✅ .env에서 자동 감지: $ProjectRef" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  .env에서 Project REF를 찾을 수 없습니다" -ForegroundColor Yellow
            $ProjectRef = Read-Host "  Project REF를 입력하세요 (예: abcdefghijklmnop)"
        }
    } else {
        Write-Host "  ⚠️  .env 파일이 없습니다" -ForegroundColor Yellow
        $ProjectRef = Read-Host "  Project REF를 입력하세요 (예: abcdefghijklmnop)"
    }
} else {
    Write-Host "2. Project REF: $ProjectRef" -ForegroundColor Green
}
Write-Host ""

# 3. API Key 입력
if (-not $ApiKey) {
    Write-Host "3. Gemini API Key 입력..." -ForegroundColor Yellow
    Write-Host "  💡 API Key 발급: https://aistudio.google.com/" -ForegroundColor Cyan
    $ApiKey = Read-Host "  Gemini API Key를 입력하세요"
} else {
    Write-Host "3. API Key 제공됨" -ForegroundColor Green
}

if (-not $ApiKey -or $ApiKey.Trim() -eq "") {
    Write-Host "  ❌ API Key가 필요합니다" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 4. Supabase 로그인 확인
Write-Host "4. Supabase 로그인 확인..." -ForegroundColor Yellow
Write-Host "  💡 브라우저가 열리면 로그인하세요" -ForegroundColor Cyan
try {
    npx supabase login 2>&1 | Out-Null
    Write-Host "  ✅ 로그인 성공" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  로그인 상태를 확인할 수 없습니다. 계속 진행합니다..." -ForegroundColor Yellow
}
Write-Host ""

# 5. 프로젝트 연결
Write-Host "5. Supabase 프로젝트 연결..." -ForegroundColor Yellow
try {
    npx supabase link --project-ref $ProjectRef 2>&1 | Out-Null
    Write-Host "  ✅ 프로젝트 연결 성공" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  프로젝트 연결 실패. 이미 연결되었을 수 있습니다." -ForegroundColor Yellow
}
Write-Host ""

# 6. Gemini API Key 설정
Write-Host "6. Gemini API Key 설정..." -ForegroundColor Yellow
Write-Host "  📡 Supabase에 업로드 중..." -ForegroundColor Cyan

try {
    $result = npx supabase secrets set "GEMINI_API_KEY=$ApiKey" 2>&1
    
    if ($LASTEXITCODE -eq 0 -or $result -match "success|set") {
        Write-Host "  ✅ GEMINI_API_KEY 설정 완료" -ForegroundColor Green
    } else {
        Write-Host "  ❌ 설정 실패" -ForegroundColor Red
        Write-Host "  오류: $result" -ForegroundColor Red
        Write-Host ""
        Write-Host "  📌 수동 설정 방법:" -ForegroundColor Yellow
        Write-Host "    1. Supabase Dashboard 접속" -ForegroundColor White
        Write-Host "    2. Edge Functions → analyze-food-image" -ForegroundColor White
        Write-Host "    3. Secrets 탭 → Add Secret" -ForegroundColor White
        Write-Host "    4. Name: GEMINI_API_KEY" -ForegroundColor White
        Write-Host "    5. Value: (API Key 입력)" -ForegroundColor White
        exit 1
    }
} catch {
    Write-Host "  ❌ 설정 실패: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 7. 추가 환경변수 설정 (선택)
Write-Host "7. 추가 설정 (선택사항)..." -ForegroundColor Yellow
$setModels = Read-Host "  Gemini 모델을 지정하시겠습니까? (y/N)"

if ($setModels -eq "y" -or $setModels -eq "Y") {
    Write-Host ""
    Write-Host "  사용 가능한 모델:" -ForegroundColor Cyan
    Write-Host "    - gemini-2.0-flash-exp (빠르고 최신, 무료 tier)" -ForegroundColor White
    Write-Host "    - gemini-2.5-flash (기본값)" -ForegroundColor White
    Write-Host "    - gemini-2.5-flash-lite (더 빠름, 가벼움)" -ForegroundColor White
    Write-Host "    - gemini-1.5-flash (안정적)" -ForegroundColor White
    Write-Host ""
    
    $imageModel = Read-Host "  이미지 분석 모델 (기본: gemini-2.5-flash)"
    if ($imageModel -and $imageModel.Trim() -ne "") {
        npx supabase secrets set "GEMINI_IMAGE_MODEL=$imageModel" 2>&1 | Out-Null
        Write-Host "    ✅ GEMINI_IMAGE_MODEL = $imageModel" -ForegroundColor Green
    }
    
    $textModel = Read-Host "  텍스트 생성 모델 (기본: gemini-2.5-flash-lite)"
    if ($textModel -and $textModel.Trim() -ne "") {
        npx supabase secrets set "GEMINI_TEXT_MODEL=$textModel" 2>&1 | Out-Null
        Write-Host "    ✅ GEMINI_TEXT_MODEL = $textModel" -ForegroundColor Green
    }
}
Write-Host ""

# 8. 설정 확인
Write-Host "8. 설정 확인..." -ForegroundColor Yellow
Write-Host "  📡 Health Check 호출 중..." -ForegroundColor Cyan

Start-Sleep -Seconds 2

try {
    $envFile = ".env"
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
            $healthUrl = "$($supabaseUrl.Replace('.supabase.co', '.functions.supabase.co'))/health"
            $headers = @{
                "apikey" = $supabaseKey
                "Authorization" = "Bearer $supabaseKey"
            }
            
            $response = Invoke-RestMethod -Uri $healthUrl -Method GET -Headers $headers -TimeoutSec 10
            
            if ($response.env.hasGeminiKey) {
                Write-Host "  ✅ GEMINI_API_KEY 확인됨!" -ForegroundColor Green
            } else {
                Write-Host "  ⚠️  GEMINI_API_KEY가 아직 적용되지 않았습니다" -ForegroundColor Yellow
                Write-Host "  → 몇 분 후 다시 확인하거나, Edge Function을 재배포하세요" -ForegroundColor Yellow
            }
        }
    }
} catch {
    Write-Host "  ⚠️  Health Check 실패. 수동으로 확인하세요." -ForegroundColor Yellow
}
Write-Host ""

# 9. 완료
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "설정 완료!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ 다음 단계:" -ForegroundColor Yellow
Write-Host "  1. .\scripts\diagnose-backend.ps1 실행하여 전체 상태 확인" -ForegroundColor White
Write-Host "  2. 앱 재실행: npm start -- --reset-cache" -ForegroundColor White
Write-Host "  3. 음식 스캔 테스트" -ForegroundColor White
Write-Host ""
Write-Host "📖 문제가 있다면:" -ForegroundColor Yellow
Write-Host "  → TROUBLESHOOTING.md 참조" -ForegroundColor Cyan
Write-Host ""
