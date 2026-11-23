import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import ReportCreateForm from "@/components/reports/report-create-form";

export default async function NewReportPage() {
  const session = await requireSession();
  if (!hasPermission(session.roles, "reports.create")) {
    return <p className="text-sm text-danger">You do not have permission to create reports.</p>;
  }

  const [reportTypes, legalEntities, sites, departments, statuses, users] = await Promise.all([
    prisma.reportType.findMany({ where: { active: true }, orderBy: { label: "asc" } }),
    prisma.legalEntity.findMany({ where: { active: true }, orderBy: { label: "asc" } }),
    prisma.site.findMany({ where: { active: true }, orderBy: { label: "asc" } }),
    prisma.department.findMany({ where: { active: true }, orderBy: { label: "asc" } }),
    prisma.recommendationStatus.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Create Audit Report</h1>
      <ReportCreateForm
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
