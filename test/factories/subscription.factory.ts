let counter = 0;

export function buildCreateSubscriptionDto(
  overrides: {
    name?: string;
    months?: number;
    price?: number;
    active?: boolean;
    features?: Record<string, string | number | boolean>;
  } = {},
) {
  counter++;
  return {
    name: `Plan ${counter}`,
    months: 6,
    price: 5000,
    active: true,
    features: {
      smsLimit: 5000,
      apiAccess: true,
    },
    ...overrides,
  };
}
