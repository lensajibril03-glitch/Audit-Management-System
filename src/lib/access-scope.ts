import { Prisma } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";

type Session = {
  userId: string;
  roles: string[];
  departmentId: string | null;
};

export function recommendationVisibilityWhere(session: Session): Prisma.RecommendationWhereInput {
  if (hasPermission(session.roles, "followup.view.all")) {
    return {};
  }

  if (hasPermission(session.roles, "department.view") && session.departmentId) {
    return { departmentId: session.departmentId };
  }

  return {
    OR: [{ actionOwnerId: session.userId }, { internalAuditResponsibleId: session.userId }],
  };
}
