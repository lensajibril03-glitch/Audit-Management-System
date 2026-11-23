import Link from "next/link";
import Pagination from "@/components/app-shell/pagination";
import ReportArchiveActions from "@/components/reports/report-archive-actions";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { fetchBackendJson } from "@/lib/server-backend-api";
import { formatDate } from "@/lib/utils";

type ReportTypeOption = { id: string; label: string };
type ReportRow = {
  id: string;
  reportName: string;
  reportType: string;
  publicationDate: string;
  createdBy: string;
  createdDate: string;
  recommendationCount: number;
};
type ReportsResponse = {
  items: ReportRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  reportTypes: ReportTypeOption[];
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const params = await searchParams;

  const q = typeof params.q === "string" ? params.q : "";
  const reportTypeId = typeof params.reportTypeId === "string" ? params.reportTypeId : "";
  const page = Math.max(1, Number(typeof params.page === "string" ? params.page : "1") || 1);

  const pageSize = 20;

  const canCreate = hasPermission(session.roles, "reports.create");
  const canArchive = hasPermission(session.roles, "archive.manage");
  const canExport = hasPermission(session.roles, "reports.export");

  const data = await fetchBackendJson<ReportsResponse>(
    `/reports?q=${encodeURIComponent(q)}&reportTypeId=${encodeURIComponent(reportTypeId)}&page=${page}&pageSize=${pageSize}`,
  );
  const reports = data.items;
  const reportTypes = data.reportTypes;
  const totalPages = data.totalPages;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Reports Register</h1>
        <div className="flex items-center gap-2">
          {canExport ? (
            <Link
              href={`/api/reports?export=csv&q=${encodeURIComponent(q)}&reportTypeId=${encodeURIComponent(reportTypeId)}`}
              className="rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold"
            >
              Export CSV
            </Link>
          ) : null}
          {canExport ? (
            <Link
              href={`/api/reports?export=xlsx&q=${encodeURIComponent(q)}&reportTypeId=${encodeURIComponent(reportTypeId)}`}
              className="rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold"
            >
              Export XLSX
            </Link>
          ) : null}
          {canCreate ? (
            <Link href="/reports/new" className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white">
              Add Report
            </Link>
          ) : null}
        </div>
      </div>

      <form className="app-card grid gap-2 p-3 md:grid-cols-4">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search report name"
          className="rounded-md border border-border bg-white px-3 py-2 text-sm"
        />
        <select
          name="reportTypeId"
          defaultValue={reportTypeId}
          className="rounded-md border border-border bg-white px-3 py-2 text-sm"
        >
          <option value="">All report types</option>
          {reportTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <button className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white" type="submit">
            Apply
          </button>
          <Link href="/reports" className="rounded-md border border-border bg-white px-3 py-2 text-sm">
            Clear
          </Link>
        </div>
      </form>

      <Pagination basePath="/reports" page={page} totalPages={totalPages} query={{ q, reportTypeId }} />

      {reports.length === 0 ? <div className="app-card p-5 text-sm text-muted">No reports match your current filters.</div> : null}

      {reports.length > 0 ? (
        <div className="app-card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-alt text-left">
              <tr>
                <th className="px-3 py-2">Report Name</th>
                <th className="px-3 py-2">Report Type</th>
                <th className="px-3 py-2">Publication Date</th>
                <th className="px-3 py-2">Recommendations</th>
                <th className="px-3 py-2">Created By</th>
                <th className="px-3 py-2">Created Date</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2">{r.reportName}</td>
                  <td className="px-3 py-2">{r.reportType}</td>
                  <td className="px-3 py-2">{formatDate(r.publicationDate)}</td>
                  <td className="px-3 py-2">{r.recommendationCount}</td>
                  <td className="px-3 py-2">{r.createdBy}</td>
                  <td className="px-3 py-2">{formatDate(r.createdDate)}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <Link href={`/reports/${r.id}`} className="text-primary underline">
                        View
                      </Link>
                      {canCreate ? (
                        <Link href={`/reports/${r.id}/edit`} className="text-primary underline">
                          Edit
                        </Link>
                      ) : null}
                      {canArchive ? <ReportArchiveActions reportId={r.id} mode="archive" /> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Pagination basePath="/reports" page={page} totalPages={totalPages} query={{ q, reportTypeId }} />
    </div>
  );
}
