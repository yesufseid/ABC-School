import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function NoDuplicates(
  property?: string,
  validationOptions?: ValidationOptions,
) {
  return function (target: object, propertyName: string) {
    registerDecorator({
      name: 'noDuplicates',
      target: target.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          if (!Array.isArray(value)) return true;

          const [relatedProperty] = args.constraints as [string | undefined];

          if (relatedProperty) {
            const seen = new Set<unknown>();
            for (const item of value) {
              if (item == null || typeof item !== 'object') continue;
              const val = (item as Record<string, unknown>)[relatedProperty];
              if (seen.has(val)) return false;
              seen.add(val);
            }
            return true;
          }

          const seen = new Set<unknown>(value);
          return seen.size === value.length;
        },
        defaultMessage(args: ValidationArguments): string {
          const [relatedProperty] = args.constraints as [string | undefined];
          if (relatedProperty) {
            return `${args.property} contains duplicate values for "${relatedProperty}"`;
          }
          return `${args.property} contains duplicate values`;
        },
      },
    });
  };
}
