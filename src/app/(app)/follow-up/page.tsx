import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { fetchBackendJson } from "@/lib/server-backend-api";
import { formatDate } from "@/lib/utils";
import Pagination from "@/components/app-shell/pagination";

type FollowUpRow = {
  id: string;
  recommendationNumber: string;
  dueDate: string;
  report: { reportName: string; reportType: { label: string } };
  actionOwner: { name: string } | null;
  department: { label: string };
  status: { label: string; isTerminal: boolean };
};
type FollowUpResponse = {
  items: FollowUpRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export default async function FollowupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "";
  const q = typeof params.q === "string" ? params.q : "";
  const page = Math.max(1, Number(typeof params.page === "string" ? params.page : "1") || 1);
  const pageSize = 20;
  const canExport = hasPermission(session.roles, "followup.export");
  const data = await fetchBackendJson<FollowUpResponse>(
    `/follow-up?status=${encodeURIComponent(status)}&q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}`,
  );
  const recommendations = data.items;
  const totalPages = data.totalPages;

  const now = new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Follow-up Register</h1>
        <div className="flex gap-2">
          {canExport ? (
            <Link href={`/api/follow-up?export=csv&status=${encodeURIComponent(status)}&recommendationNumber=${encodeURIComponent(q)}`} className="rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold">
              Export CSV
            </Link>
          ) : null}
          {canExport ? (
            <Link href={`/api/follow-up?export=xlsx&status=${encodeURIComponent(status)}&recommendationNumber=${encodeURIComponent(q)}`} className="rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold">
              Export XLSX
            </Link>
          ) : null}
        </div>
      </div>

      <form className="app-card grid gap-2 p-3 md:grid-cols-4">
        <input
          name="q"
          defaultValue={q}
          placeholder="Recommendation number"
          className="rounded-md border border-border bg-white px-3 py-2 text-sm"
        />
        <select name="status" defaultValue={status} className="rounded-md border border-border bg-white px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="closed">Closed only</option>
        </select>
        <div className="flex items-center gap-2">
          <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white">
            Apply
          </button>
          <Link href="/follow-up" className="rounded-md border border-border bg-white px-3 py-2 text-sm">
            Clear
          </Link>
        </div>
      </form>

      <Pagination basePath="/follow-up" page={page} totalPages={totalPages} query={{ q, status }} />

      {recommendations.length === 0 ? <div className="app-card p-5 text-sm text-muted">No follow-up records match your filters.</div> : null}

      {recommendations.length > 0 ? (
      <div className="app-card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-surface-alt text-left">
            <tr>
              <th className="px-3 py-2">Report</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Rec #</th>
              <th className="px-3 py-2">Action Owner</th>
              <th className="px-3 py-2">Department</th>
              <th className="px-3 py-2">Due Date</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {recommendations.map((r) => {
              const overdue = new Date(r.dueDate) < now && !r.status.isTerminal;
              return (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2">{r.report.reportName}</td>
                  <td className="px-3 py-2">{r.report.reportType.label}</td>
                  <td className="px-3 py-2">{r.recommendationNumber}</td>
                  <td className="px-3 py-2">{r.actionOwner?.name ?? "-"}</td>
                  <td className="px-3 py-2">{r.department.label}</td>
                  <td className="px-3 py-2">
                    <span className={overdue ? "status-pill status-overdue" : ""}>{formatDate(r.dueDate)}</span>
                  </td>
                  <td className="px-3 py-2">{r.status.label}</td>
                  <td className="px-3 py-2">
                    <Link href={`/follow-up/${r.id}`} className="text-primary underline">
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      ) : null}

      <Pagination basePath="/follow-up" page={page} totalPages={totalPages} query={{ q, status }} />
    </div>
  );
}
