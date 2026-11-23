"use client";

import { useState } from "react";
import { backendApiUrl } from "@/lib/backend-api";

export default function FollowupActions({
  recommendationId,
  canClose,
  canReopen,
}: {
  recommendationId: string;
  canClose: boolean;
  canReopen: boolean;
}) {
  const [progressComment, setProgressComment] = useState("");
  const [justification, setJustification] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function submitFollowup() {
    const response = await fetch(backendApiUrl("/follow-up"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ recommendationId, progressComment, justification }),
    });
    const data = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Follow-up submitted." : data.error ?? "Submission failed");
  }

  async function closeRecommendation() {
    const response = await fetch(backendApiUrl("/follow-up"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "close", recommendationId, closureComment: "Closed from follow-up details" }),
    });
    const data = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Recommendation closed." : data.error ?? "Close failed");
  }

  async function reopenRecommendation() {
    const reason = prompt("Reason for reopening recommendation");
    if (!reason || reason.trim().length < 3) {
      setMessage("Reopen reason is required.");
      return;
    }

    const response = await fetch(backendApiUrl("/follow-up"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "reopen", recommendationId, reopenReason: reason }),
    });
    const data = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Recommendation reopened." : data.error ?? "Reopen failed");
  }

  return (
    <div className="app-card p-4">
      <h3 className="text-base font-semibold">Follow-up Update / Justification</h3>
      <div className="mt-3 space-y-3">
        <textarea
          value={progressComment}
          onChange={(e) => setProgressComment(e.target.value)}
          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
          placeholder="Progress updates"
        />
        <textarea
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
          placeholder="Justification and challenges"
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={submitFollowup} className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white">
            Submit Follow-up
          </button>
          {canClose ? (
            <button type="button" onClick={closeRecommendation} className="rounded-md bg-ok px-3 py-2 text-sm font-semibold text-white">
              Close Recommendation
            </button>
          ) : null}
          {canReopen ? (
            <button type="button" onClick={reopenRecommendation} className="rounded-md bg-warn px-3 py-2 text-sm font-semibold text-white">
              Reopen Recommendation
            </button>
          ) : null}
        </div>
        {message ? <p className="text-sm text-muted">{message}</p> : null}
      </div>
    </div>
  );
}
