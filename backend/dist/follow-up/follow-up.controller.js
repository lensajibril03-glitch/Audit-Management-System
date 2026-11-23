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
import { BadRequestException, Body, Controller, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Query, UseGuards, } from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
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
let FollowUpController = class FollowUpController {
    prisma;
    auditLog;
    constructor(prisma, auditLog) {
        this.prisma = prisma;
        this.auditLog = auditLog;
    }
    buildVisibilityWhere(user) {
        return hasPermission(user.roles, 'followup.view.all')
            ? {}
            : hasPermission(user.roles, 'department.view') && user.departmentId
                ? { departmentId: user.departmentId }
                : {
                    OR: [{ actionOwnerId: user.userId }, { internalAuditResponsibleId: user.userId }],
                };
    }
    async list(user, status, q, pageRaw, pageSizeRaw) {
        const whereBase = this.buildVisibilityWhere(user);
        const page = Math.max(1, Number(pageRaw ?? '1') || 1);
        const pageSize = Math.min(100, Math.max(1, Number(pageSizeRaw ?? '20') || 20));
        const skip = (page - 1) * pageSize;
        const where = {
            ...whereBase,
            recommendationNumber: q ? { contains: q } : undefined,
            status: status === 'closed' ? { code: 'CLOSED' } : undefined,
            report: { archiveState: 'ACTIVE' },
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
    async detail(user, id) {
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
    async submit(user, body) {
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
    async patch(user, body) {
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
};
__decorate([
    Get(),
    __param(0, CurrentUser()),
    __param(1, Query('status')),
    __param(2, Query('q')),
    __param(3, Query('page')),
    __param(4, Query('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", Promise)
], FollowUpController.prototype, "list", null);
__decorate([
    Get(':id'),
    __param(0, CurrentUser()),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FollowUpController.prototype, "detail", null);
__decorate([
    Post(),
    __param(0, CurrentUser()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FollowUpController.prototype, "submit", null);
__decorate([
    Patch(),
    __param(0, CurrentUser()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FollowUpController.prototype, "patch", null);
FollowUpController = __decorate([
    UseGuards(AuthGuard),
    Controller('follow-up'),
    __metadata("design:paramtypes", [PrismaService,
        AuditLogService])
], FollowUpController);
export { FollowUpController };
//# sourceMappingURL=follow-up.controller.js.map