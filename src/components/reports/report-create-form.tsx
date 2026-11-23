"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { backendApiUrl } from "@/lib/backend-api";

type RefData = {
  reportTypes: Array<{ id: string; label: string }>;
  legalEntities: Array<{ id: string; label: string }>;
  sites: Array<{ id: string; label: string; legalEntityId: string }>;
  departments: Array<{ id: string; label: string }>;
  statuses: Array<{ id: string; label: string }>;
  users: Array<{ id: string; name: string }>;
};

type RecommendationDraft = {
  id?: string;
  recommendationNumber: string;
  description: string;
  expectedDeliverable: string;
  actionOwnerId: string;
  internalAuditResponsibleId: string;
  legalEntityId: string;
  siteId: string;
  departmentId: string;
  dueDate: string;
  notificationEnabled: boolean;
  notificationIntervalDays: string;
  statusId: string;
};

type InitialData = {
  reportName: string;
  reportTypeId: string;
  publicationDate: string;
  recommendations: RecommendationDraft[];
};

const blankRec = (): RecommendationDraft => ({
  recommendationNumber: "",
  description: "",
  expectedDeliverable: "",
  actionOwnerId: "",
  internalAuditResponsibleId: "",
  legalEntityId: "",
  siteId: "",
  departmentId: "",
  dueDate: "",
  notificationEnabled: false,
  notificationIntervalDays: "7",
  statusId: "",
});

