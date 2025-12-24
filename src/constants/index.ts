export const BODY_GOALS = [
  { id: 'diet', label: '다이어트 (감량)', description: '체중 감량, 체지방 감소' },
  { id: 'bulking', label: '벌크업 (증량)', description: '근육량 증가, 고칼로리' },
  { id: 'lean_bulk', label: '린매스업', description: '지방↓ 근육↑' },
  { id: 'maintenance', label: '체중 유지', description: '현재 상태 유지' },
  { id: 'recomp', label: '리컴프', description: '체지방↓ 근육 유지/증가' },
];

export const HEALTH_DIETS = [
  { id: 'low_sodium', label: '저염식', description: '혈압 관리, 신장 건강' },
  { id: 'low_carb', label: '저당식', description: '혈당 조절, 인슐린 관리' },
  { id: 'diabetic', label: '당뇨 식단', description: '혈당 안정 목적' },
  { id: 'low_fat', label: '저지방식', description: '심혈관 질환 예방' },
  { id: 'high_protein', label: '고단백식', description: '근육 회복, 다이어트' },
  { id: 'intermittent_fasting', label: '간헐적 단식', description: '식사 시간 제한' },
  { id: 'anti_inflammatory', label: '항염식', description: '염증 감소 식단' },
  { id: 'none_health', label: '해당 없음', description: '특별한 건강 제약 없음' },
];

export const LIFESTYLE_DIETS = [
  { id: 'vegetarian', label: '채식(Vegetarian)', description: '육류 제외' },
  { id: 'vegan', label: '비건(Vegan)', description: '모든 동물성 배제' },
  { id: 'pescatarian', label: '페스코', description: '생선·해산물만' },
  { id: 'flexitarian', label: '플렉시테리언', description: '기본 채식, 가끔 육류' },
  { id: 'ketogenic', label: '키토제닉', description: '초저탄수화물, 고지방' },
  { id: 'paleo', label: '팔레오', description: '원시 식습관, 가공식품 배제' },
  { id: 'gluten_free', label: '글루텐프리', description: '밀·보리 제거' },
  { id: 'none_lifestyle', label: '해당 없음', description: '특별한 식습관 제약 없음' },
];

export const ALL_ALLERGENS = [
  // 주요 알레르기 유발 식품 (난류, 유제품, 곡물)
  '난류(계란)', '달걀', '메추리알', '우유', '유제품', '치즈', '요거트', '버터', 
  '메밀', '메밀국수', '냉면', '땅콩', '땅콩버터', '대두(콩)', '두부', '된장', 
  '간장', '콩기름', '밀', '빵', '파스타', '과자', '튀김가루',
  
  // 해산물
  '고등어', '게', '꽃게', '대게', '킹크랩', '새우', '중하', '대하', '크릴', 
  '오징어', '마른오징어', '오징어젓', '조개류', '굴', '전복', '홍합', '바지락',
  '생선', '갑각류', '랍스터', '문어', '연어', '참치', '꽁치', '가리비', '멸치',
  
  // 육류
  '돼지고기', '햄', '소시지', '돈까스', '베이컨', '닭고기', '치킨', '쇠고기', 
  '소고기', '육수', '양고기', '오리고기',
  
  // 과일류
  '복숭아', '토마토', '케첩', '사과', '딸기', '키위', '바나나', '망고', 
  '파인애플', '체리', '자두', '감귤', '오렌지', '레몬', '포도', '수박', 
  '멜론', '참외', '배', '감', '석류', '블루베리',
  
  // 견과류
  '호두', '베이킹', '시리얼', '견과류', '아몬드', '잣', '죽류', '캐슈넛', 
  '피스타치오', '마카다미아', '헤이즐넛', '피칸', '브라질너트',
  
  // 곡물류
  '쌀', '보리', '귀리', '호밀', '옥수수', '퀴노아', '수수', '기장',
  
  // 채소류
  '가지', '고추', '파프리카', '당근', '셀러리', '양파', '마늘', '생강',
  '시금치', '상추', '배추', '무', '브로콜리', '콜리플라워', '아스파라거스',
  
  // 콩류
  '강낭콩', '완두콩', '렌틸콩', '병아리콩', '녹두', '팥', '검은콩',
  
  // 첨가물 및 보존제
  '아황산류(SO₂)', '아황산염', '와인', '건과일', 'MSG', '글루탐산나트륨', 
  '타르타르산', '벤조산', '유산균', '효모', '젤라틴',
  
  // 기타
  '참깨', '들깨', '겨자', '코코넛', '초콜릿', '카카오', '카페인', '알코올',
  '꿀', '로열젤리', '프로폴리스', '인공감미료', '아스파탐',
];
