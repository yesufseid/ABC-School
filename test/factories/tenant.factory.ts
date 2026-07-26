let counter = 0;

export function buildCreateTenantDto(
  overrides: {
    ownerPhone?: string;
    ownerName?: string;
    password?: string;
    name?: string;
    description?: string;
  } = {},
) {
  counter++;
  return {
    ownerPhone: '+251912345000',
    ownerName: `Owner ${counter}`,
    password: 'tenant123',
    name: `Test School ${counter}`,
    description: `A test school ${counter}`,
    ...overrides,
  };
}

export function buildSubscribeTenantDto(
  overrides: {
    tenantId?: string;
    subscriptionId?: string;
    startDate?: string;
    paidAmount?: number;
  } = {},
) {
  return {
    tenantId: '00000000-0000-0000-0000-000000000000',
    subscriptionId: '00000000-0000-0000-0000-000000000000',
    startDate: new Date().toISOString(),
    paidAmount: 2999.99,
    ...overrides,
  };
}
