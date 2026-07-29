import { Sex, Position, Department } from '../../prisma/src/generated/prisma/enums';

let counter = 0;

export function buildCreateStaffDto(
  overrides: {
    phoneNumber?: string;
    branchId?: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    email?: string;
    address?: string;
    sex?: Sex;
    startingDate?: string;
    position?: Position;
    department?: Department;
  } = {},
) {
  counter++;
  return {
    phoneNumber: `+251911${String(counter).padStart(6, '0')}`,
    branchId: '00000000-0000-0000-0000-000000000000',
    firstName: 'Abebe',
    middleName: 'Kebede',
    lastName: 'Lemma',
    email: `staff${counter}@school.com`,
    address: 'Bole Subcity, Addis Ababa',
    sex: Sex.Male,
    startingDate: '2025-09-01',
    position: Position.Teacher,
    department: Department.Academic,
    ...overrides,
  };
}