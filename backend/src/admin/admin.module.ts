import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller.js';
import { PrismaService } from '../common/prisma.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { AuditLogService } from '../common/audit-log.service.js';

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [PrismaService, AuditLogService],
})
export class AdminModule {}