export default function ReportCreateForm({
  refData,
  mode = "create",
  submitUrl = "/reports",
  submitMethod = "POST",
  cancelHref = "/reports",
  initialData,
}: {
  refData: RefData;
  mode?: "create" | "edit";
  submitUrl?: string;
  submitMethod?: "POST" | "PUT";
  cancelHref?: string;
  initialData?: InitialData;
}) {
  const router = useRouter();

  const [reportName, setReportName] = useState(initialData?.reportName ?? "");
  const [reportTypeId, setReportTypeId] = useState(initialData?.reportTypeId ?? refData.reportTypes[0]?.id ?? "");
  const [publicationDate, setPublicationDate] = useState(initialData?.publicationDate ?? "");
  const [recommendations, setRecommendations] = useState<RecommendationDraft[]>(
    initialData?.recommendations?.length ? initialData.recommendations : [blankRec()]
  );
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const users = refData.users;
  const statusDefault = useMemo(() => refData.statuses[0]?.id ?? "", [refData.statuses]);

  const canSubmit =
    reportName.trim().length > 0 && reportTypeId && publicationDate && recommendations.length > 0;

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function updateRec(index: number, patch: Partial<RecommendationDraft>) {
    setDirty(true);
    setRecommendations((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function addRecommendation() {
    setDirty(true);
    setRecommendations((prev) => [...prev, { ...blankRec(), statusId: statusDefault }]);
  }

  function removeRecommendation(index: number) {
    setDirty(true);
    setRecommendations((prev) => prev.filter((_, i) => i !== index));
  }

  async function save() {
    setSaving(true);
    setMessage(null);

    const payload = {
      reportName: reportName.trim(),
      reportTypeId,
      publicationDate,
      recommendations: recommendations.map((rec) => ({
        id: rec.id,
        recommendationNumber: rec.recommendationNumber.trim(),
        description: rec.description.trim(),
        expectedDeliverable: rec.expectedDeliverable.trim(),
        actionOwnerId: rec.actionOwnerId || null,
        internalAuditResponsibleId: rec.internalAuditResponsibleId || null,
        legalEntityId: rec.legalEntityId,
        siteId: rec.siteId,
        departmentId: rec.departmentId,
        dueDate: rec.dueDate,
        notificationEnabled: rec.notificationEnabled,
        notificationIntervalDays: rec.notificationEnabled ? Number(rec.notificationIntervalDays || 7) : null,
        statusId: rec.statusId || statusDefault,
      })),
    };

    const response = await fetch(backendApiUrl(submitUrl), {
      method: submitMethod,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error ?? "Failed to save report");
      setSaving(false);
      return;
    }

    setDirty(false);
    setMessage(mode === "create" ? "Report and recommendations saved successfully." : "Report updated successfully.");

    if (mode === "create" && data.id) {
      router.push(`/reports/${data.id}`);
      router.refresh();
      return;
    }

    router.refresh();
    setSaving(false);
  }

  function onCancel() {
    if (dirty) {
      const keepEditing = !confirm("You have unsaved changes. Discard and leave?");
      if (keepEditing) return;
    }
    router.push(cancelHref);
  }

  return (
    <div className="space-y-5">
      <div className="app-card p-4">
        <h2 className="text-lg font-semibold">Report Information</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <input
            value={reportName}
            onChange={(e) => {
              setDirty(true);
              setReportName(e.target.value);
            }}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm"
            placeholder="Report Name"
          />

          <select
            value={reportTypeId}
            onChange={(e) => {
              setDirty(true);
              setReportTypeId(e.target.value);
            }}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm"
          >
            {refData.reportTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={publicationDate}
            onChange={(e) => {
              setDirty(true);
              setPublicationDate(e.target.value);
            }}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>

      {recommendations.map((rec, i) => {
        const siteOptions = refData.sites.filter((s) => !rec.legalEntityId || s.legalEntityId === rec.legalEntityId);
        return (
          <div key={rec.id ?? `new-${i}`} className="app-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-primary">Recommendation {i + 1}</h3>
              {!rec.id && recommendations.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeRecommendation(i)}
                  className="rounded-md bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
                >
                  Remove
                </button>
              ) : null}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={rec.recommendationNumber}
                onChange={(e) => updateRec(i, { recommendationNumber: e.target.value })}
                className="rounded-md border border-border bg-white px-3 py-2 text-sm"
                placeholder="Recommendation Number"
              />
              <input
                type="date"
                value={rec.dueDate}
                onChange={(e) => updateRec(i, { dueDate: e.target.value })}
                className="rounded-md border border-border bg-white px-3 py-2 text-sm"
              />
              <textarea
                value={rec.description}
                onChange={(e) => updateRec(i, { description: e.target.value })}
                className="rounded-md border border-border bg-white px-3 py-2 text-sm md:col-span-2"
                placeholder="Description"
              />
              <textarea
                value={rec.expectedDeliverable}
                onChange={(e) => updateRec(i, { expectedDeliverable: e.target.value })}
                className="rounded-md border border-border bg-white px-3 py-2 text-sm md:col-span-2"
                placeholder="Expected Deliverable"
              />
              <select
                value={rec.actionOwnerId}
                onChange={(e) => updateRec(i, { actionOwnerId: e.target.value })}
                className="rounded-md border border-border bg-white px-3 py-2 text-sm"
              >
                <option value="">Action Owner</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <select
                value={rec.internalAuditResponsibleId}
                onChange={(e) => updateRec(i, { internalAuditResponsibleId: e.target.value })}
                className="rounded-md border border-border bg-white px-3 py-2 text-sm"
              >
                <option value="">Internal Audit Responsible</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <select
                value={rec.legalEntityId}
                onChange={(e) => updateRec(i, { legalEntityId: e.target.value, siteId: "" })}
                className="rounded-md border border-border bg-white px-3 py-2 text-sm"
              >
                <option value="">Legal Entity</option>
                {refData.legalEntities.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.label}
                  </option>
                ))}
              </select>
              <select
                value={rec.siteId}
                onChange={(e) => updateRec(i, { siteId: e.target.value })}
                className="rounded-md border border-border bg-white px-3 py-2 text-sm"
              >
                <option value="">Site</option>
                {siteOptions.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.label}
                  </option>
                ))}
              </select>
              <select
                value={rec.departmentId}
                onChange={(e) => updateRec(i, { departmentId: e.target.value })}
                className="rounded-md border border-border bg-white px-3 py-2 text-sm"
              >
                <option value="">Department</option>
                {refData.departments.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.label}
                  </option>
                ))}
              </select>
              <select
                value={rec.statusId}
                onChange={(e) => updateRec(i, { statusId: e.target.value })}
                className="rounded-md border border-border bg-white px-3 py-2 text-sm"
              >
                {refData.statuses.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.label}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={rec.notificationEnabled}
                  onChange={(e) => updateRec(i, { notificationEnabled: e.target.checked })}
                />
                Notification Enabled
              </label>
              <input
                type="number"
                min={1}
                value={rec.notificationIntervalDays}
                onChange={(e) => updateRec(i, { notificationIntervalDays: e.target.value })}
                className="rounded-md border border-border bg-white px-3 py-2 text-sm"
                placeholder="Notification Interval Days"
                disabled={!rec.notificationEnabled}
              />
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addRecommendation}
          className="rounded-md border border-border bg-white px-3 py-2 text-sm font-semibold"
        >
          Add Recommendation
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!canSubmit || saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
        >
          {saving ? "Saving..." : mode === "create" ? "Save Report" : "Update Report"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold"
        >
          Cancel
        </button>
      </div>

      {message ? <p className="text-sm text-muted">{message}</p> : null}
    </div>
  );
}
