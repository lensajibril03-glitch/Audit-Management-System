import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function NotificationLogsPage() {
  const session = await requireSession();
  if (!hasPermission(session.roles, "notifications.manage")) {
    return <p className="text-sm text-danger">You do not have permission to access notification logs.</p>;
  }

  const logs = await prisma.notificationLog.findMany({
    include: { recommendation: true, recipient: true },
    orderBy: { scheduledAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Notification Logs</h1>
      <div className="app-card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-surface-alt text-left">
            <tr>
              <th className="px-3 py-2">Recommendation</th>
              <th className="px-3 py-2">Recipient</th>
              <th className="px-3 py-2">Channel</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Scheduled</th>
              <th className="px-3 py-2">Sent</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-border">
                <td className="px-3 py-2">{log.recommendation.recommendationNumber}</td>
                <td className="px-3 py-2">{log.recipient.name}</td>
                <td className="px-3 py-2">{log.channel}</td>
                <td className="px-3 py-2">{log.deliveryStatus}</td>
                <td className="px-3 py-2">{formatDate(log.scheduledAt)}</td>
                <td className="px-3 py-2">{formatDate(log.sentAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
