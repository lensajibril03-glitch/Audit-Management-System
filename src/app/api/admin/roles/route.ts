import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";

const createSchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim().min(2),
});

const patchSchema = z.object({
  id: z.string().min(1),
  description: z.string().trim().min(2),
});

export async function GET() {
  const session = await requireSession();
  if (!hasPermission(session.roles, "admin.roles.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const roles = await prisma.role.findMany({
    include: {
      userRoles: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      userCount: role.userRoles.length,
    }))
  );
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!hasPermission(session.roles, "admin.roles.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const role = await prisma.role.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
    },
  });

  await writeAuditLog({
    userId: session.userId,
    entityType: "Role",
    entityId: role.id,
    action: "CREATE_ROLE",
    newValues: parsed.data,
  });

  return NextResponse.json({ id: role.id }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await requireSession();
  if (!hasPermission(session.roles, "admin.roles.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.role.findUnique({ where: { id: parsed.data.id } });
  if (!existing) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  await prisma.role.update({
    where: { id: existing.id },
    data: { description: parsed.data.description },
  });

  await writeAuditLog({
    userId: session.userId,
    entityType: "Role",
    entityId: existing.id,
    action: "UPDATE_ROLE",
    previousValues: { description: existing.description },
    newValues: { description: parsed.data.description },
  });

  return NextResponse.json({ ok: true });
}
