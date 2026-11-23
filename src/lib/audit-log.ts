import { prisma } from "@/lib/prisma";

type LogInput = {
  userId: string;
  entityType: string;
  entityId: string;
  action: string;
  previousValues?: unknown;
  newValues?: unknown;
  additionalDetails?: string;
};

export async function writeAuditLog(input: LogInput) {
  await prisma.auditLog.create({
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
