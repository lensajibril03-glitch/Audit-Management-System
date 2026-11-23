import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { SessionUser } from './auth.types.js';

export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext): SessionUser => {
  const request = ctx.switchToHttp().getRequest();
  return request.user as SessionUser;
});
