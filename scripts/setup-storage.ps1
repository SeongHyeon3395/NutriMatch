# Supabase Storage 자동 설정 스크립트
# 버킷 생성 및 RLS 정책 추가

param(
    [Parameter(Mandatory=$false)]
    [string]$ProjectRef,
    
    [Parameter(Mandatory=$false)]
    [string]$ServiceRoleKey
)

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Supabase Storage 자동 설정" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# 1. 환경 변수 로드
Write-Host "1. 환경 변수 로드..." -ForegroundColor Yellow
$envFile = ".env"
$envVars = @{}

if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^([^#][^=]+)=(.*)$") {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            $envVars[$key] = $value
        }
    }
}

$supabaseUrl = $envVars["SUPABASE_URL"]
$anonKey = $envVars["SUPABASE_ANON_KEY"]

if (-not $supabaseUrl) {
    Write-Host "  ❌ SUPABASE_URL이 .env에 없습니다" -ForegroundColor Red
    exit 1
}

if ($supabaseUrl -match "https://([^.]+)\.supabase\.co") {
    $ProjectRef = $matches[1]
    Write-Host "  ✅ Project REF: $ProjectRef" -ForegroundColor Green
} else {
    Write-Host "  ❌ SUPABASE_URL 형식이 잘못되었습니다" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 2. Service Role Key 확인
Write-Host "2. Service Role Key 확인..." -ForegroundColor Yellow
if (-not $ServiceRoleKey) {
    Write-Host "  💡 Service Role Key가 필요합니다" -ForegroundColor Cyan
    Write-Host "     (Dashboard → Settings → API → service_role key)" -ForegroundColor Cyan
    Write-Host ""
    $ServiceRoleKey = Read-Host "  Service Role Key를 입력하세요"
}

if (-not $ServiceRoleKey -or $ServiceRoleKey.Trim() -eq "") {
    Write-Host "  ❌ Service Role Key가 필요합니다" -ForegroundColor Red
    Write-Host "  → Supabase Dashboard → Settings → API → service_role (secret)" -ForegroundColor Yellow
    exit 1
}
Write-Host "  ✅ Service Role Key 제공됨" -ForegroundColor Green
Write-Host ""

# 3. Storage 버킷 생성 함수
function Create-StorageBucket {
    param(
        [string]$BucketName,
        [bool]$IsPublic = $true
    )
    
    $url = "$supabaseUrl/storage/v1/bucket"
    $headers = @{
        "apikey" = $anonKey
        "Authorization" = "Bearer $ServiceRoleKey"
        "Content-Type" = "application/json"
    }
    
    $body = @{
        id = $BucketName
        name = $BucketName
        public = $IsPublic
        file_size_limit = 10485760  # 10MB
        allowed_mime_types = @("image/jpeg", "image/png", "image/jpg", "image/webp")
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri $url -Method POST -Headers $headers -Body $body -ContentType "application/json"
        Write-Host "    ✅ 버킷 '$BucketName' 생성 완료" -ForegroundColor Green
        return $true
    } catch {
        $errorMsg = $_.Exception.Message
        if ($errorMsg -match "already exists|duplicate") {
            Write-Host "    ℹ️  버킷 '$BucketName' 이미 존재함" -ForegroundColor Yellow
            return $true
        } else {
            Write-Host "    ❌ 버킷 생성 실패: $errorMsg" -ForegroundColor Red
            return $false
        }
    }
}

# 4. RLS 정책 생성 함수
function Create-StoragePolicy {
    param(
        [string]$PolicyName,
        [string]$BucketId,
        [string]$Command,  # SELECT, INSERT, DELETE
        [string]$Roles,    # public, authenticated
        [string]$UsingExpression
    )
    
    # Supabase의 storage.objects 테이블에 직접 정책 생성
    $url = "$supabaseUrl/rest/v1/rpc/create_storage_policy"
    $headers = @{
        "apikey" = $anonKey
        "Authorization" = "Bearer $ServiceRoleKey"
        "Content-Type" = "application/json"
        "Prefer" = "return=minimal"
    }
    
    # SQL로 직접 정책 생성 (PostgREST RPC 사용)
    $sqlUrl = "$supabaseUrl/rest/v1/rpc/exec_sql"
    
    $rolesArray = $Roles -split ","
    
    $sql = @"
DO `$`$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = '$PolicyName'
    ) THEN
        CREATE POLICY "$PolicyName"
        ON storage.objects
        FOR $Command
        TO $Roles
        USING ($UsingExpression);
    END IF;
END
`$`$;
"@
    
    try {
        # SQL 직접 실행은 Supabase에서 기본적으로 막혀있을 수 있음
        # 대신 Migration 파일 생성 추천
        Write-Host "    ⚠️  정책 '$PolicyName' - 수동 생성 필요" -ForegroundColor Yellow
        return $false
    } catch {
        Write-Host "    ❌ 정책 생성 실패: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# 5. 버킷 생성
Write-Host "3. Storage 버킷 생성..." -ForegroundColor Yellow
$bucket1 = Create-StorageBucket -BucketName "food-images" -IsPublic $true
$bucket2 = Create-StorageBucket -BucketName "profile-avatars" -IsPublic $true
Write-Host ""

# 6. RLS 정책 안내 (자동 생성이 어려우므로)
Write-Host "4. RLS 정책 설정..." -ForegroundColor Yellow
Write-Host "  ⚠️  RLS 정책은 Supabase SQL Editor에서 실행해야 합니다" -ForegroundColor Yellow
Write-Host ""
Write-Host "  📋 SQL Editor에 붙여넣을 코드:" -ForegroundColor Cyan
Write-Host ""

$sqlScript = @"
-- food-images 버킷 정책
-- 1. 인증된 사용자 업로드 허용
CREATE POLICY "Allow authenticated users to upload food images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'food-images');

-- 2. 공개 읽기 허용
CREATE POLICY "Allow public read access to food images"
ON storage.objects FOR SELECT
TO public, authenticated
USING (bucket_id = 'food-images');

-- 3. 본인 파일 삭제 허용
CREATE POLICY "Allow users to delete own food images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'food-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- profile-avatars 버킷 정책
-- 1. 인증된 사용자 업로드 허용
CREATE POLICY "Allow authenticated users to upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-avatars');

-- 2. 공개 읽기 허용
CREATE POLICY "Allow public read access to avatars"
ON storage.objects FOR SELECT
TO public, authenticated
USING (bucket_id = 'profile-avatars');

-- 3. 본인 파일 삭제 허용
CREATE POLICY "Allow users to delete own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'profile-avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);
"@

Write-Host $sqlScript -ForegroundColor White
Write-Host ""
Write-Host "  📌 실행 방법:" -ForegroundColor Yellow
Write-Host "    1. Supabase Dashboard → SQL Editor" -ForegroundColor White
Write-Host "    2. 'New Query' 클릭" -ForegroundColor White
Write-Host "    3. 위 SQL 코드 전체 복사 & 붙여넣기" -ForegroundColor White
Write-Host "    4. 'Run' 또는 Ctrl+Enter 실행" -ForegroundColor White
Write-Host ""

# 7. SQL 파일로도 저장
$sqlFilePath = "supabase\migrations\$(Get-Date -Format 'yyyyMMddHHmmss')_storage_policies.sql"
$sqlScript | Out-File -FilePath $sqlFilePath -Encoding UTF8
Write-Host "  💾 SQL 파일 저장됨: $sqlFilePath" -ForegroundColor Green
Write-Host ""

# 8. 클립보드에 복사 시도
try {
    $sqlScript | Set-Clipboard
    Write-Host "  📋 SQL 코드가 클립보드에 복사되었습니다!" -ForegroundColor Green
    Write-Host "     → SQL Editor에서 Ctrl+V로 붙여넣으세요" -ForegroundColor Cyan
} catch {
    Write-Host "  ℹ️  클립보드 복사 실패 (수동으로 복사하세요)" -ForegroundColor Yellow
}
Write-Host ""

# 9. 완료
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "설정 진행 중" -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ 완료된 작업:" -ForegroundColor Green
if ($bucket1) { Write-Host "  ✅ food-images 버킷 생성" -ForegroundColor Green }
if ($bucket2) { Write-Host "  ✅ profile-avatars 버킷 생성" -ForegroundColor Green }
Write-Host ""
Write-Host "⚠️  수동 작업 필요:" -ForegroundColor Yellow
Write-Host "  → SQL Editor에서 RLS 정책 실행 (위 코드 참조)" -ForegroundColor White
Write-Host ""
Write-Host "📖 다음 단계:" -ForegroundColor Cyan
Write-Host "  1. Supabase Dashboard → SQL Editor" -ForegroundColor White
Write-Host "  2. 클립보드의 SQL 붙여넣기 (또는 $sqlFilePath 파일 참조)" -ForegroundColor White
Write-Host "  3. SQL 실행" -ForegroundColor White
Write-Host "  4. .\scripts\diagnose-backend.ps1 실행하여 확인" -ForegroundColor White
Write-Host ""
