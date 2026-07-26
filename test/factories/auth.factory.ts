export function buildLoginDto(overrides: { phoneNumber?: string; password?: string } = {}) {
  return {
    phoneNumber: '+251912345678',
    password: 'TestPassword123!',
    ...overrides,
  };
}
