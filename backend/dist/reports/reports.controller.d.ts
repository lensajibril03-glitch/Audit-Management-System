import { PrismaService } from '../common/prisma.service.js';
import type { SessionUser } from '../auth/auth.types.js';
import { AuditLogService } from '../common/audit-log.service.js';
export declare class ReportsController {
    private readonly prisma;
    private readonly auditLog;
    constructor(prisma: PrismaService, auditLog: AuditLogService);
    list(user: SessionUser, q?: string, reportTypeId?: string, pageRaw?: string, pageSizeRaw?: string): Promise<{
        items: {
            id: string;
            reportName: string;
            reportType: string;
            publicationDate: Date;
            createdBy: string;
            createdDate: Date;
            recommendationCount: number;
        }[];
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
        reportTypes: {
            id: string;
            label: string;
        }[];
    }>;
    create(user: SessionUser, body: unknown): Promise<{
        id: string;
    }>;
    detail(user: SessionUser, id: string): Promise<{
        reportType: {
            id: string;
            active: boolean;
            createdAt: Date;
            updatedAt: Date;
            code: string;
            label: string;
        };
        recommendations: ({
            department: {
                id: string;
                active: boolean;
                createdAt: Date;
                updatedAt: Date;
                code: string;
                label: string;
            };
            actionOwner: {
                email: string;
                name: string;
                departmentId: string | null;
                id: string;
                passwordHash: string;
                active: boolean;
                createdAt: Date;
                updatedAt: Date;
            } | null;
            status: {
                id: string;
                active: boolean;
                createdAt: Date;
                updatedAt: Date;
                code: string;
                label: string;
                isTerminal: boolean;
                sortOrder: number;
            };
        } & {
            departmentId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string;
            recommendationNumber: string;
            expectedDeliverable: string;
            actionOwnerId: string | null;
            internalAuditResponsibleId: string | null;
            legalEntityId: string;
            siteId: string;
            dueDate: Date;
            notificationEnabled: boolean;
            notificationIntervalDays: number | null;
            statusId: string;
            createdBy: string;
            updatedBy: string;
            archivedAt: Date | null;
            archivedBy: string | null;
            reportId: string;
            closedAt: Date | null;
            closedBy: string | null;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        reportName: string;
        reportTypeId: string;
        publicationDate: Date;
        createdBy: string;
        updatedBy: string;
        archiveState: import("@prisma/client").$Enums.ArchiveState;
        archivedAt: Date | null;
        archivedBy: string | null;
    }>;
    update(user: SessionUser, id: string, body: unknown): Promise<{
        ok: boolean;
    }>;
    archiveAction(user: SessionUser, id: string, body: unknown): Promise<{
        ok: boolean;
    }>;
}
