import type { SessionUser } from './auth.types.js';
export declare class AuthService {
    private getSecret;
    signSession(user: SessionUser): Promise<string>;
    verifySession(token: string): Promise<SessionUser | null>;
    buildAuthCookie(token: string): string;
    clearAuthCookie(): string;
}
