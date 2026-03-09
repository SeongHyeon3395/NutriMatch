export type AppPlanId = 'free' | 'plus' | 'pro' | 'premium' | 'master';

export type PlanLimits = {
  chatTokensMonthly: number;
  monthlyScanLimit: number;
  monthlyMealPlanLimit: number;
};

export const PLAN_LIMITS: Record<'free' | 'plus' | 'pro' | 'master', PlanLimits> = {
  free: {
    chatTokensMonthly: 40000,
    monthlyScanLimit: 5,
    monthlyMealPlanLimit: 5,
  },
  plus: {
    chatTokensMonthly: 300000,
    monthlyScanLimit: 30,
    monthlyMealPlanLimit: 30,
  },
  pro: {
    chatTokensMonthly: 1000000,
    monthlyScanLimit: 80,
    monthlyMealPlanLimit: 80,
  },
  master: {
    chatTokensMonthly: 99999999,
    monthlyScanLimit: 9999,
    monthlyMealPlanLimit: 9999,
  },
};

export function normalizePlanId(planId?: string | null): 'free' | 'plus' | 'pro' | 'master' {
  const p = String(planId || 'free').toLowerCase();
  if (p === 'plus' || p === 'premium') return 'plus';
  if (p === 'pro') return 'pro';
  if (p === 'master') return 'master';
  return 'free';
}

export function getPlanLimits(planId?: string | null): PlanLimits {
  return PLAN_LIMITS[normalizePlanId(planId)];
}

export function getPlanLabel(planId?: string | null) {
  const p = normalizePlanId(planId);
  if (p === 'plus') return 'Plus';
  if (p === 'pro') return 'Pro';
  if (p === 'master') return 'Master';
  return 'Free';
}

export function getCurrentMonthKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
