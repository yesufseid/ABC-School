import {
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC } from '../decorators/public.decorator';
import { TokenPayload } from '../auth.types';
import { ClsService } from 'nestjs-cls';
import { REQUEST_TENANT_ID } from '../auth.constants';

@Injectable()
export class AppGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(AppGuard.name);

  constructor(
    private readonly cls: ClsService,
    private readonly reflector?: Reflector,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector?.getAllAndOverride(IS_PUBLIC, [
      context.getClass(),
      context.getHandler(),
    ]);

    if (isPublic) return true;

    return super.canActivate(context);
  }

  handleRequest<T extends TokenPayload>(
    err?: unknown,
    user?: T,
    info?: unknown,
  ) {
    if (err || !user) {
      this.logger.error(
        'App authentication jwt validation failed',
        err || info,
      );

      if (info instanceof Error) {
        switch (info.name) {
          case 'TokenExpiredError':
            throw new UnauthorizedException(`Token has expired`);
          case 'JsonWebTokenError':
            throw new UnauthorizedException(`Invalid Token`);
          case 'NotBeforeError':
            throw new UnauthorizedException(`Token not valid yet`);
          default:
            throw new UnauthorizedException(`Unauthorized`);
        }
      }

      throw new UnauthorizedException('Unauthorized');
    }

    if (user.tenantId) {
      this.cls.set(REQUEST_TENANT_ID, user.tenantId);
    }

    return user;
  }
}
