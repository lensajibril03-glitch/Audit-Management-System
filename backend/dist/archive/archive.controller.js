var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Controller, ForbiddenException, Get, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { PrismaService } from '../common/prisma.service.js';
import { hasPermission } from '../common/permissions.js';
let ArchiveController = class ArchiveController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async detail(user, id) {
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
    async list(user, q, reportTypeId, pageRaw, pageSizeRaw) {
        if (!hasPermission(user.roles, 'archive.view')) {
            throw new ForbiddenException('Forbidden');
        }
        const page = Math.max(1, Number(pageRaw ?? '1') || 1);
        const pageSize = Math.min(100, Math.max(1, Number(pageSizeRaw ?? '20') || 20));
        const skip = (page - 1) * pageSize;
        const where = {
            archiveState: 'ARCHIVED',
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
};
__decorate([
    Get(':id'),
    __param(0, CurrentUser()),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ArchiveController.prototype, "detail", null);
__decorate([
    Get(),
    __param(0, CurrentUser()),
    __param(1, Query('q')),
    __param(2, Query('reportTypeId')),
    __param(3, Query('page')),
    __param(4, Query('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ArchiveController.prototype, "list", null);
ArchiveController = __decorate([
    UseGuards(AuthGuard),
    Controller('archive'),
    __metadata("design:paramtypes", [PrismaService])
], ArchiveController);
export { ArchiveController };
//# sourceMappingURL=archive.controller.js.map