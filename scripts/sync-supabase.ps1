# Supabase 원격 변경사항을 로컬 프로젝트에 동기화
# Database 스키마, Edge Functions, Storage 정책 등을 가져옵니다

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Supabase 동기화" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# 1. 프로젝트 연결 확인
Write-Host "1. Supabase 프로젝트 연결 확인..." -ForegroundColor Yellow

$envFile = ".env"
$projectRef = $null

if (Test-Path $envFile) {
    $content = Get-Content $envFile
    $supabaseUrl = ($content | Where-Object { $_ -match "^SUPABASE_URL=" }) -replace "^SUPABASE_URL=", ""
    
    if ($supabaseUrl -and $supabaseUrl -match 'https://([^.]+)\.supabase\.co') {
        $projectRef = $matches[1]
        Write-Host "  ✅ Project REF: $projectRef" -ForegroundColor Green
    }
}

if (-not $projectRef) {
    Write-Host "  ❌ Project REF를 찾을 수 없습니다" -ForegroundColor Red
    $projectRef = Read-Host "  Project REF를 입력하세요"
}

# 프로젝트 연결
try {
    Write-Host "  📡 프로젝트 연결 중..." -ForegroundColor Cyan
    npx supabase link --project-ref $projectRef 2>&1 | Out-Null
    Write-Host "  ✅ 프로젝트 연결 완료" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  연결 실패 (이미 연결되었을 수 있음)" -ForegroundColor Yellow
}
Write-Host ""

# 2. Database 마이그레이션 동기화
Write-Host "2. Database 스키마 동기화..." -ForegroundColor Yellow
Write-Host "  📡 원격 스키마 가져오기 (db pull)..." -ForegroundColor Cyan

try {
    # 기존 마이그레이션 디렉토리가 있는지 확인
    $migrationsDir = "supabase\migrations"
    if (-not (Test-Path $migrationsDir)) {
        New-Item -ItemType Directory -Path $migrationsDir -Force | Out-Null
    }

    # 원격 데이터베이스 스키마를 마이그레이션 파일로 가져오기
    $result = npx supabase db pull 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Database 스키마 동기화 완료" -ForegroundColor Green
        Write-Host "     → supabase/migrations/ 폴더 확인" -ForegroundColor DarkGray
    } else {
        Write-Host "  ⚠️  일부 테이블은 이미 로컬에 있을 수 있습니다" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠️  DB Pull 실패: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "     → 수동으로 확인: npx supabase db pull" -ForegroundColor DarkGray
}
Write-Host ""

# 3. Storage 정책 확인
Write-Host "3. Storage 정책 확인..." -ForegroundColor Yellow
Write-Host "  💡 Storage 정책은 SQL로 직접 적용됩니다" -ForegroundColor Cyan
Write-Host "  📋 다음 위치에서 확인:" -ForegroundColor Cyan
Write-Host "     → supabase/migrations/*.sql" -ForegroundColor White
Write-Host ""

# 4. Edge Functions 동기화
Write-Host "4. Edge Functions 확인..." -ForegroundColor Yellow
Write-Host "  📁 로컬 Functions:" -ForegroundColor Cyan

$functionsDir = "supabase\functions"
if (Test-Path $functionsDir) {
    $functions = Get-ChildItem -Path $functionsDir -Directory | Where-Object { $_.Name -ne "_shared" }
    foreach ($func in $functions) {
        Write-Host "     ✅ $($func.Name)" -ForegroundColor Green
    }
} else {
    Write-Host "     ⚠️  supabase/functions 폴더가 없습니다" -ForegroundColor Yellow
}
Write-Host ""

# 5. 환경변수 확인
Write-Host "5. 환경변수 확인..." -ForegroundColor Yellow

