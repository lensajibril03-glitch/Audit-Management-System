import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { fetchBackendJson } from "@/lib/server-backend-api";

type RefDataResponse = {
  reportTypes: Array<{ id: string; label: string }>;
  legalEntities: Array<{ id: string; label: string }>;
  sites: Array<{ id: string; label: string; legalEntity: { label: string } }>;
  departments: Array<{ id: string; label: string }>;
  statuses: Array<{ id: string; label: string }>;
};

export default async function ReferenceDataPage() {
  const session = await requireSession();
  if (!hasPermission(session.roles, "admin.reference.manage")) {
    return <p className="text-sm text-danger">You do not have permission to access reference data.</p>;
  }

  const { reportTypes, legalEntities, sites, departments, statuses } =
    await fetchBackendJson<RefDataResponse>("/admin/reference-data");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Reference Data Management</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="app-card p-4"><h2 className="font-semibold">Report Types</h2><p className="text-sm text-muted">{reportTypes.map((x) => x.label).join(", ")}</p></div>
        <div className="app-card p-4"><h2 className="font-semibold">Legal Entities</h2><p className="text-sm text-muted">{legalEntities.map((x) => x.label).join(", ")}</p></div>
        <div className="app-card p-4"><h2 className="font-semibold">Sites</h2><p className="text-sm text-muted">{sites.map((x) => `${x.label} (${x.legalEntity.label})`).join(", ")}</p></div>
        <div className="app-card p-4"><h2 className="font-semibold">Departments</h2><p className="text-sm text-muted">{departments.map((x) => x.label).join(", ")}</p></div>
        <div className="app-card p-4 md:col-span-2"><h2 className="font-semibold">Recommendation Statuses</h2><p className="text-sm text-muted">{statuses.map((x) => x.label).join(", ")}</p></div>
      </div>
    </div>
  );
}
