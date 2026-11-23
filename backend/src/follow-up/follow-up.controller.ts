import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { SessionUser } from '../auth/auth.types.js';
import { PrismaService } from '../common/prisma.service.js';
import { hasPermission } from '../common/permissions.js';
import { AuditLogService } from '../common/audit-log.service.js';

const submitSchema = z.object({
  recommendationId: z.string().min(1),
  progressComment: z.string().trim().min(2),
  justification: z.string().trim().min(2).optional(),
});

const patchSchema = z.object({
  action: z.enum(['close', 'reopen']),
  recommendationId: z.string().min(1),
  closureComment: z.string().trim().min(2).optional(),
  reopenReason: z.string().trim().min(2).optional(),
});

@UseGuards(AuthGuard)
@Controller('follow-up')
export class FollowUpController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  private buildVisibilityWhere(user: SessionUser) {
    return hasPermission(user.roles, 'followup.view.all')
      ? {}
      : hasPermission(user.roles, 'department.view') && user.departmentId
        ? { departmentId: user.departmentId }
        : {
            OR: [{ actionOwnerId: user.userId }, { internalAuditResponsibleId: user.userId }],
          };
  }

  @Get()
  async list(
    @CurrentUser() user: SessionUser,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
  ) {
    const whereBase = this.buildVisibilityWhere(user);
    const page = Math.max(1, Number(pageRaw ?? '1') || 1);
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeRaw ?? '20') || 20));
    const skip = (page - 1) * pageSize;

    const where = {
      ...whereBase,
      recommendationNumber: q ? { contains: q } : undefined,
      status: status === 'closed' ? { code: 'CLOSED' } : undefined,
      report: { archiveState: 'ACTIVE' as const },
    };

    const [rows, total] = await Promise.all([
      this.prisma.recommendation.findMany({
        where,
        include: {
          report: { include: { reportType: true } },
          status: true,
          department: true,
          legalEntity: true,
          site: true,
          actionOwner: true,
          internalAuditResponsible: true,
        },
        orderBy: { dueDate: 'asc' },
        skip,
        take: pageSize,
      }),
      this.prisma.recommendation.count({ where }),
    ]);

    return {
      items: rows,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  @Get(':id')
  async detail(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    const whereBase = this.buildVisibilityWhere(user);

    const recommendation = await this.prisma.recommendation.findFirst({
      where: {
        id,
        ...whereBase,
        report: { archiveState: 'ACTIVE' },
      },
      include: {
        report: { include: { reportType: true } },
        status: true,
        actionOwner: true,
        internalAuditResponsible: true,
        legalEntity: true,
        site: true,
        department: true,
        followUpUpdates: {
          include: { submitter: true },
          orderBy: { submittedAt: 'desc' },
        },
        justifications: {
          include: { submitter: true, reviewer: true },
          orderBy: { submittedAt: 'desc' },
        },
      },
    });

    if (!recommendation) {
      throw new NotFoundException('Recommendation not found');
    }

    return recommendation;
  }

  @Post()
  async submit(@CurrentUser() user: SessionUser, @Body() body: unknown) {
    if (!hasPermission(user.roles, 'followup.submit')) {
      throw new ForbiddenException('Forbidden');
    }

    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Invalid payload');
    }

    const recommendation = await this.prisma.recommendation.findUnique({ where: { id: parsed.data.recommendationId } });
    if (!recommendation) {
      throw new BadRequestException('Recommendation not found');
    }

    const owns = recommendation.actionOwnerId === user.userId || recommendation.internalAuditResponsibleId === user.userId;
    if (!owns && !hasPermission(user.roles, 'followup.view.all')) {
      throw new ForbiddenException('Forbidden');
    }

    const status = await this.prisma.recommendationStatus.findUnique({ where: { id: recommendation.statusId } });

    await this.prisma.$transaction(async (tx) => {
      const followUp = await tx.followUpUpdate.create({
        data: {
          recommendationId: recommendation.id,
          progressComment: parsed.data.progressComment,
          statusSnapshot: status?.label ?? 'Unknown',
          submittedBy: user.userId,
        },
      });

      if (parsed.data.justification) {
        await tx.justification.create({
          data: {
            recommendationId: recommendation.id,
            followUpUpdateId: followUp.id,
            text: parsed.data.justification,
            submittedBy: user.userId,
          },
        });
      }
    });

    await this.auditLog.write({
      userId: user.userId,
      entityType: 'Recommendation',
      entityId: recommendation.id,
      action: 'FOLLOW_UP_SUBMITTED',
      additionalDetails: 'Progress update submitted',
    });

    return { ok: true };
  }

  @Patch()
  async patch(@CurrentUser() user: SessionUser, @Body() body: unknown) {
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Invalid payload');
    }

    const recommendation = await this.prisma.recommendation.findUnique({
      where: { id: parsed.data.recommendationId },
      include: { justifications: true, status: true },
    });
    if (!recommendation) {
      throw new BadRequestException('Recommendation not found');
    }

    if (parsed.data.action === 'close') {
      if (!hasPermission(user.roles, 'recommendations.close')) {
        throw new ForbiddenException('Forbidden');
      }
      if (recommendation.justifications.length < 1) {
        throw new BadRequestException('Cannot close recommendation without at least one justification.');
      }

      const closedStatus = await this.prisma.recommendationStatus.findUnique({ where: { code: 'CLOSED' } });
      if (!closedStatus) {
        throw new BadRequestException('Closed status is not configured');
      }

      await this.prisma.recommendation.update({
        where: { id: recommendation.id },
        data: {
          statusId: closedStatus.id,
          closedAt: new Date(),
          closedBy: user.userId,
          updatedBy: user.userId,
        },
      });

      await this.auditLog.write({
        userId: user.userId,
        entityType: 'Recommendation',
        entityId: recommendation.id,
        action: 'CLOSE',
        previousValues: { status: recommendation.status.label },
        newValues: { status: closedStatus.label },
        additionalDetails: parsed.data.closureComment,
      });

      return { ok: true };
    }

    if (!hasPermission(user.roles, 'recommendations.reopen')) {
      throw new ForbiddenException('Forbidden');
    }
    if (!parsed.data.reopenReason) {
      throw new BadRequestException('Reopen reason is required');
    }

    const openStatus = await this.prisma.recommendationStatus.findUnique({ where: { code: 'OPEN' } });
    if (!openStatus) {
      throw new BadRequestException('Open status is not configured');
    }

    await this.prisma.recommendation.update({
      where: { id: recommendation.id },
      data: {
        statusId: openStatus.id,
        updatedBy: user.userId,
      },
    });

    await this.auditLog.write({
      userId: user.userId,
      entityType: 'Recommendation',
      entityId: recommendation.id,
      action: 'REOPEN',
      previousValues: { status: recommendation.status.label },
      newValues: { status: openStatus.label },
      additionalDetails: parsed.data.reopenReason,
    });

    return { ok: true };
  }
}
