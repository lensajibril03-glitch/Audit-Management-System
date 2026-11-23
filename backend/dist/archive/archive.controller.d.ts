import type { SessionUser } from '../auth/auth.types.js';
import { PrismaService } from '../common/prisma.service.js';
export declare class ArchiveController {
    private readonly prisma;
    constructor(prisma: PrismaService);
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
            justifications: ({
                submitter: {
                    email: string;
                    name: string;
                    departmentId: string | null;
                    id: string;
                    passwordHash: string;
                    active: boolean;
                    createdAt: Date;
                    updatedAt: Date;
                };
            } & {
                id: string;
                recommendationId: string;
                submittedAt: Date;
                followUpUpdateId: string | null;
                text: string;
                evidenceRefs: string | null;
                submittedBy: string;
                reviewStatus: import("@prisma/client").$Enums.ReviewStatus;
                reviewerId: string | null;
                reviewDate: Date | null;
                reviewComment: string | null;
            })[];
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
            followUpUpdates: ({
                submitter: {
                    email: string;
                    name: string;
                    departmentId: string | null;
                    id: string;
                    passwordHash: string;
                    active: boolean;
                    createdAt: Date;
                    updatedAt: Date;
                };
            } & {
                id: string;
                createdAt: Date;
                recommendationId: string;
                progressComment: string;
                submittedAt: Date;
                submittedBy: string;
                statusSnapshot: string;
            })[];
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
    list(user: SessionUser, q?: string, reportTypeId?: string, pageRaw?: string, pageSizeRaw?: string): Promise<{
        items: ({
            reportType: {
                id: string;
                active: boolean;
                createdAt: Date;
                updatedAt: Date;
                code: string;
                label: string;
            };
            recommendations: ({
                legalEntity: {
                    id: string;
                    active: boolean;
                    createdAt: Date;
                    updatedAt: Date;
                    code: string;
                    label: string;
                };
                site: {
                    id: string;
                    active: boolean;
                    createdAt: Date;
                    updatedAt: Date;
                    legalEntityId: string;
                    code: string;
                    label: string;
                };
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
            archiver: {
                email: string;
                name: string;
                departmentId: string | null;
                id: string;
                passwordHash: string;
                active: boolean;
                createdAt: Date;
                updatedAt: Date;
            } | null;
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
        })[];
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
        reportTypes: {
            id: string;
            label: string;
        }[];
    }>;
}
