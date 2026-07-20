import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TokenPayload } from '../auth.types';

export const User = createParamDecorator(
  (prop: keyof TokenPayload | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<{ user: TokenPayload }>();
    return prop ? request.user[prop] : request.user;
  },
);
