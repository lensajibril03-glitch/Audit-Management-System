import { CanActivate, ExecutionContext } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import type { SessionUser } from './auth.types.js';
declare module 'express-serve-static-core' {
    interface Request {
        user?: SessionUser;
    }
}
export declare class AuthGuard implements CanActivate {
    private readonly authService;
    constructor(authService: AuthService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
