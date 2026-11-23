import type { SessionUser } from '../auth/auth.types.js';
import { PrismaService } from '../common/prisma.service.js';
import { AuditLogService } from '../common/audit-log.service.js';
export declare class AdminController {
    private readonly prisma;
    private readonly auditLog;
    constructor(prisma: PrismaService, auditLog: AuditLogService);
    users(user: SessionUser): Promise<{
        id: string;
        name: string;
        email: string;
        active: boolean;
        department: string;
        roles: string[];
    }[]>;
    patchUser(user: SessionUser, body: unknown): Promise<{
        ok: boolean;
    }>;
    roles(user: SessionUser): Promise<{
        id: string;
        name: string;
        description: string;
        userCount: number;
    }[]>;
    referenceData(user: SessionUser): Promise<{
        reportTypes: {
            id: string;
            active: boolean;
            createdAt: Date;
            updatedAt: Date;
            code: string;
            label: string;
        }[];
        legalEntities: {
            id: string;
            active: boolean;
            createdAt: Date;
            updatedAt: Date;
            code: string;
            label: string;
        }[];
        sites: ({
            legalEntity: {
                id: string;
                active: boolean;
                createdAt: Date;
                updatedAt: Date;
                code: string;
                label: string;
            };
        } & {
            id: string;
            active: boolean;
            createdAt: Date;
            updatedAt: Date;
            legalEntityId: string;
            code: string;
            label: string;
        })[];
        departments: {
            id: string;
            active: boolean;
            createdAt: Date;
            updatedAt: Date;
            code: string;
            label: string;
        }[];
        statuses: {
            id: string;
            active: boolean;
            createdAt: Date;
            updatedAt: Date;
            code: string;
            label: string;
            isTerminal: boolean;
            sortOrder: number;
        }[];
    }>;
}
