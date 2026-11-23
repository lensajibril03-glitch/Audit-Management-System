import KpiCard from "@/components/dashboard/kpi-card";
import { requireSession } from "@/lib/auth";
import { fetchBackendJson } from "@/lib/server-backend-api";
import { formatDate } from "@/lib/utils";

type DashboardSummary = {
  total: number;
  openCount: number;
  overdueCount: number;
  closedCount: number;
  byDepartment: Array<{ departmentId: string; departmentName: string; count: number }>;
  upcoming: Array<{
    id: string;
    reportName: string;
    recommendationNumber: string;
    statusLabel: string;
    dueDate: string;
  }>;
};

export default async function DashboardPage() {
  await requireSession();
  const summary = await fetchBackendJson<DashboardSummary>("/dashboard/summary");
  const { total, openCount, overdueCount, closedCount, byDepartment, upcoming } = summary;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Total Tasks" value={total} subtitle="All visible recommendations" href="/follow-up" />
        <KpiCard title="Open Tasks" value={openCount} subtitle="Not in terminal status" href="/follow-up?status=open" />
        <KpiCard title="Overdue Tasks" value={overdueCount} subtitle="Past due date and not closed" href="/follow-up?overdue=1" />
        <KpiCard title="Closed Tasks" value={closedCount} subtitle="Terminal status recommendations" href="/follow-up?status=closed" />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="app-panel p-4">
          <h2 className="text-lg font-semibold text-foreground">Open Tasks by Department</h2>
          <div className="mt-3 space-y-2">
            {byDepartment.length === 0 ? (
              <p className="text-sm text-muted">No records available for current scope.</p>
            ) : (
              byDepartment.map((row) => (
                <div key={row.departmentId} className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm">
                  <span>{row.departmentName}</span>
                  <span className="font-semibold text-primary">{row.count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="app-panel p-4">
          <h2 className="text-lg font-semibold text-foreground">Upcoming Due Dates</h2>
          <div className="mt-3 space-y-2">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted">No upcoming due recommendations.</p>
            ) : (
              upcoming.map((item) => (
                <div key={item.id} className="rounded-md bg-white px-3 py-2 text-sm">
                  <p className="font-semibold text-foreground">
                    {item.reportName} - {item.recommendationNumber}
                  </p>
                  <p className="text-muted">{item.statusLabel}</p>
                  <p className="text-xs text-muted">Due: {formatDate(item.dueDate)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
