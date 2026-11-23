import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller.js';
import { PrismaService } from '../common/prisma.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { AuditLogService } from '../common/audit-log.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ReportsController],
  providers: [PrismaService, AuditLogService],
})
export class ReportsModule {}
