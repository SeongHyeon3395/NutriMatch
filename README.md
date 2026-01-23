# NewFit (뉴핏) / NutriMatch Front

사진 한 장으로 음식 정보를 분석하고, 사용자 목표/식습관/알레르기 정보를 반영해 **맞춤형 피드백과 기록(히스토리)**까지 이어지는 React Native 앱입니다.

앱 표시 이름은 **NewFit**(한국어: **뉴핏**)이고, 저장소/코드 내부 식별자는 **NutriMatch**를 사용하고 있습니다.

---

## 무엇을 하는 앱인가요?

- 음식 사진을 촬영/선택하면 AI 분석을 수행합니다.
- 분석 결과를 사용자 프로필(목표, 식습관, 알레르기 등)과 함께 해석해 등급(A~F)과 안내 문구를 제공합니다.
- 분석 결과를 **기록에 남기기**로 저장하면, **기록(History)** 및 **식단(최근 식사)**에서 다시 확인할 수 있습니다.

---

## 핵심 기능

- 음식 사진 분석(촬영/갤러리) → 결과 화면
- 사용자 맞춤 분석(알레르기/식습관/목표 기반)
- 기록 저장 및 조회(원격 Supabase + 로컬 캐시)
- 월간 스캔 제한(기본 5회/월)
- 프로필/설정/온보딩 플로우

---

## 기술 스택

- React Native 0.82.1 + TypeScript
- React Navigation
- Zustand + AsyncStorage(로컬 캐시)
- Supabase(Auth, Postgres, Storage, Edge Functions)

---

## 빠른 시작(로컬 개발)

### 1) 의존성 설치

`npm install`

### 2) 환경 변수 설정

이 프로젝트는 `@env`(react-native-dotenv)를 사용합니다. 루트에 `.env`를 만들고 아래 값을 채워주세요.

```bash
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

# 선택: Edge Functions 베이스 URL을 명시적으로 지정
# 지정하지 않으면 SUPABASE_URL에서 자동으로 유도합니다.
BASE_URL=https://YOUR_PROJECT.functions.supabase.co

# 선택: 설정 화면에서 사용하는 개인정보처리방침 링크
PRIVACY_POLICY_URL=https://example.com/privacy
```

참고:
- 개발 중 `BASE_URL`을 못 읽는 환경을 대비해, `.env`가 없을 때는 `.env.runtime.json`을 fallback으로 읽도록 되어 있습니다(선택 사항).
- `.env`를 바꾼 뒤에는 Metro 재시작이 필요할 수 있습니다.

### 3) 실행

- Android: `npm run android`
- iOS: `npm run ios`
- Metro: `npm run start`

---

## Supabase(서버/DB)

### Edge Functions

서버 로직은 Supabase Edge Functions로 구성되어 있고, 주요 함수는 아래 폴더에 있습니다.

- [supabase/functions/analyze-food-image/index.ts](supabase/functions/analyze-food-image/index.ts)
- [supabase/functions/signup-device/index.ts](supabase/functions/signup-device/index.ts)
- [supabase/functions/delete-account/index.ts](supabase/functions/delete-account/index.ts)

배포 예시:

```bash
npx supabase functions deploy analyze-food-image
npx supabase functions deploy signup-device
```

Secrets(예: AI API Key)을 쓰는 경우:

```bash
npx supabase secrets set GEMINI_API_KEY="YOUR_KEY"
```

### DB 마이그레이션

DB 스키마 변경은 아래 폴더에서 관리합니다.

- [supabase/migrations](supabase/migrations)

---

## 테스트/품질

- 테스트: `npm test`
- 린트: `npm run lint`

---

## 프로젝트 구조

```text
src/
    components/        # 공통 UI 컴포넌트
    navigation/        # 네비게이션 구성
    screens/           # 화면 단위
    services/          # Supabase/서버 통신, 데이터 로직
    store/             # Zustand 스토어(프로필/기록 캐시)
    types/             # 타입 정의
supabase/
    functions/         # Edge Functions
    migrations/        # DB migrations
```

---

## 라이선스

사내/개인 프로젝트 용도로 작성되었습니다. 라이선스가 필요하면 저장소 정책에 맞게 추가해주세요.
