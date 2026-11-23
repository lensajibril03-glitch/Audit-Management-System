import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await requireSession();
  if (!hasPermission(session.roles, "admin.reference.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [reportTypes, legalEntities, sites, departments, statuses] = await Promise.all([
    prisma.reportType.findMany({ orderBy: { label: "asc" } }),
    prisma.legalEntity.findMany({ orderBy: { label: "asc" } }),
    prisma.site.findMany({ include: { legalEntity: true }, orderBy: { label: "asc" } }),
    prisma.department.findMany({ orderBy: { label: "asc" } }),
    prisma.recommendationStatus.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return NextResponse.json({ reportTypes, legalEntities, sites, departments, statuses });
}
