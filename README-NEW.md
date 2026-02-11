# NutriMatch - 맞춤형 식단 관리 앱

## 🎯 프로젝트 개요

NutriMatch는 사용자의 건강 목표, 식습관, 알레르기 정보를 기반으로 음식을 분석하고 맞춤형 피드백을 제공하는 AI 기반 식단 관리 앱입니다.

### 핵심 차별화 기능 (The "Wow" Factor)

🚦 **신호등 적합도 시스템**
- 음식 사진 촬영 즉시 5단계 등급 (매우 좋음/좋음/보통/나쁨/매우 나쁨)으로 적합도 표시
- 사용자 프로필(목표, 식습관, 알레르기)과 자동 대조
- 색상 코드로 직관적 피드백 (초록/연두/노랑/주황/빨강)

⚠️ **알레르기 & 기피 식재료 필터**
- 20대 알레르기 체크리스트 + 직접 입력 기능
- 개인 취향 반영 (예: "오이 싫어함", "고수 제외")
- 실시간 경고 표시

🥗 **대체 음식 추천**
- 목표에 맞지 않는 음식에 대한 건강한 대안 제시
- AI 기반 맞춤형 섭취 팁 제공

---

## 📱 앱 구조 (Sitemap)

### 1. 온보딩 (첫 실행 시 1회)
- **Step 1**: 이름 입력
- **Step 2**: 목표 설정 (다이어트/벌크업/유지/저염식)
- **Step 3**: 식습관 (일반/비건/베지테리언/페스코/키토/저탄고지)
- **Step 4**: 알레르기 (20개 체크리스트 + 직접 입력)
- **Step 5**: 기피 식재료 (직접 입력)

### 2. 🏠 홈 (메인 대시보드)
- **오늘의 식단 점수**: 0-100점 원형 그래프
- **초대형 카메라 버튼**: 즉시 촬영 또는 갤러리 선택
- **남은 영양소**: 목표 대비 부족/충분 영양소 표시
- **개인화 인사말**: 시간대별 메시지

### 3. 📅 식단 기록 (Diary)
- 아침/점심/저녁/간식 자동 분류
- 사진 + 적합도 등급 + 타임스탬프
- 일별/주별 통계 (예정)
- AI 코칭 메시지 (예정)

### 4. 👤 마이페이지 (Profile)
- 프로필 정보 확인 (목표, 식습관, 알레르기)
- 프로필 수정 (예정)
- 신체 변화 그래프 (예정)
- 로그아웃

---

## 🛠️ 기술 스택

### Frontend
- **React Native 0.82.1** + TypeScript
- **React Navigation**: 온보딩 → 탭 네비게이션
- **Zustand**: 전역 상태 관리 (프로필, 식단 로그)
- **AsyncStorage**: 로컬 데이터 저장
- **react-native-image-crop-picker**: 카메라/갤러리 + 크롭

### Backend
- **Supabase Edge Functions** (Deno)
- **Google Gemini 1.5 Flash/Pro**: Vision AI for 음식 식별
- **FormData API**: 이미지 업로드

### 주요 라이브러리
```json
{
  "@react-navigation/native": "^6.x",
  "@react-navigation/bottom-tabs": "^6.x",
  "@react-navigation/native-stack": "^6.x",
  "zustand": "^4.x",
  "@react-native-async-storage/async-storage": "^1.x",
  "react-native-image-crop-picker": "latest",
  "react-native-safe-area-context": "^4.x",
  "react-native-screens": "^3.x"
}
```

---

## 📂 프로젝트 구조

```
Front/
├── src/
│   ├── navigation/
│   │   ├── RootNavigator.tsx      # 메인 네비게이션 (Onboarding ↔ Main Tabs)
│   │   └── types.ts                # 네비게이션 타입 정의
│   ├── screens/
│   │   ├── onboarding/
│   │   │   └── OnboardingScreen.tsx  # 5단계 설문조사
│   │   ├── home/
│   │   │   ├── HomeScreen.tsx        # 대시보드 + 카메라 버튼
│   │   │   └── FoodResultScreen.tsx  # 분석 결과 (신호등 시스템)
│   │   ├── diary/
│   │   │   └── DiaryScreen.tsx       # 식단 기록 목록
│   │   └── profile/
│   │       └── ProfileScreen.tsx     # 마이페이지
│   ├── store/
│   │   └── userStore.ts              # Zustand 전역 상태
│   ├── types/
│   │   └── user.ts                   # 타입 정의 (UserProfile, FoodAnalysis 등)
│   ├── services/
│   │   └── api.ts                    # Supabase API 통신
│   └── config.ts                     # 환경 변수 설정
├── supabase/
│   └── functions/
│       └── analyze-food-image/
│           └── index.ts              # v4-userAnalysis (사용자 맞춤 분석)
├── App.tsx                           # 메인 엔트리
└── .env                              # 환경 변수
```

---

## 🚀 실행 방법

### 1. 환경 설정
```bash
# .env 파일 생성
SUPABASE_URL=https://wrgeaabfsbjdgtjcwevv.supabase.co
SUPABASE_ANON_KEY=your_anon_key
GEMINI_API_KEY=your_gemini_key
```

### 2. 패키지 설치
```bash
npm install
```

### 3. Android 빌드 및 실행
```bash
# Gradle 캐시 정리 (첫 실행 시)
cd android
./gradlew clean
cd ..

# 앱 실행
npx react-native run-android
```

