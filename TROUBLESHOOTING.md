# NutriMatch 문제 해결 가이드

## 🔴 문제 1: 히스토리에서 이미지가 안 뜨는 문제

### 원인 진단
이미지가 표시되지 않는 이유는 **Supabase Storage 업로드 실패** 때문입니다.

앱이 이미지를 저장할 때:
1. Supabase Storage에 업로드 시도 (`food-images` 버킷)
2. **업로드 실패 시** → 로컬 URI만 DB에 저장
3. 로컬 URI는 나중에 접근할 수 없음 → **이미지 안 뜸**

### 해결 방법

#### 1️⃣ Supabase Storage 버킷 확인 및 생성

Supabase 대시보드에서 확인:

```
1. Supabase Project 대시보드 접속
2. 왼쪽 메뉴 → Storage
3. `food-images` 버킷이 있는지 확인
```

**없다면 생성:**
```
1. Storage → "New bucket" 클릭
2. Name: food-images
3. Public bucket: ✅ 체크 (이미지 접근을 위해 필요)
4. "Create bucket" 클릭
```

**프로필 이미지용 버킷도 생성:**
```
Name: profile-avatars
Public bucket: ✅ 체크
```

#### 2️⃣ Storage 정책(Policy) 설정

버킷을 만든 후 **RLS 정책**을 추가해야 합니다:

```
1. Storage → food-images 버킷 선택
2. "Policies" 탭 클릭
3. "New Policy" 클릭
```

**필요한 정책들:**

**정책 1: 파일 업로드 허용**
```sql
Policy Name: Allow authenticated users to upload
Policy Command: INSERT
Target roles: authenticated

USING expression:
(bucket_id = 'food-images'::text)
```

**정책 2: 파일 읽기 허용 (Public)**
```sql
Policy Name: Allow public read access
Policy Command: SELECT
Target roles: public, authenticated

USING expression:
(bucket_id = 'food-images'::text)
```

**정책 3: 본인 파일 삭제 허용**
```sql
Policy Name: Allow users to delete own files
Policy Command: DELETE
Target roles: authenticated

USING expression:
(bucket_id = 'food-images'::text AND (storage.foldername(name))[1] = auth.uid()::text)
```

**profile-avatars 버킷에도 동일한 정책 적용**

---

## 🔴 문제 2: Gemini API 설정 확인

### Supabase Edge Function에서 Gemini API Key 설정

#### 1️⃣ Supabase CLI로 설정 (권장)

**터미널에서 실행:**

```powershell
# 1. Supabase 프로젝트 디렉토리로 이동
cd d:\NutriMatch\Front

# 2. Supabase 로그인 (한 번만)
npx supabase login

# 3. 프로젝트 연결 (한 번만)
npx supabase link --project-ref YOUR_PROJECT_REF

# 4. Edge Function 환경변수 설정
npx supabase secrets set GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE

# 5. 선택사항: 모델 지정
npx supabase secrets set GEMINI_IMAGE_MODEL=gemini-2.0-flash-exp
npx supabase secrets set GEMINI_TEXT_MODEL=gemini-2.0-flash-exp
```

**프로젝트 REF 찾는 법:**
```
Supabase Dashboard → Settings → General
→ "Reference ID" 항목 확인
```

#### 2️⃣ Supabase 대시보드에서 설정 (대안)

```
1. Supabase Project Dashboard
2. 왼쪽 메뉴 → Edge Functions
3. "analyze-food-image" 함수 클릭
4. "Secrets" 또는 "Environment Variables" 탭
5. "Add Secret" 클릭
6. Name: GEMINI_API_KEY
7. Value: (여기에 Gemini API Key 입력)
8. Save
```

**다른 함수에도 추가:**
- `generate-meal-plan` 함수에도 동일하게 설정

#### 3️⃣ 설정 확인

Supabase 함수 로그 확인:

