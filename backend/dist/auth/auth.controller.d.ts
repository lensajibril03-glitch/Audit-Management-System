import type { Response } from 'express';
import { PrismaService } from '../common/prisma.service.js';
import { AuthService } from './auth.service.js';
export declare class AuthController {
    private readonly prisma;
    private readonly authService;
    constructor(prisma: PrismaService, authService: AuthService);
    login(body: unknown, response: Response): Promise<{
        ok: boolean;
    }>;
    logout(response: Response): {
        ok: boolean;
    };
}
