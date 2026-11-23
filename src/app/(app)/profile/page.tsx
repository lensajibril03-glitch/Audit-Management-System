import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage() {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { department: true, profile: true, userRoles: { include: { role: true } } },
  });

  if (!user) {
    return <p className="text-sm text-danger">User not found.</p>;
  }

  return (
    <div className="app-card p-4">
      <h1 className="text-xl font-semibold">User Profile</h1>
      <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
        <p>Name: {user.name}</p>
        <p>Email: {user.email}</p>
        <p>Department: {user.department?.label ?? "-"}</p>
        <p>Roles: {user.userRoles.map((r) => r.role.name).join(", ")}</p>
        <p>Locale: {user.profile?.locale ?? "en"}</p>
        <p>Timezone: {user.profile?.timezone ?? "UTC"}</p>
      </div>
    </div>
  );
}