```
1. Edge Functions → analyze-food-image
2. "Logs" 탭 클릭
3. 앱에서 스캔 시도
4. 로그에서 확인:
   - ✅ "[DEBUG] API Key present: true" → 정상
   - ❌ "[ERROR] GEMINI_API_KEY is not set" → 설정 안 됨
```

---

## 🔴 문제 3: 백엔드 전체 상태 확인

### 1️⃣ Health Check 실행

**PowerShell에서 실행:**

```powershell
# 프로젝트 디렉토리로 이동
cd d:\NutriMatch\Front

# Health check 함수 호출
.\scripts\test-gemini.ps1
```

**또는 직접 API 호출:**

```powershell
# YOUR_SUPABASE_URL을 실제 URL로 변경
$url = "https://YOUR_PROJECT_REF.functions.supabase.co/health"
$headers = @{
    "apikey" = "YOUR_SUPABASE_ANON_KEY"
    "Authorization" = "Bearer YOUR_SUPABASE_ANON_KEY"
}

Invoke-RestMethod -Uri $url -Method GET -Headers $headers
```

**예상 응답:**
```json
{
  "ok": true,
  "message": "NutriMatch API is healthy",
  "timestamp": "2026-02-06T...",
  "env": {
    "hasSupabaseUrl": true,
    "hasSupabaseKey": true,
    "hasGeminiKey": true
  }
}
```

---

## 🔍 추가 진단 방법

### 1️⃣ 앱 로그 확인 (Metro 번들러)

Metro 번들러 실행 중인 터미널에서 로그 확인:

```
[ENV] BASE_URL raw from @env: ...
[ENV] Derived BASE_URL from SUPABASE_URL: ...
[DEBUG] API Key present: ...
```

### 2️⃣ 이미지 업로드 실패 원인 확인

React Native Debugger 또는 콘솔에서:

```javascript
// ResultScreen.tsx 저장 시 에러 메시지 확인
Failed to save food log: [에러 내용]
```

**일반적인 에러:**
- `"Missing or insufficient permissions"` → Storage RLS 정책 없음
- `"Bucket not found"` → 버킷이 없거나 이름 오타
- `"Image URI is empty"` → 앱의 이미지 경로 문제

### 3️⃣ Supabase 로그 확인

```
Supabase Dashboard → Logs → Edge Function Logs
→ 최근 에러 메시지 확인
```

---

## 🚀 즉시 수정할 핵심 체크리스트

### ✅ 완료 여부 확인:

- [ ] Supabase Storage에 `food-images` 버킷 생성 (Public)
- [ ] Supabase Storage에 `profile-avatars` 버킷 생성 (Public)
- [ ] Storage RLS 정책 3개 추가 (INSERT, SELECT, DELETE)
- [ ] Edge Function에 `GEMINI_API_KEY` 환경변수 설정
- [ ] Health API 호출하여 `hasGeminiKey: true` 확인
- [ ] 앱에서 스캔 테스트 후 히스토리에서 이미지 표시 확인

---

## 💡 추가 도움말

### Gemini API Key 발급받기

아직 없다면:
```
1. https://aistudio.google.com/ 접속
2. Google 계정으로 로그인
3. "Get API Key" 클릭
4. 새 API Key 생성
5. 복사 → Supabase에 설정
```

### .env 파일 확인

프론트엔드 .env 파일도 확인:

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_KEY
BASE_URL=https://YOUR_PROJECT_REF.functions.supabase.co
```

**변경 후에는 반드시:**
```powershell
# Metro 재시작
npm start -- --reset-cache
```

---

## 📞 문제가 계속될 경우

1. Supabase Dashboard → Logs에서 에러 메시지 캡처
2. 앱 Metro 번들러 로그 캡처
3. `npx supabase functions deploy --no-verify-jwt analyze-food-image` 재배포
4. 앱 재빌드: `npx react-native run-android` 또는 `npx react-native run-ios`

