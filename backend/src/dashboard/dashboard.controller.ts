import { Controller, ForbiddenException, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { SessionUser } from '../auth/auth.types.js';
import { PrismaService } from '../common/prisma.service.js';
import { hasPermission } from '../common/permissions.js';

@UseGuards(AuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('summary')
  async summary(@CurrentUser() user: SessionUser) {
    if (!hasPermission(user.roles, 'dashboard.view')) {
      throw new ForbiddenException('Forbidden');
    }

    const visibility = hasPermission(user.roles, 'followup.view.all')
      ? {}
      : hasPermission(user.roles, 'department.view') && user.departmentId
        ? { departmentId: user.departmentId }
        : {
            OR: [{ actionOwnerId: user.userId }, { internalAuditResponsibleId: user.userId }],
          };

    const [total, closedStatus, byDepartment, upcoming] = await Promise.all([
      this.prisma.recommendation.count({ where: visibility }),
      this.prisma.recommendationStatus.findFirst({ where: { isTerminal: true, active: true } }),
      this.prisma.recommendation.groupBy({
        by: ['departmentId'],
        where: visibility,
        _count: { _all: true },
        orderBy: { _count: { departmentId: 'desc' } },
        take: 6,
      }),
      this.prisma.recommendation.findMany({
        where: {
          ...visibility,
          dueDate: { gte: new Date() },
        },
        include: { report: true, status: true },
        orderBy: { dueDate: 'asc' },
        take: 8,
      }),
    ]);

    const closedWhere = closedStatus ? { ...visibility, statusId: closedStatus.id } : { ...visibility, status: { code: 'CLOSED' } };

    const [closedCount, overdueCount] = await Promise.all([
      this.prisma.recommendation.count({ where: closedWhere }),
      this.prisma.recommendation.count({
        where: {
          ...visibility,
          dueDate: { lt: new Date() },
          NOT: closedStatus ? { statusId: closedStatus.id } : { status: { code: 'CLOSED' } },
        },
      }),
    ]);

    const departmentIds = byDepartment.map((d) => d.departmentId);
    const departments = departmentIds.length
      ? await this.prisma.department.findMany({ where: { id: { in: departmentIds } } })
      : [];
    const depNameMap = new Map(departments.map((d) => [d.id, d.label]));

    return {
      total,
      closedCount,
      overdueCount,
      openCount: total - closedCount,
      byDepartment: byDepartment.map((row) => ({
        departmentId: row.departmentId,
        departmentName: depNameMap.get(row.departmentId) ?? 'Unknown Department',
        count: row._count._all,
      })),
      upcoming: upcoming.map((item) => ({
        id: item.id,
        reportName: item.report.reportName,
        recommendationNumber: item.recommendationNumber,
        statusLabel: item.status.label,
        dueDate: item.dueDate,
      })),
    };
  }
}
