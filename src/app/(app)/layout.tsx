import { ReactNode } from "react";
import Sidebar from "@/components/app-shell/sidebar";
import Topbar from "@/components/app-shell/topbar";
import { requireSession } from "@/lib/auth";

export const instant = false;

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar name={session.name} roles={session.roles} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
