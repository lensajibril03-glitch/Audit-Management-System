import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthGuard } from './auth.guard.js';

@Module({
  controllers: [AuthController],
  providers: [PrismaService, AuthService, AuthGuard],
  exports: [PrismaService, AuthService, AuthGuard],
})
export class AuthModule {}
