import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";

const patchSchema = z.object({
  userId: z.string().min(1),
  active: z.boolean().optional(),
  departmentId: z.string().nullable().optional(),
  roleIds: z.array(z.string()).optional(),
});

export async function GET() {
  const session = await requireSession();
  if (!hasPermission(session.roles, "admin.users.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    include: {
      department: true,
      userRoles: { include: { role: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      active: user.active,
      department: user.department?.label ?? "-",
      roles: user.userRoles.map((r) => r.role.name),
    }))
  );
}

export async function PATCH(request: Request) {
  const session = await requireSession();
  if (!hasPermission(session.roles, "admin.users.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    include: { userRoles: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: existing.id },
      data: {
        active: parsed.data.active ?? existing.active,
        departmentId:
          parsed.data.departmentId === undefined ? existing.departmentId : parsed.data.departmentId,
      },
    });

    if (parsed.data.roleIds) {
      await tx.userRole.deleteMany({ where: { userId: existing.id } });

      const baseline = await tx.role.findUnique({ where: { name: "Audit" } });
      const allRoleIds = new Set(parsed.data.roleIds);
      if (baseline) {
        allRoleIds.add(baseline.id);
      }

      for (const roleId of allRoleIds) {
        await tx.userRole.create({
          data: {
            userId: existing.id,
            roleId,
          },
        });
      }
    }
  });

  await writeAuditLog({
    userId: session.userId,
    entityType: "User",
    entityId: existing.id,
    action: "ADMIN_UPDATE_USER",
    previousValues: {
      active: existing.active,
      departmentId: existing.departmentId,
      roleIds: existing.userRoles.map((r) => r.roleId),
    },
    newValues: parsed.data,
  });

  return NextResponse.json({ ok: true });
}
