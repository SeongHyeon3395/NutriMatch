const RESERVED_TERMS = [
  '운영자',
  '관리자',
  '매니저',
  '운영팀',
  '운영진',
  '관리팀',
  '뉴핏',
  'newfit',
  'admin',
  'administrator',
  'manager',
  'moderator',
  'staff',
  'official',
  'support',
  'master',
] as const;

function normalizeForReservedCheck(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\s._-]+/g, '')
    .trim();
}

function hasReservedTerm(value: string) {
  const normalized = normalizeForReservedCheck(value);
  if (!normalized) return false;
  return RESERVED_TERMS.some((term) => normalized.includes(normalizeForReservedCheck(term)));
}

export function validatePublicNamePolicy(value: string, field: '아이디' | '닉네임') {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return {
      ok: false,
      message: `${field}를 입력해주세요.`,
    } as const;
  }

  if (hasReservedTerm(trimmed)) {
    return {
      ok: false,
      message: `혼란을 줄 수 있는 ${field}(운영자/관리자/매니저/뉴핏 등)은 사용할 수 없어요.`,
    } as const;
  }

  return { ok: true, message: '' } as const;
}
