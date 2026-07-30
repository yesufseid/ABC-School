import { randomBytes } from 'crypto';

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

export function formatStudentId(
  branchCode: string,
  year: number,
  seq: number,
): string {
  return `${branchCode}-STU-${year}-${String(seq).padStart(5, '0')}`;
}

export function generateStaffId(branchCode: string, year: number, seq: number): string {
  return `${branchCode}-STF-${year}-${String(seq).padStart(4, '0')}`;
}

export function generateTeacherId(branchCode: string, seq: number): string {
  return `${branchCode}-TCH-${String(seq).padStart(4, '0')}`;
}

export function generateParentId(branchCode: string, seq: number): string {
  return `${branchCode}-PRN-${String(seq).padStart(2, '0')}`;
}

export function generatePrincipalId(branchCode: string, seq: number): string {
  return `${branchCode}-PRC-${String(seq).padStart(4, '0')}`;
}
