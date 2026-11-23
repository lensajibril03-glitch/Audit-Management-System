var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { BadRequestException, Body, Controller, HttpCode, Post, Res, UnauthorizedException } from '@nestjs/common';
import { z } from 'zod';
import { compare } from 'bcryptjs';
import { PrismaService } from '../common/prisma.service.js';
import { AuthService } from './auth.service.js';
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});
let AuthController = class AuthController {
    prisma;
    authService;
    constructor(prisma, authService) {
        this.prisma = prisma;
        this.authService = authService;
    }
    async login(body, response) {
        const parsed = loginSchema.safeParse(body);
        if (!parsed.success) {
            throw new BadRequestException('Invalid payload');
        }
        const user = await this.prisma.user.findUnique({
            where: { email: parsed.data.email.toLowerCase() },
            include: { userRoles: { include: { role: true } } },
        });
        if (!user || !user.active) {
            throw new UnauthorizedException('Invalid credentials');
        }
        const ok = await compare(parsed.data.password, user.passwordHash);
        if (!ok) {
            throw new UnauthorizedException('Invalid credentials');
        }
        const roles = user.userRoles.map((r) => r.role.name);
        if (!roles.includes('Audit'))
            roles.push('Audit');
        const token = await this.authService.signSession({
            userId: user.id,
            email: user.email,
            name: user.name,
            roles,
            departmentId: user.departmentId,
        });
        response.setHeader('Set-Cookie', this.authService.buildAuthCookie(token));
        return { ok: true };
    }
    logout(response) {
        response.setHeader('Set-Cookie', this.authService.clearAuthCookie());
        return { ok: true };
    }
};
__decorate([
    Post('login'),
    HttpCode(200),
    __param(0, Body()),
    __param(1, Res({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    Post('logout'),
    HttpCode(200),
    __param(0, Res({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "logout", null);
AuthController = __decorate([
    Controller('auth'),
    __metadata("design:paramtypes", [PrismaService,
        AuthService])
], AuthController);
export { AuthController };
//# sourceMappingURL=auth.controller.js.map