export type StrengthLevel = 0 | 1 | 2 | 3 | 4;

/** Lightweight, dependency-free strength estimate (length + character variety). The server enforces the real policy. */
export function passwordStrength(pw: string): { level: StrengthLevel; label: string } {
  if (!pw) return { level: 0, label: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length < 8) return { level: 1, label: 'Too short' };
  const level = Math.max(1, Math.min(4, score)) as StrengthLevel;
  return { level, label: ['', 'Weak', 'Fair', 'Good', 'Strong'][level] };
}
