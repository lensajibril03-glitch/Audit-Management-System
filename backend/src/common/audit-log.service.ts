import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async write(input: {
    userId: string;
    entityType: string;
    entityId: string;
    action: string;
    previousValues?: unknown;
    newValues?: unknown;
    additionalDetails?: string;
  }) {
    await this.prisma.auditLog.create({
      data: {
        userId: input.userId,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        previousValues: input.previousValues ? JSON.stringify(input.previousValues) : null,
        newValues: input.newValues ? JSON.stringify(input.newValues) : null,
        additionalDetails: input.additionalDetails ?? null,
      },
    });
  }
}
