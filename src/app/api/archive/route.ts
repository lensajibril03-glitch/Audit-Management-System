import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { parseDate, parsePagination } from "@/lib/query";
import { buildExportBuffer, exportHeaders } from "@/lib/export";

export async function GET(request: Request) {
  const session = await requireSession();
  if (!hasPermission(session.roles, "archive.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const reportTypeId = searchParams.get("reportTypeId") || undefined;
  const archivedFrom = parseDate(searchParams.get("archivedFrom"));
  const archivedTo = parseDate(searchParams.get("archivedTo"));
  const exportFormat = searchParams.get("export") as "csv" | "xlsx" | null;
  const { page, pageSize, skip, take } = parsePagination(searchParams);

  const where = {
    archiveState: "ARCHIVED" as const,
    reportName: q ? { contains: q } : undefined,
    reportTypeId,
    archivedAt:
      archivedFrom || archivedTo
        ? {
            gte: archivedFrom,
            lte: archivedTo,
          }
        : undefined,
  };

  const rows = await prisma.auditReport.findMany({
    where,
    include: {
      reportType: true,
      archiver: true,
      recommendations: {
        include: {
          department: true,
          legalEntity: true,
          site: true,
          actionOwner: true,
          status: true,
        },
      },
    },
    orderBy: { archivedAt: "desc" },
    skip,
    take,
  });

  const total = await prisma.auditReport.count({ where });

  if (exportFormat && hasPermission(session.roles, "archive.export")) {
    const exportRows = rows.flatMap((report) => {
      if (report.recommendations.length === 0) {
        return [
          {
            "Report Name": report.reportName,
            "Report Type": report.reportType.label,
            "Publication Date": report.publicationDate.toISOString(),
            "Recommendation Number": "",
            Department: "",
            "Action Owner": "",
            "Due Date": "",
            Status: "",
            "Archived Date": report.archivedAt?.toISOString() ?? "",
            "Archived By": report.archiver?.name ?? "",
            "Export Date": new Date().toISOString(),
          },
        ];
      }

      return report.recommendations.map((rec) => ({
        "Report Name": report.reportName,
        "Report Type": report.reportType.label,
        "Publication Date": report.publicationDate.toISOString(),
        "Recommendation Number": rec.recommendationNumber,
        Department: rec.department.label,
        "Action Owner": rec.actionOwner?.name ?? "",
        "Due Date": rec.dueDate.toISOString(),
        Status: rec.status.label,
        "Archived Date": report.archivedAt?.toISOString() ?? "",
        "Archived By": report.archiver?.name ?? "",
        "Export Date": new Date().toISOString(),
      }));
    });

    const buffer = buildExportBuffer(exportRows, exportFormat);
    return new NextResponse(buffer, {
      status: 200,
      headers: exportHeaders("archive", exportFormat),
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
