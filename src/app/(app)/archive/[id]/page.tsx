import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { fetchBackendJson } from "@/lib/server-backend-api";
import { formatDate } from "@/lib/utils";

type ArchivedReportDetail = {
  reportName: string;
  publicationDate: string;
  reportType: { label: string };
  recommendations: Array<{
    id: string;
    recommendationNumber: string;
    description: string;
    dueDate: string;
    status: { label: string };
    followUpUpdates: Array<{ id: string }>;
    justifications: Array<{ id: string }>;
  }>;
};

export default async function ArchiveDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;

  let report: ArchivedReportDetail;
  try {
    report = await fetchBackendJson<ArchivedReportDetail>(`/archive/${id}`);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-4">
      <div className="app-card p-4">
        <h1 className="text-xl font-semibold">Archived Report: {report.reportName}</h1>
        <p className="text-sm text-muted">{report.reportType.label}</p>
        <p className="text-xs text-muted">Publication: {formatDate(report.publicationDate)}</p>
      </div>
      {report.recommendations.map((r) => (
        <div key={r.id} className="app-card p-4">
          <h2 className="font-semibold">{r.recommendationNumber} - {r.status.label}</h2>
          <p className="text-sm">{r.description}</p>
          <p className="text-xs text-muted">Due: {formatDate(r.dueDate)}</p>
          <p className="mt-2 text-sm font-semibold">Follow-up history: {r.followUpUpdates.length} updates</p>
          <p className="text-sm font-semibold">Justifications: {r.justifications.length} records</p>
        </div>
      ))}
    </div>
  );
}
