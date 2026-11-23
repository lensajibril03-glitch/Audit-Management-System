import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import type { SessionUser } from './auth.types.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: SessionUser;
  }
}

function parseCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  const cookies = header.split(';').map((c) => c.trim());
  const found = cookies.find((c) => c.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = parseCookie(request.headers.cookie as string | undefined, 'audit_session');
    if (!token) {
      throw new UnauthorizedException('Missing session');
    }

    const user = await this.authService.verifySession(token);
    if (!user) {
      throw new UnauthorizedException('Invalid session');
    }

    request.user = user;
    return true;
  }
}
