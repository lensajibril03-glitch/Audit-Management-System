import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { fetchBackendJson } from "@/lib/server-backend-api";
import { formatDate } from "@/lib/utils";

type ReportDetail = {
  reportName: string;
  publicationDate: string;
  reportType: { label: string };
  recommendations: Array<{
    id: string;
    recommendationNumber: string;
    description: string;
    dueDate: string;
    status: { label: string };
    actionOwner: { name: string } | null;
    department: { label: string };
  }>;
};

export default async function ReportDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;

  let report: ReportDetail;
  try {
    report = await fetchBackendJson<ReportDetail>(`/reports/${id}`);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-4">
      <div className="app-card p-4">
        <h1 className="text-xl font-semibold">{report.reportName}</h1>
        <p className="text-sm text-muted">{report.reportType.label}</p>
        <p className="text-xs text-muted">Publication: {formatDate(report.publicationDate)}</p>
      </div>

      <div className="app-card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-surface-alt text-left">
            <tr>
              <th className="px-3 py-2">Recommendation #</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Owner</th>
              <th className="px-3 py-2">Department</th>
              <th className="px-3 py-2">Due Date</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {report.recommendations.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2">{r.recommendationNumber}</td>
                <td className="px-3 py-2">{r.description}</td>
                <td className="px-3 py-2">{r.actionOwner?.name ?? "-"}</td>
                <td className="px-3 py-2">{r.department.label}</td>
                <td className="px-3 py-2">{formatDate(r.dueDate)}</td>
                <td className="px-3 py-2">{r.status.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
