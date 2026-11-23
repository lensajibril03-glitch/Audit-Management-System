import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { recommendationVisibilityWhere } from "@/lib/access-scope";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await requireSession();
  const visibility = recommendationVisibilityWhere(session);

  const [total, overdue] = await Promise.all([
    prisma.recommendation.count({ where: visibility }),
    prisma.recommendation.count({ where: { ...visibility, dueDate: { lt: new Date() } } }),
  ]);

  return NextResponse.json({ total, overdue });
}
