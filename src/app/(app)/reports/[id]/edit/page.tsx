import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ReportCreateForm from "@/components/reports/report-create-form";

export default async function EditReportPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!hasPermission(session.roles, "reports.edit")) {
    return <p className="text-sm text-danger">You do not have permission to edit reports.</p>;
  }

  const { id } = await params;

  const [report, reportTypes, legalEntities, sites, departments, statuses, users] = await Promise.all([
    prisma.auditReport.findUnique({
      where: { id },
      include: {
        recommendations: {
          orderBy: { dueDate: "asc" },
        },
      },
    }),
    prisma.reportType.findMany({ where: { active: true }, orderBy: { label: "asc" } }),
    prisma.legalEntity.findMany({ where: { active: true }, orderBy: { label: "asc" } }),
    prisma.site.findMany({ where: { active: true }, orderBy: { label: "asc" } }),
    prisma.department.findMany({ where: { active: true }, orderBy: { label: "asc" } }),
    prisma.recommendationStatus.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!report) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Edit Report</h1>
      <ReportCreateForm
        mode="edit"
        submitUrl={`/reports/${id}`}
        submitMethod="PUT"
        cancelHref={`/reports/${id}`}
        initialData={{
          reportName: report.reportName,
          reportTypeId: report.reportTypeId,
          publicationDate: report.publicationDate.toISOString().slice(0, 10),
          recommendations: report.recommendations.map((rec) => ({
            id: rec.id,
            recommendationNumber: rec.recommendationNumber,
            description: rec.description,
            expectedDeliverable: rec.expectedDeliverable,
            actionOwnerId: rec.actionOwnerId ?? "",
            internalAuditResponsibleId: rec.internalAuditResponsibleId ?? "",
            legalEntityId: rec.legalEntityId,
            siteId: rec.siteId,
            departmentId: rec.departmentId,
            dueDate: rec.dueDate.toISOString().slice(0, 10),
            notificationEnabled: rec.notificationEnabled,
            notificationIntervalDays: String(rec.notificationIntervalDays ?? 7),
            statusId: rec.statusId,
          })),
        }}
        refData={{
          reportTypes,
          legalEntities,
          sites,
          departments,
          statuses,
          users,
        }}
      />
    </div>
  );
}
