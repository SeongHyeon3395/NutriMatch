import type { FoodAnalysis, FoodGrade, UserProfile } from '../types/user';
import { getFoodScore100 } from './foodScore';
import { computeAllergenHits } from './allergen';

function clamp100(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function scoreToGrade(score100: number): FoodGrade {
  if (score100 >= 85) return 'very_good';
  if (score100 >= 70) return 'good';
  if (score100 >= 55) return 'neutral';
  if (score100 >= 40) return 'bad';
  return 'very_bad';
}

function n(num: any): number {
  const v = typeof num === 'number' ? num : Number(num);
  return Number.isFinite(v) ? v : 0;
}

function approxMealTarget(profile: UserProfile | null) {
  const targetCalories = n(profile?.targetCalories);
  if (targetCalories > 0) return Math.max(250, targetCalories / 3);
  return 550;
}

export function ensureUserAnalysis(
  analysis: FoodAnalysis,
  profile: UserProfile | null,
): NonNullable<FoodAnalysis['userAnalysis']> {
  const existing: any = analysis.userAnalysis;
  const normalizeArr = (v: any): string[] =>
    Array.isArray(v) ? v.filter((x: any) => typeof x === 'string' && x.trim()) : [];
  const pickArr = (a: any, b: string[]) => {
    const aa = normalizeArr(a);
    return aa.length > 0 ? aa : b;
  };

  const macros: any = analysis.macros || {};
  const calories = n(macros.calories);
  const protein = n(macros.protein_g);
  const carbs = n(macros.carbs_g);
  const fat = n(macros.fat_g);
  const sugar = n(macros.sugar_g);
  const fiber = n(macros.fiber_g);
  const satFat = n(macros.saturated_fat_g);
  const sodium = typeof macros.sodium_mg === 'number' ? macros.sodium_mg : Number(macros.sodium_mg);

  const scoreExisting = getFoodScore100(analysis);

  const name = (profile?.nickname || profile?.name || '사용자').trim();

  const pros: string[] = [];
  const cons: string[] = [];
  const goalFit: string[] = [];
  const dietFit: string[] = [];
  const healthImpact: string[] = [];
  const warnings: string[] = [];
  const alternatives: string[] = [];
  const tips: string[] = [];
  const scoreReasons: string[] = [];

  let score = typeof scoreExisting === 'number' ? scoreExisting : calories > 0 ? 68 : 58;
  const mealTarget = approxMealTarget(profile);
  const calorieGap = calories > 0 ? Math.abs(calories - mealTarget) : 0;

  if (protein >= 30) {
    score += 8;
    scoreReasons.push('단백질이 충분해서 포만감과 회복에 유리해요.');
  } else if (protein >= 20) {
    score += 5;
    scoreReasons.push('단백질이 적당해서 한 끼 균형에 도움이 돼요.');
  } else if (protein > 0 && protein < 12) {
    score -= 7;
    scoreReasons.push('단백질이 부족해서 포만감 유지가 아쉬워요.');
  }

  if (fiber >= 6) {
    score += 4;
    scoreReasons.push('식이섬유가 있어 혈당과 포만감 관리에 좋아요.');
  } else if (fiber > 0 && fiber < 3) {
    score -= 2;
  }

  if (calories > 0) {
    if (calorieGap <= mealTarget * 0.18) {
      score += 6;
      scoreReasons.push('한 끼 목표 열량과 크게 벗어나지 않아요.');
    } else if (calorieGap >= mealTarget * 0.55) {
      score -= 6;
      scoreReasons.push('한 끼 기준 열량 편차가 큰 편이에요.');
    }
  }

  if (fat >= 28) {
    score -= 6;
    scoreReasons.push('지방이 높은 편이라 조리 방식 조절이 필요해요.');
  }
  if (satFat >= 8) {
    score -= 5;
    scoreReasons.push('포화지방이 높아 자주 먹기엔 부담이 있어요.');
  }
  if (sugar >= 18) {
    score -= 4;
    scoreReasons.push('당류가 높아 혈당 변동에 불리할 수 있어요.');
  }
  if (Number.isFinite(sodium)) {
    if (sodium >= 1200) {
      score -= 10;
      scoreReasons.push('나트륨이 매우 높아 맞춤 점수를 크게 낮췄어요.');
    } else if (sodium >= 700) {
      score -= 5;
      scoreReasons.push('나트륨이 다소 높아요.');
    }
  }

  // Pros/Cons (generic)
  if (protein >= 20) pros.push('단백질이 충분해서 포만감과 근육 유지에 유리해요.');
  if (protein > 0 && protein < 15) cons.push('단백질이 낮은 편이라 포만감이 빨리 꺼질 수 있어요.');

  if (fat >= 25) cons.push('지방이 높은 편이라 소스/기름/튀김 요소를 줄이면 점수가 올라가요.');
  if (carbs >= 80) cons.push('탄수화물이 많은 편이라 밥/면/빵 양을 조절하면 좋아요.');

  if (Number.isFinite(sodium) && sodium > 800) cons.push('나트륨이 높을 수 있어요. 국물/장류/가공식품 섭취를 주의하세요.');

  // Goal fit
  switch (profile?.bodyGoal) {
    case 'diet':
      if (calories > mealTarget * 1.2) score -= 8;
      if (protein >= 20) score += 5;
      if (fat >= 25) score -= 4;
      goalFit.push(`${name}님이 다이어트 중이라면, 포만감을 위해 단백질/채소 비중을 올리면 좋아요.`);
      if (calories > 700) goalFit.push('칼로리가 높은 편일 수 있어요. 1/2만 먹거나 사이드(샐러드)로 균형을 맞춰보세요.');
      break;
    case 'bulking':
      if (calories >= mealTarget * 0.95) score += 6;
      if (protein >= 30) score += 6;
      if (protein < 25) score -= 5;
      goalFit.push(`${name}님이 벌크업 중이라면, 단백질+탄수 조합이 중요해요. 단백질이 부족하면 보강이 필요해요.`);
      if (protein < 25) goalFit.push('단백질을 더 보강하면 근육 합성에 도움이 돼요(닭/계란/두부/그릭요거트).');
      break;
    case 'lean_bulk':
      if (protein >= 28) score += 7;
      if (fat >= 28) score -= 5;
      if (calories > mealTarget * 1.35) score -= 4;
      goalFit.push(`${name}님이 린벌크 중이라면, 단백질은 높이고 과한 지방은 줄이는 방향이 좋아요.`);
      break;
    case 'recomp':
      if (protein >= 25) score += 7;
      if (calories > mealTarget * 1.25) score -= 5;
      goalFit.push(`${name}님이 체성분 개선 중이라면, 단백질 확보와 과한 열량 억제가 중요해요.`);
      break;
    case 'maintenance':
      if (calorieGap <= mealTarget * 0.22) score += 4;
      goalFit.push(`${name}님이 유지/건강 관리라면, 오늘은 전체 밸런스(단백질·탄수·지방)를 크게 흔들지 않게 조절해보세요.`);
      break;
    default:
      goalFit.push(`${name}님의 목표 기준으로, 단백질과 과한 지방/나트륨만 조절하면 더 좋아요.`);
      break;
  }

  // Diet fit
  switch (profile?.healthDiet) {
    case 'low_carb':
      if (carbs <= 35) score += 7;
      else if (carbs >= 60) score -= 8;
      dietFit.push('저탄수 관점에서는 탄수화물(밥/면/빵/단 음료)을 줄이는 게 좋아요.');
      if (carbs > 50) dietFit.push('현재 탄수 비중이 높을 수 있어요. 밥/면 양을 반으로 줄이고 채소를 늘려보세요.');
      break;
    case 'low_sodium':
      if (Number.isFinite(sodium) && sodium <= 500) score += 7;
      else if (Number.isFinite(sodium) && sodium >= 800) score -= 9;
      dietFit.push('저염식 관점에서는 국물/장류/가공식품을 특히 조심해야 해요.');
      if (Number.isFinite(sodium) && sodium > 800) dietFit.push('나트륨이 높을 수 있어요. 국물은 남기고 소스는 찍어 먹는 방식이 좋아요.');
      break;
    case 'diabetic':
      if (sugar <= 10 && carbs <= 45) score += 8;
      if (sugar >= 18 || carbs >= 60) score -= 9;
      dietFit.push('혈당 관리 관점에서는 당류와 정제 탄수 비중을 특히 봐야 해요.');
      break;
    case 'high_protein':
      if (protein >= 30) score += 9;
      else if (protein < 20) score -= 8;
      dietFit.push('고단백 식단이라면 단백질을 매 끼니 안정적으로 확보하는 게 핵심이에요.');
      if (protein < 25) dietFit.push('단백질 보강이 필요해요(닭가슴살/계란/두부/생선).');
      break;
    case 'low_fat':
      if (fat <= 15) score += 7;
      else if (fat > 20) score -= 8;
      dietFit.push('저지방식이라면 기름/튀김/크림/치즈/삼겹살 같은 요소를 줄이는 게 좋아요.');
      if (fat > 20) dietFit.push('지방이 높은 편이라 구이/찜/에어프라이 조리로 바꾸면 좋아요.');
      break;
    case 'intermittent_fasting':
      if (protein >= 25) score += 4;
      if (calories > 0 && calories < 350) score -= 3;
      dietFit.push('간헐적 단식 중이라면 한 끼의 포만감과 영양 밀도가 더 중요해요.');
      break;
    case 'anti_inflammatory':
      if (fiber >= 6) score += 5;
      if (satFat >= 8) score -= 5;
      dietFit.push('항염 식단은 식이섬유와 가공도, 포화지방을 같이 봐야 해요.');
      break;
    default:
      dietFit.push('현재 식단 기준 정보가 없거나 제한이 적어서, 전체 밸런스를 중심으로 보면 좋아요.');
      break;
  }

  switch (profile?.lifestyleDiet) {
    case 'vegetarian':
      dietFit.push('채식 위주라면 콩·두부·달걀 같은 단백질원이 충분한지 같이 보세요.');
      break;
    case 'vegan':
      dietFit.push('비건 식단이라면 단백질과 철분·비타민 B12 보완을 함께 확인하세요.');
      break;
    case 'ketogenic':
      if (carbs <= 20) score += 8;
      else if (carbs >= 40) score -= 10;
      dietFit.push('키토 식단은 탄수 비중이 낮을수록 맞춤 점수가 올라가요.');
      break;
    case 'gluten_free':
      warnings.push('글루텐 프리는 사진만으로 완전 판별이 어려워 원재료 확인이 필요해요.');
      break;
    default:
      break;
  }

  // Health impact
  healthImpact.push('가공식품/소스류가 많으면 나트륨과 포화지방이 올라갈 수 있어요.');
  if (calories > 0) healthImpact.push(`예상 칼로리는 약 ${Math.round(calories)} kcal로 추정돼요(사진 기반).`);

  // Allergens warnings (profile vs analysis)
  const userAllergens = Array.isArray(profile?.allergens) ? profile!.allergens : [];
  const hits = computeAllergenHits(userAllergens, analysis);
  if (hits.length > 0) {
    score -= Math.min(24, 10 + hits.length * 5);
    scoreReasons.push(`알레르기 주의 식재료(${hits.join(', ')})가 감지되어 점수를 낮췄어요.`);
    warnings.push(`알레르기 주의: ${hits.join(', ')} 가능성이 있어요.`);
  } else {
    warnings.push('알레르기 정보는 사진 기반 추정이라, 민감하면 성분표/원재료를 꼭 확인하세요.');
  }

  const score100 = clamp100(score);
  const grade = scoreToGrade(score100);

  // Alternatives & tips
  alternatives.push('채소/샐러드를 곁들여 식이섬유를 보강해보세요.');
  if (protein < 20) alternatives.push('단백질을 한 가지 추가해보세요(계란/닭/두부/생선).');
  if (fat > 25) alternatives.push('기름진 부위/소스를 줄이고 담백한 조리(구이/찜)로 바꿔보세요.');

  tips.push('다음엔 음식이 더 크게, 밝게 나오게 찍으면 정확도가 올라가요.');
  tips.push('가능하면 영양성분표/제품명이 보이게 촬영해보세요.');

  const reasons: string[] = [];
  reasons.push(`맞춤 점수 ${score100}점 기준으로 평가했어요.`);
  reasons.push(...scoreReasons.slice(0, 3));
  if (protein >= 20) reasons.push('단백질이 충분한 편이에요.');
  if (fat >= 25) reasons.push('지방이 높은 편이에요.');
  if (Number.isFinite(sodium) && sodium > 800) reasons.push('나트륨이 높을 수 있어요.');

  // Ensure non-empty arrays for “무조건 글”
  const ensure1 = (arr: string[], fallback: string) => (arr.length > 0 ? arr : [fallback]);

  const generated = {
    grade,
    score100,
    pros: ensure1(pros, '좋은 점을 더 찾고 있어요. 사진을 선명하게 찍으면 더 정확해져요.'),
    cons: ensure1(cons, '큰 주의점은 없지만, 양/소스를 조절하면 더 좋아요.'),
    goalFit: ensure1(goalFit, `${name}님의 목표 기준으로 한 끼 밸런스를 점검했어요.`),
    dietFit: ensure1(dietFit, '현재 식단 기준으로 조정 포인트를 정리했어요.'),
    healthImpact: ensure1(healthImpact, '건강 관점에서 무난한 편이지만 과한 섭취는 피하세요.'),
    reasons: ensure1(reasons, '사진 기반 추정 결과예요.'),
    warnings: ensure1(warnings, '특이 알레르기 경고는 없지만, 성분표 확인을 권장해요.'),
    alternatives: ensure1(alternatives, '채소/단백질을 조금 더 추가하면 좋아요.'),
    tips: ensure1(tips, '다음엔 더 선명하게 촬영해보세요.'),
  };

  // If backend provided partial analysis, keep what exists but fill missing/empty sections.
  if (existing && typeof existing === 'object') {
    const gradeExisting = typeof existing.grade === 'string' ? existing.grade : undefined;
    const scoreExisting = typeof existing.score100 === 'number' ? existing.score100 : undefined;

    return {
      grade: (gradeExisting as any) || generated.grade,
      score100: Number.isFinite(scoreExisting as any) ? (scoreExisting as any) : generated.score100,
      pros: pickArr(existing.pros, generated.pros),
      cons: pickArr(existing.cons, generated.cons),
      goalFit: pickArr(existing.goalFit, generated.goalFit),
      dietFit: pickArr(existing.dietFit, generated.dietFit),
      healthImpact: pickArr(existing.healthImpact, generated.healthImpact),
      reasons: pickArr(existing.reasons, generated.reasons),
      warnings: pickArr(existing.warnings, generated.warnings),
      alternatives: pickArr(existing.alternatives, generated.alternatives),
      tips: pickArr(existing.tips, generated.tips),
    };
  }

  return generated;
}
