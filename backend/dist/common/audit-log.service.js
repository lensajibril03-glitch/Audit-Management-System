var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
let AuditLogService = class AuditLogService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async write(input) {
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
};
AuditLogService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], AuditLogService);
export { AuditLogService };
//# sourceMappingURL=audit-log.service.js.map