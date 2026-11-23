var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable } from '@nestjs/common';
import { SignJWT, jwtVerify } from 'jose';
const cookieName = 'audit_session';
let AuthService = class AuthService {
    getSecret() {
        const value = process.env.AUTH_SECRET;
        if (!value) {
            throw new Error('AUTH_SECRET is missing');
        }
        return new TextEncoder().encode(value);
    }
    async signSession(user) {
        return new SignJWT(user)
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('12h')
            .sign(this.getSecret());
    }
    async verifySession(token) {
        try {
            const verified = await jwtVerify(token, this.getSecret());
            return verified.payload;
        }
        catch {
            return null;
        }
    }
    buildAuthCookie(token) {
        const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
        return `${cookieName}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=43200${secure}`;
    }
    clearAuthCookie() {
        return `${cookieName}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
    }
};
AuthService = __decorate([
    Injectable()
], AuthService);
export { AuthService };
//# sourceMappingURL=auth.service.js.map