import type { FoodAnalysis } from '../types/user';

function norm(s: string) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()\[\]{}.,/\\|:;"'`~!@#$%^&*+=<>?·]/g, '')
    .trim();
}

const SYN: Record<string, string[]> = {
  // Dairy
  dairy: ['우유', '유제품', '치즈', '요거트', '요구르트', '버터', '크림', '밀크', '라떼', 'milk', 'cheese', 'yogurt', 'butter', 'cream'],
  // Egg
  egg: ['난류', '계란', '달걀', '메추리알', 'egg'],
  // Soy
  soy: ['대두', '콩', '두부', '된장', '간장', '콩기름', 'soy', 'soya', 'tofu'],
  // Wheat/Gluten
  wheat: ['밀', '글루텐', '빵', '파스타', '면', '밀가루', 'wheat', 'gluten', 'bread', 'pasta', 'noodle', 'flour'],
  // Peanut / nuts
  peanut: ['땅콩', '피넛', 'peanut'],
  tree_nut: ['견과', '호두', '아몬드', '캐슈', '캐슈넛', '피스타치오', '마카다미아', '헤이즐넛', '피칸', '잣', 'nut', 'almond', 'walnut', 'cashew'],
  // Seafood
  shrimp: ['새우', '중하', '대하', '크릴', 'shrimp', 'prawn'],
  crab: ['게', '꽃게', '대게', '킹크랩', 'crab'],
  shellfish: ['조개', '조개류', '굴', '전복', '홍합', '바지락', '가리비', 'clam', 'oyster', 'mussel', 'scallop', 'shellfish'],
  fish: ['생선', '연어', '참치', '고등어', '멸치', 'fish', 'salmon', 'tuna', 'mackerel'],
  // Seeds
  sesame: ['참깨', '들깨', 'sesame'],
};

function groupKeysForUserAllergen(userAllergen: string): (keyof typeof SYN)[] {
  const n = norm(userAllergen);
  if (!n) return [];

  const keys: (keyof typeof SYN)[] = [];

  // direct heuristics
  if (/(우유|유제품|치즈|요거트|요구르트|버터|크림|밀크|라떼|milk|cheese|yogurt)/i.test(userAllergen)) keys.push('dairy');
  if (/(난류|계란|달걀|메추리알|egg)/i.test(userAllergen)) keys.push('egg');
  if (/(대두|콩|두부|된장|간장|soy|tofu)/i.test(userAllergen)) keys.push('soy');
  if (/(밀|글루텐|wheat|gluten)/i.test(userAllergen)) keys.push('wheat');
  if (/(땅콩|피넛|peanut)/i.test(userAllergen)) keys.push('peanut');
  if (/(견과|호두|아몬드|캐슈|피스타치오|마카다미아|헤이즐넛|피칸|잣|nut|almond|walnut|cashew)/i.test(userAllergen)) keys.push('tree_nut');
  if (/(새우|shrimp|prawn|갑각류)/i.test(userAllergen)) keys.push('shrimp');
  if (/(게|꽃게|대게|킹크랩|crab)/i.test(userAllergen)) keys.push('crab');
  if (/(조개|굴|전복|홍합|바지락|가리비|shellfish|clam|oyster|mussel|scallop)/i.test(userAllergen)) keys.push('shellfish');
  if (/(생선|연어|참치|고등어|fish|salmon|tuna|mackerel)/i.test(userAllergen)) keys.push('fish');
  if (/(참깨|들깨|sesame)/i.test(userAllergen)) keys.push('sesame');

  return Array.from(new Set(keys));
}

function buildNeedles(userAllergen: string): string[] {
  const base = [norm(userAllergen)].filter(Boolean);
  const keys = groupKeysForUserAllergen(userAllergen);
  for (const k of keys) {
    for (const v of SYN[k]) base.push(norm(v));
  }
  // de-dupe + keep only meaningful length
  return Array.from(new Set(base)).filter(x => x.length >= 2);
}

export function buildAllergenSourceTokens(analysis: FoodAnalysis): string[] {
  const detections: any[] = Array.isArray((analysis as any).detections) ? (analysis as any).detections : [];
  const labels = detections.map(d => (typeof d?.label === 'string' ? d.label : '')).filter(Boolean);

  const tokens = [
    analysis?.dishName,
    ...(Array.isArray(analysis?.ingredients) ? analysis.ingredients : []),
    ...(Array.isArray((analysis as any)?.allergens) ? ((analysis as any).allergens as any[]) : []),
    ...labels,
  ];

  return tokens.map(t => String(t || '').trim()).filter(Boolean);
}

export function computeAllergenHits(userAllergens: string[], analysis: FoodAnalysis): string[] {
  const ua = Array.isArray(userAllergens) ? userAllergens.filter(Boolean) : [];
  if (ua.length === 0) return [];

  const tokens = buildAllergenSourceTokens(analysis);
  const tokenNorm = tokens.map(norm).filter(Boolean);

  return ua.filter(a => {
    const needles = buildNeedles(a);
    if (needles.length === 0) return false;

    // match if any needle is contained in any token, or vice versa (for cases like "난류(계란)")
    return tokenNorm.some(t => needles.some(n => t.includes(n) || n.includes(t)));
  });
}
