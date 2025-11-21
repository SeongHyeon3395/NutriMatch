# 🥗 NutriMatch: AI-Powered Nutrition Scanner

**NutriMatch**는 단순한 칼로리 카운터가 아닙니다. 이 앱은 복잡한 알레르기, 특정 식단(비건, 키토 등), 또는 건강 목표를 가진 사용자가 마트에서 불안감 없이 확신을 가지고 식료품을 구매할 수 있도록 돕는 **'초개인화 AI 영양 조수'**입니다.

---

## 🎯 The Problem: "이거 내가 먹어도 되나?"

수백만 명의 사람들이 복잡한 식이 요법을 따르지만, 식료품 성분표는 깨알 같고, 전문 용어로 가득 차 있으며, 읽기 어렵습니다.

* **불안감:** 알레르기 환자에게 실수(예: '밀'을 '쌀'로 잘못 읽음)는 생명과 직결될 수 있습니다.
* **높은 비용:** `Fig`와 같은 기존 앱은 연 $40 이상의 높은 구독료를 요구합니다.
* **이중 노동:** 마트에서 스캔하는 앱(`Fig`)과 집에서 기록하는 앱(`MyFitnessPal`)을 따로 써야 합니다.

**NutriMatch는 이 모든 문제를 '신뢰'와 '합리적인 비용', 그리고 '통합된 경험'으로 해결합니다.**

---

## ✨ 현재 프로토타입 핵심 기능

> 바코드/OCR 다단계 스캔 초기 설계는 제거되고, **음식 사진 단일 인식 흐름**으로 간소화되었습니다. 빠른 가설 검증과 사용자 피드백 수집을 위한 최소기능제품(MVP) 단계입니다.

### 1. 🍽️ 음식 사진 인식 (Gemini 1.5 Flash)
단일 사진을 촬영 또는 갤러리에서 선택하면 Edge Function이 이미지를 받아 **Gemini Vision**으로 추론하여 다음 JSON을 반환합니다:

```json
{
    "dish": {
        "name": "Bibimbap",
        "categories": ["Korean", "Rice", "Mixed"],
        "confidence": 0.92,
        "description": "A mixed rice bowl with assorted vegetables and gochujang."
    }
}
```

앱은 신뢰도(<=1 값은 % 변환)와 카테고리를 가공해 사용자에게 즉시 보여줍니다.

### 2. 🔄 초경량 UX 흐름
1. 사용자: 촬영 또는 선택
2. 앱: 로컬에서 FormData 구성 후 Supabase Edge Function 호출
3. 서버: Gemini 호출 → JSON 정규화 → `{ ok: true, data }` 반환
4. 앱: 미리보기 + 결과 렌더 (스켈레톤 로딩 포함)

### 3. 🧪 빠른 가설 검증을 위한 의도적 생략
아래 기능은 향후 단계에서 재도입 예정입니다:
* 실시간 바코드 스캐너 / Open Food Facts 연동
* OCR Fallback / 사용자 검증 편집 화면
* 식이/알레르기 개인화 프로필 + 맞춤 분석
* 고급 모델(Gemini Pro) 기반 레스토랑/복합요리 다중 추론

현재는 **"사진만 올리면 이름과 간단 설명"** 을 즉시 얻는 경험에 집중합니다.

---

## 💻 기술 스택 (The Stack)

| 영역 | 기술 | 사유 (Why?) |
| :--- | :--- | :--- |
| **Frontend** | **React Native** (Expo) | Android/iOS 크로스플랫폼 개발, 빠른 프로토타이핑 |
| **Backend** | **Supabase** (BaaS) | 1인 개발자에게 완벽한 '올인원 키트' (Auth, DB, Storage, Functions) |
| **Database** | **PostgreSQL** | 튼튼하고 정형화된 데이터 관리를 위한 SQL |
| **Backend Logic**| **Supabase Edge Functions** | VS Code에서 TypeScript로 '서버리스' 백엔드(AI 제어 로직) 개발 |
| **AI (Vision)** | **Gemini 1.5 Flash** | 단일 음식 사진 인식 (저비용, 빠른 응답) |
| **Payments** | **Google Play Billing** | 자동 환전(KRW) 및 15% 수수료(1인 개발자 혜택) |


* **[◻️] Phase 4: 테스트 및 배포**
    * [ ] Google
