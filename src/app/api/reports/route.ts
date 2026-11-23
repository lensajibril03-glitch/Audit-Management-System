import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { parseDate, parsePagination } from "@/lib/query";
import { buildExportBuffer, exportHeaders } from "@/lib/export";

const recommendationInput = z.object({
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

const reportCreateSchema = z.object({
  reportName: z.string().trim().min(1),
  reportTypeId: z.string().min(1),
  publicationDate: z.string(),
  recommendations: z.array(recommendationInput).min(1),
});

export async function GET(request: Request) {
  const session = await requireSession();
  if (!hasPermission(session.roles, "reports.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const reportTypeId = searchParams.get("reportTypeId") || undefined;
  const publicationDateFrom = parseDate(searchParams.get("publicationDateFrom"));
  const publicationDateTo = parseDate(searchParams.get("publicationDateTo"));
  const exportFormat = searchParams.get("export") as "csv" | "xlsx" | null;
  const { page, pageSize, skip, take } = parsePagination(searchParams);

  const where = {
    archiveState: "ACTIVE" as const,
    reportName: q ? { contains: q } : undefined,
    reportTypeId,
    publicationDate:
      publicationDateFrom || publicationDateTo
        ? {
            gte: publicationDateFrom,
            lte: publicationDateTo,
          }
        : undefined,
  };

  const reports = await prisma.auditReport.findMany({
    where,
    include: {
      reportType: true,
      creator: true,
      recommendations: true,
    },
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });

  const total = await prisma.auditReport.count({ where });

  const mapped = reports.map((report) => ({
    id: report.id,
    reportName: report.reportName,
    reportType: report.reportType.label,
    publicationDate: report.publicationDate,
    createdBy: report.creator.name,
    createdDate: report.createdAt,
    recommendationCount: report.recommendations.length,
  }));

  if (exportFormat && hasPermission(session.roles, "reports.export")) {
    const exportRows = mapped.map((r) => ({
      "Report Name": r.reportName,
      "Report Type": r.reportType,
      "Publication Date": new Date(r.publicationDate).toISOString(),
      "Recommendations": r.recommendationCount,
      "Created By": r.createdBy,
      "Created Date": new Date(r.createdDate).toISOString(),
      "Export Date": new Date().toISOString(),
    }));
    const buffer = buildExportBuffer(exportRows, exportFormat);
    return new NextResponse(buffer, {
      status: 200,
      headers: exportHeaders("reports", exportFormat),
    });
  }

  return NextResponse.json({
    items: mapped,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!hasPermission(session.roles, "reports.create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = reportCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const duplicateNumbers = new Set<string>();
  for (const rec of parsed.data.recommendations) {
    if (duplicateNumbers.has(rec.recommendationNumber)) {
      return NextResponse.json({ error: `Duplicate recommendation number in request: ${rec.recommendationNumber}` }, { status: 400 });
    }
    duplicateNumbers.add(rec.recommendationNumber);
  }

  const created = await prisma.$transaction(async (tx) => {
    const report = await tx.auditReport.create({
      data: {
        reportName: parsed.data.reportName,
        reportTypeId: parsed.data.reportTypeId,
        publicationDate: new Date(parsed.data.publicationDate),
        createdBy: session.userId,
        updatedBy: session.userId,
      },
    });

    for (const rec of parsed.data.recommendations) {
      await tx.recommendation.create({
        data: {
          reportId: report.id,
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

    await writeAuditLog({
      userId: session.userId,
      entityType: "AuditReport",
      entityId: report.id,
      action: "CREATE",
      newValues: parsed.data,
    });

    return report;
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
