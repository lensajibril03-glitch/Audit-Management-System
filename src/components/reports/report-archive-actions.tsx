"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { backendApiUrl } from "@/lib/backend-api";

type Props = {
  reportId: string;
  mode: "archive" | "reopen";
};

export default function ReportArchiveActions({ reportId, mode }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    const reason = mode === "reopen" ? prompt("Reason for reopening this report") : "";
    if (mode === "reopen" && (!reason || reason.trim().length < 3)) {
      setMessage("Reopen reason is required.");
      return;
    }

    const response = await fetch(backendApiUrl(`/reports/${reportId}/archive`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(
        mode === "archive"
          ? { action: "archive" }
          : { action: "reopen", reason }
      ),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error ?? "Action failed");
      return;
    }

    setMessage(mode === "archive" ? "Report archived." : "Report reopened.");
    router.refresh();
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={run}
        className="rounded-md border border-border bg-white px-2 py-1 text-xs font-medium"
      >
        {mode === "archive" ? "Archive" : "Reopen"}
      </button>
      {message ? <span className="text-xs text-muted">{message}</span> : null}
    </div>
  );
}
