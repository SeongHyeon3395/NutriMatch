export type MealPlanMode = 'pantry' | 'general';

export type MacroTotals = {
  calories: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
};

export type MealPlanMeal = {
  name: string;
  grams: number;
  macros: MacroTotals;
};

export type MealPlanDay = {
  day: number;
  meals: {
    breakfast: MealPlanMeal;
    lunch: MealPlanMeal;
    dinner: MealPlanMeal;
  };
  totals: MacroTotals;
};

export type MealPlanResult = {
  mode: MealPlanMode;
  days: 1 | 2 | 3;
  plan: MealPlanDay[];
  notes?: string[];
};

export type GenerateMealPlanRequest = {
  mode: MealPlanMode;
  days: 1 | 2 | 3;
  pantryItems?: string[];
  userContext?: Record<string, any> | null;
  /**
   * 음식/메뉴명 중복 방지를 위한 금지 목록(주로 이번 달에 이미 추천된 메뉴명).
   * Edge Function이 이 목록과 동일한 name을 절대 사용하지 않도록 유도합니다.
   */
  avoidFoods?: string[];
  /**
   * 같은 입력이라도 결과가 고정되지 않도록 주는 난수(서버 프롬프트에 포함).
   */
  nonce?: string;
};

export type GenerateMealPlanResponse =
  | { ok: true; data: MealPlanResult }
  | { ok: false; message: string };
