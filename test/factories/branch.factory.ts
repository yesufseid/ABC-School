let counter = 0;

export function buildCreateBranchDto(
  overrides: {
    name?: string;
    description?: string;
    branchCode?: string;
    branchPrefix?: string;
    details?: Record<string, string | number | boolean>;
  } = {},
) {
  counter++;
  return {
    name: `Branch ${counter}`,
    description: `Test branch ${counter}`,
    branchCode: `BR-${String(counter).padStart(3, '0')}`,
    branchPrefix: `BR${counter}`,
    details: { phone: '+251911223344' },
    ...overrides,
  };
}
