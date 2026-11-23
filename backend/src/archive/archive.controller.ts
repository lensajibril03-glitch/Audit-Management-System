import { Controller, ForbiddenException, Get, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { SessionUser } from '../auth/auth.types.js';
import { PrismaService } from '../common/prisma.service.js';
import { hasPermission } from '../common/permissions.js';

@UseGuards(AuthGuard)
@Controller('archive')
export class ArchiveController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':id')
  async detail(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    if (!hasPermission(user.roles, 'archive.view')) {
      throw new ForbiddenException('Forbidden');
    }

    const report = await this.prisma.auditReport.findUnique({
      where: { id },
      include: {
        reportType: true,
        recommendations: {
          include: {
            followUpUpdates: { include: { submitter: true }, orderBy: { submittedAt: 'desc' } },
            justifications: { include: { submitter: true }, orderBy: { submittedAt: 'desc' } },
            status: true,
          },
        },
      },
    });

    if (!report || report.archiveState !== 'ARCHIVED') {
      throw new NotFoundException('Archived report not found');
    }

    return report;
  }

  @Get()
  async list(
    @CurrentUser() user: SessionUser,
    @Query('q') q?: string,
    @Query('reportTypeId') reportTypeId?: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
  ) {
    if (!hasPermission(user.roles, 'archive.view')) {
      throw new ForbiddenException('Forbidden');
    }

    const page = Math.max(1, Number(pageRaw ?? '1') || 1);
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeRaw ?? '20') || 20));
    const skip = (page - 1) * pageSize;

    const where = {
      archiveState: 'ARCHIVED' as const,
      reportName: q ? { contains: q } : undefined,
      reportTypeId: reportTypeId || undefined,
    };

    const [rows, total, reportTypes] = await Promise.all([
      this.prisma.auditReport.findMany({
        where,
        include: {
          reportType: true,
          recommendations: {
            include: {
              actionOwner: true,
              department: true,
              legalEntity: true,
              site: true,
              status: true,
            },
          },
          archiver: true,
        },
        orderBy: { archivedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.auditReport.count({ where }),
      this.prisma.reportType.findMany({ where: { active: true }, orderBy: { label: 'asc' } }),
    ]);

    return {
      items: rows,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      reportTypes: reportTypes.map((type) => ({ id: type.id, label: type.label })),
    };
  }
}
