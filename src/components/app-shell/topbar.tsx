"use client";

import { Bell, LogOut, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { backendApiUrl } from "@/lib/backend-api";

type TopbarProps = {
  name: string;
  roles: string[];
};

export default function Topbar({ name, roles }: TopbarProps) {
  const router = useRouter();

  async function logout() {
    await fetch(backendApiUrl("/auth/logout"), { method: "POST", credentials: "include" });
    router.push("/login");
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-6">
      <div>
        <p className="text-lg font-semibold text-primary">BGI-Apps | Audit</p>
        <p className="text-xs text-muted">Audit Findings & Recommendations Management System</p>
      </div>

      <div className="flex items-center gap-4">
        <button type="button" className="relative rounded-md border border-border p-2 text-muted hover:bg-surface-alt" aria-label="Notifications">
          <Bell size={16} />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-danger" />
        </button>

        <div className="flex items-center gap-2 rounded-md border border-border bg-surface-alt px-3 py-2">
          <UserRound size={16} className="text-primary" />
          <div className="text-xs">
            <p className="font-semibold text-foreground">{name}</p>
            <p className="text-muted">{roles.join(", ")}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-strong"
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </header>
  );
}