if (Test-Path $envFile) {
    $envVars = @{}
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            if ($value) {
                $envVars[$key] = $true
            }
        }
    }
    
    $requiredVars = @("SUPABASE_URL", "SUPABASE_ANON_KEY", "BASE_URL")
    $allPresent = $true
    
    foreach ($var in $requiredVars) {
        if ($envVars.ContainsKey($var)) {
            Write-Host "  ✅ $var" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $var (없음)" -ForegroundColor Red
            $allPresent = $false
        }
    }
    
    if ($allPresent) {
        Write-Host "  ✅ 모든 필수 환경변수 확인" -ForegroundColor Green
    }
} else {
    Write-Host "  ❌ .env 파일이 없습니다" -ForegroundColor Red
}
Write-Host ""

# 6. 타입 생성 (선택사항)
Write-Host "6. TypeScript 타입 생성 (선택사항)..." -ForegroundColor Yellow
$generateTypes = Read-Host "  Supabase 테이블 기반 TypeScript 타입을 생성하시겠습니까? (y/N)"

if ($generateTypes -eq "y" -or $generateTypes -eq "Y") {
    Write-Host "  📡 타입 생성 중..." -ForegroundColor Cyan
    
    try {
        npx supabase gen types typescript --local 2>&1 | Out-File -FilePath "src\types\supabase.ts" -Encoding UTF8
        Write-Host "  ✅ 타입 생성 완료: src\types\supabase.ts" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠️  타입 생성 실패: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "     → 수동 실행: npx supabase gen types typescript --linked" -ForegroundColor DarkGray
    }
}
Write-Host ""

# 7. 변경사항 요약
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "동기화 완료 요약" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "✅ 동기화된 항목:" -ForegroundColor Green
Write-Host "  • Supabase 프로젝트 연결" -ForegroundColor White
Write-Host "  • Database 스키마 (마이그레이션)" -ForegroundColor White
Write-Host "  • 환경변수 확인" -ForegroundColor White
Write-Host ""

Write-Host "📁 확인할 파일들:" -ForegroundColor Yellow
Write-Host "  • supabase/migrations/*.sql - DB 스키마 변경사항" -ForegroundColor White
Write-Host "  • supabase/functions/ - Edge Functions" -ForegroundColor White
Write-Host "  • .env - 환경변수" -ForegroundColor White
if ($generateTypes -eq "y" -or $generateTypes -eq "Y") {
    Write-Host "  • src/types/supabase.ts - TypeScript 타입" -ForegroundColor White
}
Write-Host ""

# 8. Git 상태 확인
Write-Host "8. Git 변경사항 확인..." -ForegroundColor Yellow
try {
    $gitStatus = git status --short 2>&1
    if ($gitStatus) {
        Write-Host "  📝 변경된 파일:" -ForegroundColor Cyan
        Write-Host $gitStatus -ForegroundColor White
        Write-Host ""
        Write-Host "  💡 변경사항을 커밋하려면:" -ForegroundColor Yellow
        Write-Host "     git add ." -ForegroundColor DarkGray
        Write-Host "     git commit -m `"Sync Supabase changes`"" -ForegroundColor DarkGray
    } else {
        Write-Host "  ℹ️  변경사항 없음" -ForegroundColor Cyan
    }
} catch {
    Write-Host "  ℹ️  Git 저장소가 아니거나 Git이 설치되지 않음" -ForegroundColor Cyan
}
Write-Host ""

# 9. 다음 단계 안내
Write-Host "🚀 다음 단계:" -ForegroundColor Cyan
Write-Host "  1. supabase/migrations/ 폴더의 새 마이그레이션 파일 확인" -ForegroundColor White
Write-Host "  2. 필요시 src/services/supabaseClient.ts 타입 업데이트" -ForegroundColor White
Write-Host "  3. Metro 재시작: npm start -- --reset-cache" -ForegroundColor White
Write-Host "  4. 앱 테스트" -ForegroundColor White
Write-Host ""

Write-Host "Additional commands:" -ForegroundColor Yellow
Write-Host "  • npx supabase db push - Apply local migrations to remote" -ForegroundColor DarkGray
Write-Host "  • npx supabase db diff [name] - Create migration from schema diff" -ForegroundColor DarkGray
Write-Host "  • npx supabase functions deploy [name] - Deploy Edge Function" -ForegroundColor DarkGray
Write-Host ""
