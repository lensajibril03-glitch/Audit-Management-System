import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function NotificationSettingsPage() {
  const session = await requireSession();
  if (!hasPermission(session.roles, "notifications.manage")) {
    return <p className="text-sm text-danger">You do not have permission to access notification settings.</p>;
  }

  const settings = await prisma.notificationSetting.findMany({ orderBy: { channel: "asc" } });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Notification Settings</h1>
      <div className="app-card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-surface-alt text-left">
            <tr>
              <th className="px-3 py-2">Channel</th>
              <th className="px-3 py-2">Enabled</th>
              <th className="px-3 py-2">Upcoming Days</th>
              <th className="px-3 py-2">Overdue Interval</th>
              <th className="px-3 py-2">Periodic Interval</th>
            </tr>
          </thead>
          <tbody>
            {settings.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-3 py-2">{s.channel}</td>
                <td className="px-3 py-2">{s.enabled ? "Yes" : "No"}</td>
                <td className="px-3 py-2">{s.upcomingDaysBeforeDue}</td>
                <td className="px-3 py-2">{s.overdueReminderDays}</td>
                <td className="px-3 py-2">{s.periodicReminderDays}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
