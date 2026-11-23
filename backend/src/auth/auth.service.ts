import { Injectable } from '@nestjs/common';
import { SignJWT, jwtVerify } from 'jose';
import type { SessionUser } from './auth.types.js';

const cookieName = 'audit_session';

@Injectable()
export class AuthService {
  private getSecret() {
    const value = process.env.AUTH_SECRET;
    if (!value) {
      throw new Error('AUTH_SECRET is missing');
    }
    return new TextEncoder().encode(value);
  }

  async signSession(user: SessionUser) {
    return new SignJWT(user)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('12h')
      .sign(this.getSecret());
  }

  async verifySession(token: string): Promise<SessionUser | null> {
    try {
      const verified = await jwtVerify(token, this.getSecret());
      return verified.payload as unknown as SessionUser;
    } catch {
      return null;
    }
  }

  buildAuthCookie(token: string) {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    return `${cookieName}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=43200${secure}`;
  }

  clearAuthCookie() {
    return `${cookieName}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
  }
}
