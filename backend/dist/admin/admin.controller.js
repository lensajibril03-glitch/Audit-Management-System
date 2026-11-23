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
import { BadRequestException, Body, Controller, ForbiddenException, Get, Patch, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { hasPermission } from '../common/permissions.js';
import { PrismaService } from '../common/prisma.service.js';
import { AuditLogService } from '../common/audit-log.service.js';
const patchUserSchema = z.object({
    userId: z.string().min(1),
    active: z.boolean().optional(),
    departmentId: z.string().nullable().optional(),
    roleIds: z.array(z.string()).optional(),
});
let AdminController = class AdminController {
    prisma;
    auditLog;
    constructor(prisma, auditLog) {
        this.prisma = prisma;
        this.auditLog = auditLog;
    }
    async users(user) {
        if (!hasPermission(user.roles, 'admin.users.manage')) {
            throw new ForbiddenException('Forbidden');
        }
        const rows = await this.prisma.user.findMany({
            include: {
                department: true,
                userRoles: { include: { role: true } },
            },
            orderBy: { name: 'asc' },
        });
        return rows.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            active: u.active,
            department: u.department?.label ?? '-',
            roles: u.userRoles.map((r) => r.role.name),
        }));
    }
    async patchUser(user, body) {
        if (!hasPermission(user.roles, 'admin.users.manage')) {
            throw new ForbiddenException('Forbidden');
        }
        const parsed = patchUserSchema.safeParse(body);
        if (!parsed.success) {
            throw new BadRequestException('Invalid payload');
        }
        const existing = await this.prisma.user.findUnique({
            where: { id: parsed.data.userId },
            include: { userRoles: true },
        });
        if (!existing) {
            throw new BadRequestException('User not found');
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: existing.id },
                data: {
                    active: parsed.data.active ?? existing.active,
                    departmentId: parsed.data.departmentId === undefined ? existing.departmentId : parsed.data.departmentId,
                },
            });
            if (parsed.data.roleIds) {
                await tx.userRole.deleteMany({ where: { userId: existing.id } });
                const baseline = await tx.role.findUnique({ where: { name: 'Audit' } });
                const roleIds = new Set(parsed.data.roleIds);
                if (baseline)
                    roleIds.add(baseline.id);
                for (const roleId of roleIds) {
                    await tx.userRole.create({
                        data: {
                            userId: existing.id,
                            roleId,
                        },
                    });
                }
            }
        });
        await this.auditLog.write({
            userId: user.userId,
            entityType: 'User',
            entityId: existing.id,
            action: 'ADMIN_UPDATE_USER',
            previousValues: {
                active: existing.active,
                departmentId: existing.departmentId,
                roleIds: existing.userRoles.map((r) => r.roleId),
            },
            newValues: parsed.data,
        });
        return { ok: true };
    }
    async roles(user) {
        if (!hasPermission(user.roles, 'admin.roles.manage')) {
            throw new ForbiddenException('Forbidden');
        }
        const roles = await this.prisma.role.findMany({
            include: { userRoles: true },
            orderBy: { name: 'asc' },
        });
        return roles.map((role) => ({
            id: role.id,
            name: role.name,
            description: role.description,
            userCount: role.userRoles.length,
        }));
    }
    async referenceData(user) {
        if (!hasPermission(user.roles, 'admin.reference.manage')) {
            throw new ForbiddenException('Forbidden');
        }
        const [reportTypes, legalEntities, sites, departments, statuses] = await Promise.all([
            this.prisma.reportType.findMany({ orderBy: { label: 'asc' } }),
            this.prisma.legalEntity.findMany({ orderBy: { label: 'asc' } }),
            this.prisma.site.findMany({ include: { legalEntity: true }, orderBy: { label: 'asc' } }),
            this.prisma.department.findMany({ orderBy: { label: 'asc' } }),
            this.prisma.recommendationStatus.findMany({ orderBy: { sortOrder: 'asc' } }),
        ]);
        return { reportTypes, legalEntities, sites, departments, statuses };
    }
};
__decorate([
    Get('users'),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "users", null);
__decorate([
    Patch('users'),
    __param(0, CurrentUser()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "patchUser", null);
__decorate([
    Get('roles'),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "roles", null);
__decorate([
    Get('reference-data'),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "referenceData", null);
AdminController = __decorate([
    UseGuards(AuthGuard),
    Controller('admin'),
    __metadata("design:paramtypes", [PrismaService,
        AuditLogService])
], AdminController);
export { AdminController };
//# sourceMappingURL=admin.controller.js.map