import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { fetchBackendJson } from "@/lib/server-backend-api";

type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  department: string;
  roles: string[];
};

export default async function AdminUsersPage() {
  const session = await requireSession();
  if (!hasPermission(session.roles, "admin.users.manage")) {
    return <p className="text-sm text-danger">You do not have permission to access user management.</p>;
  }

  const users = await fetchBackendJson<AdminUserRow[]>("/admin/users");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">User Management</h1>
      <div className="app-card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-surface-alt text-left">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Department</th>
              <th className="px-3 py-2">Roles</th>
              <th className="px-3 py-2">Active</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.department}</td>
                <td className="px-3 py-2">{u.roles.join(", ")}</td>
                <td className="px-3 py-2">{u.active ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
