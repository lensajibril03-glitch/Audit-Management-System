import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { fetchBackendJson } from "@/lib/server-backend-api";
import { formatDate } from "@/lib/utils";
import Pagination from "@/components/app-shell/pagination";
import ReportArchiveActions from "@/components/reports/report-archive-actions";

type ArchiveReport = {
  id: string;
  reportName: string;
  publicationDate: string;
  archivedAt: string | null;
  reportType: { label: string };
  recommendations: Array<{ id: string }>;
  archiver: { name: string } | null;
};
type ArchiveResponse = {
  items: ArchiveReport[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  reportTypes: Array<{ id: string; label: string }>;
};

export default async function ArchivePage({
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
  const canReopen = hasPermission(session.roles, "recommendations.reopen");
  const canExport = hasPermission(session.roles, "archive.export");

  const data = await fetchBackendJson<ArchiveResponse>(
    `/archive?q=${encodeURIComponent(q)}&reportTypeId=${encodeURIComponent(reportTypeId)}&page=${page}&pageSize=${pageSize}`,
  );
  const archived = data.items;
  const reportTypes = data.reportTypes;
  const totalPages = data.totalPages;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Archive</h1>
        <div className="flex gap-2">
          {canExport ? (
            <Link href={`/api/archive?export=csv&q=${encodeURIComponent(q)}&reportTypeId=${encodeURIComponent(reportTypeId)}`} className="rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold">
              Export CSV
            </Link>
          ) : null}
          {canExport ? (
            <Link href={`/api/archive?export=xlsx&q=${encodeURIComponent(q)}&reportTypeId=${encodeURIComponent(reportTypeId)}`} className="rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold">
              Export XLSX
            </Link>
          ) : null}
        </div>
      </div>

      <form className="app-card grid gap-2 p-3 md:grid-cols-4">
        <input name="q" defaultValue={q} placeholder="Search report name" className="rounded-md border border-border bg-white px-3 py-2 text-sm" />
        <select name="reportTypeId" defaultValue={reportTypeId} className="rounded-md border border-border bg-white px-3 py-2 text-sm">
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
          <Link href="/archive" className="rounded-md border border-border bg-white px-3 py-2 text-sm">
            Clear
          </Link>
        </div>
      </form>

      <Pagination basePath="/archive" page={page} totalPages={totalPages} query={{ q, reportTypeId }} />

      {archived.length === 0 ? <div className="app-card p-5 text-sm text-muted">No archived reports found for current filters.</div> : null}

      {archived.length > 0 ? (
      <div className="app-card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-surface-alt text-left">
            <tr>
              <th className="px-3 py-2">Report Name</th>
              <th className="px-3 py-2">Report Type</th>
              <th className="px-3 py-2">Publication Date</th>
              <th className="px-3 py-2">Recommendation Count</th>
              <th className="px-3 py-2">Archived Date</th>
              <th className="px-3 py-2">Archived By</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {archived.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2">{r.reportName}</td>
                <td className="px-3 py-2">{r.reportType.label}</td>
                <td className="px-3 py-2">{formatDate(r.publicationDate)}</td>
                <td className="px-3 py-2">{r.recommendations.length}</td>
                <td className="px-3 py-2">{formatDate(r.archivedAt)}</td>
                <td className="px-3 py-2">{r.archiver?.name ?? "-"}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Link href={`/archive/${r.id}`} className="text-primary underline">View</Link>
                    {canReopen ? <ReportArchiveActions reportId={r.id} mode="reopen" /> : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      ) : null}

      <Pagination basePath="/archive" page={page} totalPages={totalPages} query={{ q, reportTypeId }} />
    </div>
  );
}
