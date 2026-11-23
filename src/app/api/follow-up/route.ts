import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { recommendationVisibilityWhere } from "@/lib/access-scope";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { parseDate, parsePagination } from "@/lib/query";
import { buildExportBuffer, exportHeaders } from "@/lib/export";
import { canCloseRecommendation, canReopenRecord } from "@/lib/business-rules";

const submitSchema = z.object({
  recommendationId: z.string().min(1),
  progressComment: z.string().trim().min(2),
  justification: z.string().trim().min(2).optional(),
});

const closeSchema = z.object({
  action: z.enum(["close", "reopen"]).default("close"),
  recommendationId: z.string().min(1),
  closureComment: z.string().trim().min(2).optional(),
  reopenReason: z.string().trim().min(2).optional(),
});

export async function GET(request: Request) {
  const session = await requireSession();
  const whereBase = recommendationVisibilityWhere(session);
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const overdue = searchParams.get("overdue") === "1";
  const reportId = searchParams.get("reportId") || undefined;
  const recommendationNumber = searchParams.get("recommendationNumber") || undefined;
  const actionOwnerId = searchParams.get("actionOwnerId") || undefined;
  const departmentId = searchParams.get("departmentId") || undefined;
  const legalEntityId = searchParams.get("legalEntityId") || undefined;
  const siteId = searchParams.get("siteId") || undefined;
  const dueDateFrom = parseDate(searchParams.get("dueDateFrom"));
  const dueDateTo = parseDate(searchParams.get("dueDateTo"));
  const exportFormat = searchParams.get("export") as "csv" | "xlsx" | null;
  const { page, pageSize, skip, take } = parsePagination(searchParams);

  const reportFilter: Prisma.AuditReportWhereInput = {
    archiveState: "ACTIVE",
    ...(reportId ? { id: reportId } : {}),
  };

  const where: Prisma.RecommendationWhereInput = {
    ...whereBase,
    report: reportFilter,
    recommendationNumber: recommendationNumber ? { contains: recommendationNumber } : undefined,
    actionOwnerId,
    departmentId,
    legalEntityId,
    siteId,
    status: status
      ? {
          code: status.toLowerCase() === "closed" ? "CLOSED" : undefined,
        }
      : undefined,
    dueDate: overdue
      ? { lt: new Date() }
      : dueDateFrom || dueDateTo
        ? {
            gte: dueDateFrom,
            lte: dueDateTo,
          }
        : undefined,
  };

  const rows = await prisma.recommendation.findMany({
    where,
    include: {
      report: { include: { reportType: true } },
      status: true,
      department: true,
      legalEntity: true,
      site: true,
      actionOwner: true,
      internalAuditResponsible: true,
    },
    orderBy: { dueDate: "asc" },
    skip,
    take,
  });

  const total = await prisma.recommendation.count({ where });

  if (exportFormat && hasPermission(session.roles, "followup.export")) {
    const exportRows = rows.map((row) => ({
      "Report Name": row.report.reportName,
      "Report Type": row.report.reportType.label,
      "Recommendation Number": row.recommendationNumber,
      Description: row.description,
      "Expected Deliverable": row.expectedDeliverable,
      "Action Owner": row.actionOwner?.name ?? "",
      "Internal Audit Responsible": row.internalAuditResponsible?.name ?? "",
      "Legal Entity": row.legalEntity.label,
      Site: row.site.label,
      Department: row.department.label,
      "Due Date": row.dueDate.toISOString(),
      Status: row.status.label,
      "Notification Enabled": row.notificationEnabled ? "Yes" : "No",
      "Export Date": new Date().toISOString(),
    }));

    const buffer = buildExportBuffer(exportRows, exportFormat);
    return new NextResponse(buffer, {
      status: 200,
      headers: exportHeaders("follow-up", exportFormat),
    });
  }

  return NextResponse.json({
    items: rows,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!hasPermission(session.roles, "followup.submit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const recommendation = await prisma.recommendation.findUnique({ where: { id: parsed.data.recommendationId } });
  if (!recommendation) {
    return NextResponse.json({ error: "Recommendation not found" }, { status: 404 });
  }

  const owns = recommendation.actionOwnerId === session.userId || recommendation.internalAuditResponsibleId === session.userId;
  if (!owns && !hasPermission(session.roles, "followup.view.all")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const status = await prisma.recommendationStatus.findUnique({ where: { id: recommendation.statusId } });

  await prisma.$transaction(async (tx) => {
    const followUp = await tx.followUpUpdate.create({
      data: {
        recommendationId: recommendation.id,
        progressComment: parsed.data.progressComment,
        statusSnapshot: status?.label ?? "Unknown",
        submittedBy: session.userId,
      },
    });

    if (parsed.data.justification) {
      await tx.justification.create({
        data: {
          recommendationId: recommendation.id,
          followUpUpdateId: followUp.id,
          text: parsed.data.justification,
          submittedBy: session.userId,
        },
      });
    }

    await writeAuditLog({
      userId: session.userId,
      entityType: "Recommendation",
      entityId: recommendation.id,
      action: "FOLLOW_UP_SUBMITTED",
      additionalDetails: "Progress update submitted",
    });
  });

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const session = await requireSession();
  const body = await request.json().catch(() => null);
  const parsed = closeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const recommendation = await prisma.recommendation.findUnique({
    where: { id: parsed.data.recommendationId },
    include: { justifications: true, status: true },
  });

  if (!recommendation) {
    return NextResponse.json({ error: "Recommendation not found" }, { status: 404 });
  }

  if (parsed.data.action === "reopen") {
    const check = canReopenRecord({ roles: session.roles, reason: parsed.data.reopenReason });
    if (!check.ok) {
      return NextResponse.json({ error: check.reason }, { status: 403 });
    }

    const openStatus = await prisma.recommendationStatus.findUnique({ where: { code: "OPEN" } });
    if (!openStatus) {
      return NextResponse.json({ error: "Open status is not configured" }, { status: 500 });
    }

    await prisma.recommendation.update({
      where: { id: recommendation.id },
      data: {
        statusId: openStatus.id,
        updatedBy: session.userId,
      },
    });

    await writeAuditLog({
      userId: session.userId,
      entityType: "Recommendation",
      entityId: recommendation.id,
      action: "REOPEN",
      previousValues: { status: recommendation.status.label },
      newValues: { status: openStatus.label },
      additionalDetails: parsed.data.reopenReason,
    });

    return NextResponse.json({ ok: true });
  }

  const check = canCloseRecommendation({
    roles: session.roles,
    justificationCount: recommendation.justifications.length,
  });
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 400 });
  }

  const closedStatus = await prisma.recommendationStatus.findUnique({ where: { code: "CLOSED" } });
  if (!closedStatus) {
    return NextResponse.json({ error: "Closed status is not configured" }, { status: 500 });
  }

  await prisma.recommendation.update({
    where: { id: recommendation.id },
    data: {
      statusId: closedStatus.id,
      closedAt: new Date(),
      closedBy: session.userId,
      updatedBy: session.userId,
    },
  });

  await writeAuditLog({
    userId: session.userId,
    entityType: "Recommendation",
    entityId: recommendation.id,
    action: "CLOSE",
    previousValues: { status: recommendation.status.label },
    newValues: { status: closedStatus.label },
    additionalDetails: parsed.data.closureComment,
  });

  return NextResponse.json({ ok: true });
}
