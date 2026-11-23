import { notFound } from "next/navigation";
import FollowupActions from "@/components/followup/followup-actions";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { fetchBackendJson } from "@/lib/server-backend-api";
import { formatDate } from "@/lib/utils";

type FollowUpDetail = {
  id: string;
  recommendationNumber: string;
  description: string;
  dueDate: string;
  report: { reportName: string; reportType: { label: string }; publicationDate: string };
  status: { label: string };
  actionOwner: { name: string } | null;
  internalAuditResponsible: { name: string } | null;
  legalEntity: { label: string };
  site: { label: string };
  department: { label: string };
  followUpUpdates: Array<{ id: string; progressComment: string; submittedAt: string; submitter: { name: string } }>;
  justifications: Array<{ id: string; text: string; submittedAt: string; reviewStatus: string; submitter: { name: string } }>;
};

export default async function FollowupDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  let recommendation: FollowUpDetail;
  try {
    recommendation = await fetchBackendJson<FollowUpDetail>(`/follow-up/${id}`);
  } catch {
    notFound();
  }

  const canClose = hasPermission(session.roles, "recommendations.close");
  const canReopen = hasPermission(session.roles, "recommendations.reopen");

  return (
    <div className="space-y-4">
      <div className="app-card p-4">
        <h1 className="text-xl font-semibold">Recommendation {recommendation.recommendationNumber}</h1>
        <p className="text-sm text-muted">{recommendation.description}</p>
        <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
          <p>Report: {recommendation.report.reportName}</p>
          <p>Report Type: {recommendation.report.reportType.label}</p>
          <p>Publication Date: {formatDate(recommendation.report.publicationDate)}</p>
          <p>Status: {recommendation.status.label}</p>
          <p>Action Owner: {recommendation.actionOwner?.name ?? "-"}</p>
          <p>Internal Audit Responsible: {recommendation.internalAuditResponsible?.name ?? "-"}</p>
          <p>Legal Entity: {recommendation.legalEntity.label}</p>
          <p>Site: {recommendation.site.label}</p>
          <p>Department: {recommendation.department.label}</p>
          <p>Due Date: {formatDate(recommendation.dueDate)}</p>
        </div>
      </div>

      <FollowupActions recommendationId={recommendation.id} canClose={canClose} canReopen={canReopen} />

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="app-card p-4">
          <h3 className="text-base font-semibold">Progress History</h3>
          <div className="mt-3 space-y-2">
            {recommendation.followUpUpdates.length === 0 ? (
              <p className="text-sm text-muted">No updates yet.</p>
            ) : (
              recommendation.followUpUpdates.map((f) => (
                <div key={f.id} className="rounded-md bg-surface-alt p-2 text-sm">
                  <p>{f.progressComment}</p>
                  <p className="text-xs text-muted">{f.submitter.name} on {formatDate(f.submittedAt)}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="app-card p-4">
          <h3 className="text-base font-semibold">Justification History</h3>
          <div className="mt-3 space-y-2">
            {recommendation.justifications.length === 0 ? (
              <p className="text-sm text-muted">No justifications yet.</p>
            ) : (
              recommendation.justifications.map((j) => (
                <div key={j.id} className="rounded-md bg-surface-alt p-2 text-sm">
                  <p>{j.text}</p>
                  <p className="text-xs text-muted">{j.submitter.name} on {formatDate(j.submittedAt)} • {j.reviewStatus}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
