import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller.js';
import { PrismaService } from '../common/prisma.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [DashboardController],
  providers: [PrismaService],
})
export class DashboardModule {}
