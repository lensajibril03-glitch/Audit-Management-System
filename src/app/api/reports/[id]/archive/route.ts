import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { canReopenRecord } from "@/lib/business-rules";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const action = (body.action as "archive" | "reopen") ?? "archive";

  const report = await prisma.auditReport.findUnique({ where: { id } });
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  if (action === "archive") {
    if (!hasPermission(session.roles, "archive.manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.auditReport.update({
        where: { id: report.id },
        data: {
          archiveState: "ARCHIVED",
          archivedAt: new Date(),
          archivedBy: session.userId,
          updatedBy: session.userId,
        },
      });

      await tx.recommendation.updateMany({
        where: { reportId: report.id },
        data: {
          archivedAt: new Date(),
          archivedBy: session.userId,
          updatedBy: session.userId,
        },
      });
    });

    await writeAuditLog({
      userId: session.userId,
      entityType: "AuditReport",
      entityId: report.id,
      action: "ARCHIVE",
      previousValues: { archiveState: report.archiveState },
      newValues: { archiveState: "ARCHIVED" },
    });

    return NextResponse.json({ ok: true });
  }

  const check = canReopenRecord({ roles: session.roles, reason: body.reason });
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 403 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.auditReport.update({
      where: { id: report.id },
      data: {
        archiveState: "ACTIVE",
        archivedAt: null,
        archivedBy: null,
        updatedBy: session.userId,
      },
    });

    await tx.recommendation.updateMany({
      where: { reportId: report.id },
      data: {
        archivedAt: null,
        archivedBy: null,
        updatedBy: session.userId,
      },
    });
  });

  await writeAuditLog({
    userId: session.userId,
    entityType: "AuditReport",
    entityId: report.id,
    action: "REOPEN",
    previousValues: { archiveState: report.archiveState },
    newValues: { archiveState: "ACTIVE" },
    additionalDetails: body.reason,
  });

  return NextResponse.json({ ok: true });
}
