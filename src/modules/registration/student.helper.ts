import { randomBytes } from 'crypto';

export function formatStudentId(
  branchCode: string,
  year: number,
  seq: number,
): string {
  return `${branchCode}-STU-${year}-${String(seq).padStart(5, '0')}`;
}

export function generatePassword(length = 10): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = randomBytes(length);
  let password = '';

  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }

  return password;
}
