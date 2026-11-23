import { BadRequestException, Body, Controller, HttpCode, Post, Res, UnauthorizedException } from '@nestjs/common';
import { z } from 'zod';
import { compare } from 'bcryptjs';
import type { Response } from 'express';
import { PrismaService } from '../common/prisma.service.js';
import { AuthService } from './auth.service.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

@Controller('auth')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: unknown, @Res({ passthrough: true }) response: Response) {
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
    if (!roles.includes('Audit')) roles.push('Audit');

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

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) response: Response) {
    response.setHeader('Set-Cookie', this.authService.clearAuthCookie());
    return { ok: true };
  }
}
