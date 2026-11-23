import type { SessionUser } from '../auth/auth.types.js';
import { PrismaService } from '../common/prisma.service.js';
export declare class DashboardController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    summary(user: SessionUser): Promise<{
        total: number;
        closedCount: number;
        overdueCount: number;
        openCount: number;
        byDepartment: {
            departmentId: string;
            departmentName: string;
            count: number;
        }[];
        upcoming: {
            id: string;
            reportName: string;
            recommendationNumber: string;
            statusLabel: string;
            dueDate: Date;
        }[];
    }>;
}
