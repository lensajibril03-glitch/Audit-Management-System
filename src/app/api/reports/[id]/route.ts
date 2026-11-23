import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";

const recommendationUpdateInput = z.object({
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
  notificationEnabled: z.boolean().default(false),
  notificationIntervalDays: z.number().int().positive().nullable().optional(),
  statusId: z.string().min(1),
});

const reportUpdateSchema = z.object({
  reportName: z.string().trim().min(1),
  reportTypeId: z.string().min(1),
  publicationDate: z.string(),
  recommendations: z.array(recommendationUpdateInput).min(1),
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!hasPermission(session.roles, "reports.edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = reportUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const existingReport = await prisma.auditReport.findUnique({
    where: { id },
    include: { recommendations: true },
  });
  if (!existingReport) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const duplicateNumbers = new Set<string>();
  for (const rec of parsed.data.recommendations) {
    if (duplicateNumbers.has(rec.recommendationNumber)) {
      return NextResponse.json({ error: `Duplicate recommendation number in request: ${rec.recommendationNumber}` }, { status: 400 });
    }
    duplicateNumbers.add(rec.recommendationNumber);
  }

  const existingRecIds = new Set(existingReport.recommendations.map((r) => r.id));
  const incomingExistingIds = parsed.data.recommendations
    .map((r) => r.id)
    .filter((v): v is string => Boolean(v));
  for (const incomingId of incomingExistingIds) {
    if (!existingRecIds.has(incomingId)) {
      return NextResponse.json({ error: "One or more recommendations do not belong to this report." }, { status: 400 });
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.auditReport.update({
      where: { id: existingReport.id },
      data: {
        reportName: parsed.data.reportName,
        reportTypeId: parsed.data.reportTypeId,
        publicationDate: new Date(parsed.data.publicationDate),
        updatedBy: session.userId,
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
            updatedBy: session.userId,
          },
        });
      } else {
        await tx.recommendation.create({
          data: {
            reportId: existingReport.id,
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
            createdBy: session.userId,
            updatedBy: session.userId,
          },
        });
      }
    }
  });

  await writeAuditLog({
    userId: session.userId,
    entityType: "AuditReport",
    entityId: existingReport.id,
    action: "UPDATE",
    previousValues: {
      reportName: existingReport.reportName,
      reportTypeId: existingReport.reportTypeId,
      publicationDate: existingReport.publicationDate,
      recommendationCount: existingReport.recommendations.length,
    },
    newValues: {
      reportName: parsed.data.reportName,
      reportTypeId: parsed.data.reportTypeId,
      publicationDate: parsed.data.publicationDate,
      recommendationCount: parsed.data.recommendations.length,
    },
  });

  return NextResponse.json({ ok: true });
}
