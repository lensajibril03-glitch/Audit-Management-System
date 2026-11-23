import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { recommendationVisibilityWhere } from "@/lib/access-scope";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await requireSession();
  const where = recommendationVisibilityWhere(session);
  const rows = await prisma.recommendation.findMany({
    where,
    include: {
      report: true,
      status: true,
      actionOwner: true,
      department: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(rows);
}
