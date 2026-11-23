import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { fetchBackendJson } from "@/lib/server-backend-api";

type RoleRow = {
  id: string;
  name: string;
  description: string;
  userCount: number;
};

export default async function AdminRolesPage() {
  const session = await requireSession();
  if (!hasPermission(session.roles, "admin.roles.manage")) {
    return <p className="text-sm text-danger">You do not have permission to access role management.</p>;
  }

  const roles = await fetchBackendJson<RoleRow[]>("/admin/roles");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Role Management</h1>
      <div className="app-card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-surface-alt text-left">
            <tr>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Users</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id} className="border-t border-border">
                <td className="px-3 py-2">{role.name}</td>
                <td className="px-3 py-2">{role.description}</td>
                <td className="px-3 py-2">{role.userCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
