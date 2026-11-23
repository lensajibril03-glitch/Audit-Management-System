import { Module } from '@nestjs/common';
import { FollowUpController } from './follow-up.controller.js';
import { PrismaService } from '../common/prisma.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { AuditLogService } from '../common/audit-log.service.js';

@Module({
  imports: [AuthModule],
  controllers: [FollowUpController],
  providers: [PrismaService, AuditLogService],
})
export class FollowUpModule {}