### 4. Edge Function 배포
```bash
cd supabase
npx supabase functions deploy analyze-food-image --project-ref wrgeaabfsbjdgtjcwevv

# 환경 변수 설정
npx supabase secrets set GEMINI_API_KEY=your_key --project-ref wrgeaabfsbjdgtjcwevv
npx supabase secrets set GEMINI_MODEL=gemini-1.5-flash --project-ref wrgeaabfsbjdgtjcwevv
```

---

## 📊 데이터 구조

### UserProfile
```typescript
{
  id: string;
  name: string;
  email?: string;
  goal: 'diet' | 'bulk' | 'maintain' | 'low_sodium';
  dietType: 'general' | 'vegan' | 'vegetarian' | 'pescatarian' | 'keto' | 'low_carb';
  allergens: string[];        // ['땅콩', '갑각류', ...]
  disliked: string[];          // ['오이', '고수', ...]
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### FoodAnalysis
```typescript
{
  dishName: string;
  description: string;
  categories: string[];
  confidence: number;
  macros: {
    calories?: number;
    carbs_g?: number;
    protein_g?: number;
    fat_g?: number;
    sodium_mg?: number;
    // ...
  };
  userAnalysis?: {
    grade: 'very_good' | 'good' | 'neutral' | 'bad' | 'very_bad';
    score: number;              // 0-100
    reasons: string[];          // 등급 이유
    warnings: string[];         // 알레르기/기피 경고
    alternatives: string[];     // 대체 음식 추천
    tips: string[];             // 섭취 팁
  };
}
```

---

## 🎨 신호등 시스템 상세

### 점수 계산 로직
- **기본 점수**: 60점 (보통)
- **알레르기 발견**: -40점 (매우 위험)
- **기피 식재료**: -15점
- **비건 위반**: -30점
- **목표 부합**: +15~20점
- **영양소 초과/부족**: ±10~15점

### 등급 기준
| 점수 | 등급 | 색상 | 설명 |
|------|------|------|------|
| 80+ | 매우 좋음 | 초록 (#22C55E) | 목표에 완벽 부합 |
| 65-79 | 좋음 | 연두 (#84CC16) | 권장함 |
| 45-64 | 보통 | 노랑 (#EAB308) | 양 조절 필요 |
| 25-44 | 나쁨 | 주황 (#F97316) | 권장하지 않음 |
| 0-24 | 매우 나쁨 | 빨강 (#EF4444) | 피해야 함 |

---

## 🐛 알려진 이슈 및 해결

### 1. 히스토리에서 이미지가 안 보이는 문제
**원인**: Supabase Storage 설정 또는 업로드 실패
**해결**: 
```powershell
# 진단 스크립트 실행
.\scripts\diagnose-backend.ps1

# 자세한 해결 방법은 TROUBLESHOOTING.md 참조
```

**빠른 체크리스트**:
- [ ] Supabase Storage에 `food-images` 버킷 생성 (Public)
- [ ] Storage RLS 정책 3개 추가 (INSERT, SELECT, DELETE)
- [ ] Edge Function 로그에서 에러 확인

### 2. Gemini API 오류
**원인**: Edge Function에 GEMINI_API_KEY가 설정되지 않음
**해결**:
```powershell
# 자동 설정 스크립트 실행
.\scripts\update-gemini-key.ps1

# 또는 수동 설정:
# Supabase Dashboard → Edge Functions → analyze-food-image
# → Secrets 탭 → GEMINI_API_KEY 추가
```

### 3. `androidx.transition.AutoTransition` 에러
**해결**: `android/app/build.gradle`에 의존성 추가
```gradle
implementation 'androidx.transition:transition:1.4.1'
implementation 'androidx.appcompat:appcompat:1.6.1'
```

### 4. 갤러리 권한 (Android 13+)
**해결**: `READ_MEDIA_IMAGES` + `READ_EXTERNAL_STORAGE` (API 레벨 분기)

### 5. Metro 캐시 문제
**해결**: 
```bash
npx react-native start --reset-cache
```

### 📖 더 자세한 문제 해결
→ **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** 참조

---

## 📝 향후 개발 계획

### Phase 1 (현재 완료)
- ✅ 온보딩 플로우
- ✅ 홈 대시보드
- ✅ 음식 분석 (기본 + 사용자 맞춤)
- ✅ 식단 기록
- ✅ 마이페이지

### Phase 2 (다음 단계)
- [ ] Supabase Auth 통합 (회원가입/로그인)
- [ ] 데이터베이스 연동 (food_logs, body_logs 테이블)
- [ ] 프로필 수정 기능
- [ ] 일별/주별 통계 차트

### Phase 3 (고급 기능)
- [ ] AI 코칭 메시지 (GPT 연동)
- [ ] 식단 추천 기능
- [ ] 체중/골격근량 기록 및 그래프
- [ ] 푸시 알림 (식사 시간 리마인더)
- [ ] 소셜 공유 기능

### Phase 4 (프리미엄)
- [ ] 정밀 영양소 분석
- [ ] 개인 맞춤 식단표 생성
- [ ] 영양사 상담 연결
- [ ] 구독 모델 도입

---

## 🤝 기여 방법

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 라이선스

MIT License

---

## 👨‍💻 개발자

**SeongHyeon3395**
- GitHub: [@SeongHyeon3395](https://github.com/SeongHyeon3395)

---

## 🙏 감사의 말

- **Google Gemini**: Vision AI 제공
- **Supabase**: 백엔드 인프라
- **React Native 커뮤니티**: 오픈소스 라이브러리

---

**Built with ❤️ for healthier eating habits**
