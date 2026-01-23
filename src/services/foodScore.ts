import type { FoodAnalysis, FoodGrade } from '../types/user';

function clampScore100(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function foodGradeToScore100(grade: FoodGrade): number {
  switch (grade) {
    case 'very_good':
      return 90;
    case 'good':
      return 75;
    case 'neutral':
      return 60;
    case 'bad':
      return 40;
    case 'very_bad':
      return 20;
    default:
      return 60;
  }
}

export function getFoodScore100(analysis?: FoodAnalysis | null): number | null {
  const ua: any = analysis?.userAnalysis;
  if (!ua) return null;

  const raw = ua?.score100;
  const numeric = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  if (Number.isFinite(numeric)) return clampScore100(numeric);

  const grade = ua?.grade as FoodGrade | undefined;
  if (typeof grade === 'string') return foodGradeToScore100(grade);
  return null;
}

export function score100ToBadgeVariant(score: number | null | undefined) {
  if (typeof score !== 'number' || !Number.isFinite(score)) return 'default' as const;
  if (score >= 80) return 'success' as const;
  if (score >= 60) return 'warning' as const;
  return 'danger' as const;
}
