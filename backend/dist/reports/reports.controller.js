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
import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards, ForbiddenException, BadRequestException, NotFoundException, } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../common/prisma.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
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
let ReportsController = class ReportsController {
    prisma;
    auditLog;
    constructor(prisma, auditLog) {
        this.prisma = prisma;
        this.auditLog = auditLog;
    }
    async list(user, q, reportTypeId, pageRaw, pageSizeRaw) {
        if (!hasPermission(user.roles, 'reports.view')) {
            throw new ForbiddenException('Forbidden');
        }
        const page = Math.max(1, Number(pageRaw ?? '1') || 1);
        const pageSize = Math.min(100, Math.max(1, Number(pageSizeRaw ?? '20') || 20));
        const skip = (page - 1) * pageSize;
        const where = {
            archiveState: 'ACTIVE',
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
    async create(user, body) {
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
    async detail(user, id) {
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
    async update(user, id, body) {
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
                }
                else {
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
    async archiveAction(user, id, body) {
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
};
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
], ReportsController.prototype, "list", null);
__decorate([
    Post(),
    __param(0, CurrentUser()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "create", null);
__decorate([
    Get(':id'),
    __param(0, CurrentUser()),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "detail", null);
__decorate([
    Put(':id'),
    __param(0, CurrentUser()),
    __param(1, Param('id')),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "update", null);
__decorate([
    Patch(':id/archive'),
    __param(0, CurrentUser()),
    __param(1, Param('id')),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "archiveAction", null);
ReportsController = __decorate([
    UseGuards(AuthGuard),
    Controller('reports'),
    __metadata("design:paramtypes", [PrismaService,
        AuditLogService])
], ReportsController);
export { ReportsController };
//# sourceMappingURL=reports.controller.js.map