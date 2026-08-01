export function generatePassword(length = 10): string {
  return 'password123';
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
