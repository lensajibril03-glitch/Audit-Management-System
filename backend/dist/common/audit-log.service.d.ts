import { PrismaService } from './prisma.service.js';
export declare class AuditLogService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    write(input: {
        userId: string;
        entityType: string;
        entityId: string;
        action: string;
        previousValues?: unknown;
        newValues?: unknown;
        additionalDetails?: string;
    }): Promise<void>;
}
