import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../common/prisma.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { SessionUser } from '../auth/auth.types.js';
import { hasPermission } from '../common/permissions.js';
import { AuditLogService } from '../common/audit-log.service.js';

const recommendationSchema = z.object({
  id: z.string().optional(),
  recommendationNumber: z.string().trim().min(1),
  description: z.string().trim().min(1),
  expectedDeliverable: z.string().trim().min(1),
  actionOwnerId: z.string().nullable().optional(),
  internalAuditResponsibleId: z.string().nullable().optional(),
  legalEntityId: z.string().min(1),
  siteId: z.string().min(1),
  departmentId: z.string().min(1),
  dueDate: z.string(),
  notificationEnabled: z.boolean(),
  notificationIntervalDays: z.number().int().positive().nullable().optional(),
  statusId: z.string().min(1),
});

const payloadSchema = z.object({
  reportName: z.string().trim().min(1),
  reportTypeId: z.string().min(1),
  publicationDate: z.string(),
  recommendations: z.array(recommendationSchema).min(1),
});

const archiveSchema = z.object({
  action: z.enum(['archive', 'reopen']),
  reason: z.string().trim().min(2).optional(),
});

@UseGuards(AuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: SessionUser,
    @Query('q') q?: string,
    @Query('reportTypeId') reportTypeId?: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
  ) {
    if (!hasPermission(user.roles, 'reports.view')) {
      throw new ForbiddenException('Forbidden');
    }

    const page = Math.max(1, Number(pageRaw ?? '1') || 1);
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeRaw ?? '20') || 20));
    const skip = (page - 1) * pageSize;

    const where = {
      archiveState: 'ACTIVE' as const,
      reportName: q ? { contains: q } : undefined,
      reportTypeId: reportTypeId || undefined,
    };

    const [reports, total, reportTypes] = await Promise.all([
      this.prisma.auditReport.findMany({
        where,
        include: {
          reportType: true,
          creator: true,
          recommendations: true,
        },
        orderBy: { publicationDate: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.auditReport.count({ where }),
      this.prisma.reportType.findMany({
        where: { active: true },
        orderBy: { label: 'asc' },
      }),
    ]);

    return {
      items: reports.map((report) => ({
        id: report.id,
        reportName: report.reportName,
        reportType: report.reportType.label,
        publicationDate: report.publicationDate,
        createdBy: report.creator.name,
        createdDate: report.createdAt,
        recommendationCount: report.recommendations.length,
      })),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      reportTypes: reportTypes.map((type) => ({
        id: type.id,
        label: type.label,
      })),
    };
  }

  @Post()
  async create(@CurrentUser() user: SessionUser, @Body() body: unknown) {
    if (!hasPermission(user.roles, 'reports.create')) {
      throw new ForbiddenException('Forbidden');
    }

    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Invalid payload');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const report = await tx.auditReport.create({
        data: {
          reportName: parsed.data.reportName,
          reportTypeId: parsed.data.reportTypeId,
          publicationDate: new Date(parsed.data.publicationDate),
          createdBy: user.userId,
          updatedBy: user.userId,
        },
      });

      for (const rec of parsed.data.recommendations) {
        await tx.recommendation.create({
          data: {
            reportId: report.id,
            recommendationNumber: rec.recommendationNumber,
            description: rec.description,
            expectedDeliverable: rec.expectedDeliverable,
            actionOwnerId: rec.actionOwnerId ?? null,
            internalAuditResponsibleId: rec.internalAuditResponsibleId ?? null,
            legalEntityId: rec.legalEntityId,
            siteId: rec.siteId,
            departmentId: rec.departmentId,
            dueDate: new Date(rec.dueDate),
            notificationEnabled: rec.notificationEnabled,
            notificationIntervalDays: rec.notificationEnabled ? rec.notificationIntervalDays ?? 7 : null,
            statusId: rec.statusId,
            createdBy: user.userId,
            updatedBy: user.userId,
          },
        });
      }

      return report;
    });

    await this.auditLog.write({
      userId: user.userId,
      entityType: 'AuditReport',
      entityId: created.id,
      action: 'CREATE',
      newValues: parsed.data,
    });

    return { id: created.id };
  }

  @Get(':id')
  async detail(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    if (!hasPermission(user.roles, 'reports.view')) {
      throw new ForbiddenException('Forbidden');
    }

    const report = await this.prisma.auditReport.findUnique({
      where: { id },
      include: {
        reportType: true,
        recommendations: {
          include: {
            status: true,
            actionOwner: true,
            department: true,
          },
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    if (!report || report.archiveState !== 'ACTIVE') {
      throw new NotFoundException('Report not found');
    }

    return report;
  }

  @Put(':id')
  async update(@CurrentUser() user: SessionUser, @Param('id') id: string, @Body() body: unknown) {
    if (!hasPermission(user.roles, 'reports.edit')) {
      throw new ForbiddenException('Forbidden');
    }

    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Invalid payload');
    }

    const existing = await this.prisma.auditReport.findUnique({
      where: { id },
      include: { recommendations: true },
    });
    if (!existing) {
      throw new BadRequestException('Report not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.auditReport.update({
        where: { id: existing.id },
        data: {
          reportName: parsed.data.reportName,
          reportTypeId: parsed.data.reportTypeId,
          publicationDate: new Date(parsed.data.publicationDate),
          updatedBy: user.userId,
        },
      });

      for (const rec of parsed.data.recommendations) {
        if (rec.id) {
          await tx.recommendation.update({
            where: { id: rec.id },
            data: {
              recommendationNumber: rec.recommendationNumber,
              description: rec.description,
              expectedDeliverable: rec.expectedDeliverable,
              actionOwnerId: rec.actionOwnerId ?? null,
              internalAuditResponsibleId: rec.internalAuditResponsibleId ?? null,
              legalEntityId: rec.legalEntityId,
              siteId: rec.siteId,
              departmentId: rec.departmentId,
              dueDate: new Date(rec.dueDate),
              notificationEnabled: rec.notificationEnabled,
              notificationIntervalDays: rec.notificationEnabled ? rec.notificationIntervalDays ?? 7 : null,
              statusId: rec.statusId,
              updatedBy: user.userId,
            },
          });
        } else {
          await tx.recommendation.create({
            data: {
              reportId: existing.id,
              recommendationNumber: rec.recommendationNumber,
              description: rec.description,
              expectedDeliverable: rec.expectedDeliverable,
              actionOwnerId: rec.actionOwnerId ?? null,
              internalAuditResponsibleId: rec.internalAuditResponsibleId ?? null,
              legalEntityId: rec.legalEntityId,
              siteId: rec.siteId,
              departmentId: rec.departmentId,
              dueDate: new Date(rec.dueDate),
              notificationEnabled: rec.notificationEnabled,
              notificationIntervalDays: rec.notificationEnabled ? rec.notificationIntervalDays ?? 7 : null,
              statusId: rec.statusId,
              createdBy: user.userId,
              updatedBy: user.userId,
            },
          });
        }
      }
    });

    await this.auditLog.write({
      userId: user.userId,
      entityType: 'AuditReport',
      entityId: existing.id,
      action: 'UPDATE',
      newValues: parsed.data,
    });

    return { ok: true };
  }

  @Patch(':id/archive')
  async archiveAction(@CurrentUser() user: SessionUser, @Param('id') id: string, @Body() body: unknown) {
    const parsed = archiveSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Invalid payload');
    }

    const existing = await this.prisma.auditReport.findUnique({ where: { id } });
    if (!existing) {
      throw new BadRequestException('Report not found');
    }

    if (parsed.data.action === 'archive') {
      if (!hasPermission(user.roles, 'archive.manage')) {
        throw new ForbiddenException('Forbidden');
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.auditReport.update({
          where: { id: existing.id },
          data: {
            archiveState: 'ARCHIVED',
            archivedAt: new Date(),
            archivedBy: user.userId,
            updatedBy: user.userId,
          },
        });

        await tx.recommendation.updateMany({
          where: { reportId: existing.id },
          data: {
            archivedAt: new Date(),
            archivedBy: user.userId,
            updatedBy: user.userId,
          },
        });
      });

      await this.auditLog.write({
        userId: user.userId,
        entityType: 'AuditReport',
        entityId: existing.id,
        action: 'ARCHIVE',
        previousValues: { archiveState: existing.archiveState },
        newValues: { archiveState: 'ARCHIVED' },
      });

      return { ok: true };
    }

    if (!hasPermission(user.roles, 'recommendations.reopen')) {
      throw new ForbiddenException('Forbidden');
    }
    if (!parsed.data.reason) {
      throw new BadRequestException('Reopen reason is required');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.auditReport.update({
        where: { id: existing.id },
        data: {
          archiveState: 'ACTIVE',
          archivedAt: null,
          archivedBy: null,
          updatedBy: user.userId,
        },
      });

      await tx.recommendation.updateMany({
        where: { reportId: existing.id },
        data: {
          archivedAt: null,
          archivedBy: null,
          updatedBy: user.userId,
        },
      });
    });

    await this.auditLog.write({
      userId: user.userId,
      entityType: 'AuditReport',
      entityId: existing.id,
      action: 'REOPEN',
      previousValues: { archiveState: existing.archiveState },
      newValues: { archiveState: 'ACTIVE' },
      additionalDetails: parsed.data.reason,
    });

    return { ok: true };
  }
}
