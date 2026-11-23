/* eslint-disable @typescript-eslint/no-require-imports */
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function upsertRole(name, description) {
  return prisma.role.upsert({
    where: { name },
    update: { description },
    create: { name, description },
  });
}

async function main() {
  const [finance, operations, it] = await Promise.all([
    prisma.department.upsert({ where: { code: "FIN" }, update: {}, create: { code: "FIN", label: "Finance" } }),
    prisma.department.upsert({ where: { code: "OPS" }, update: {}, create: { code: "OPS", label: "Operations" } }),
    prisma.department.upsert({ where: { code: "IT" }, update: {}, create: { code: "IT", label: "Information Technology" } }),
  ]);

  const [internalAudit] = await Promise.all([
    prisma.reportType.upsert({ where: { code: "INTERNAL_AUDIT" }, update: {}, create: { code: "INTERNAL_AUDIT", label: "Internal Audit" } }),
    prisma.reportType.upsert({ where: { code: "INTERNAL_CONTROL" }, update: {}, create: { code: "INTERNAL_CONTROL", label: "Internal Control" } }),
  ]);

  const legalEntity = await prisma.legalEntity.upsert({
    where: { code: "BGI-HQ" },
    update: {},
    create: { code: "BGI-HQ", label: "BGI Holdings" },
  });

  const [hq] = await Promise.all([
    prisma.site.upsert({
      where: { code: "HQ" },
      update: { legalEntityId: legalEntity.id },
      create: { code: "HQ", label: "Headquarters", legalEntityId: legalEntity.id },
    }),
    prisma.site.upsert({
      where: { code: "PLANT-A" },
      update: { legalEntityId: legalEntity.id },
      create: { code: "PLANT-A", label: "Plant A", legalEntityId: legalEntity.id },
    }),
  ]);

  const [openStatus, progressStatus] = await Promise.all([
    prisma.recommendationStatus.upsert({
      where: { code: "OPEN" },
      update: {},
      create: { code: "OPEN", label: "Open", sortOrder: 1, isTerminal: false },
    }),
    prisma.recommendationStatus.upsert({
      where: { code: "IN_PROGRESS" },
      update: {},
      create: { code: "IN_PROGRESS", label: "In Progress", sortOrder: 2, isTerminal: false },
    }),
    prisma.recommendationStatus.upsert({
      where: { code: "PENDING_REVIEW" },
      update: {},
      create: { code: "PENDING_REVIEW", label: "Pending Review", sortOrder: 3, isTerminal: false },
    }),
    prisma.recommendationStatus.upsert({
      where: { code: "CLOSED" },
      update: {},
      create: { code: "CLOSED", label: "Closed", sortOrder: 99, isTerminal: true },
    }),
  ]);

  const roles = await Promise.all([
    upsertRole("Audit", "Baseline role for assigned task follow-up and justifications."),
    upsertRole("Audit Analyst", "Creates reports and recommendations; assigns and closes recommendations with controls."),
    upsertRole("Audit Supervisor", "Reopens records according to business workflow."),
    upsertRole("Department Head", "Views recommendations within assigned department only."),
    upsertRole("System Admin", "Manages users, roles, and reference configurations."),
  ]);
  const roleMap = new Map(roles.map((r) => [r.name, r.id]));

  const hash = await bcrypt.hash("Password123!", 10);

  const demoUsers = [
    { name: "Ana Analyst", email: "analyst@bgi-audit.local", dept: finance.id, roles: ["Audit", "Audit Analyst"] },
    { name: "Ali ActionOwner", email: "audit.user@bgi-audit.local", dept: operations.id, roles: ["Audit"] },
    { name: "Sara Supervisor", email: "supervisor@bgi-audit.local", dept: finance.id, roles: ["Audit", "Audit Supervisor"] },
    { name: "Dee DepartmentHead", email: "dept.head@bgi-audit.local", dept: operations.id, roles: ["Audit", "Department Head"] },
    { name: "Sam SysAdmin", email: "admin@bgi-audit.local", dept: it.id, roles: ["Audit", "System Admin"] },
  ];

  for (const u of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, departmentId: u.dept, passwordHash: hash, active: true },
      create: { name: u.name, email: u.email, passwordHash: hash, departmentId: u.dept, active: true },
    });

    for (const roleName of u.roles) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: roleMap.get(roleName) } },
        update: {},
        create: { userId: user.id, roleId: roleMap.get(roleName) },
      });
    }

    await prisma.userProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, locale: "en", timezone: "UTC" },
    });
  }

  const analyst = await prisma.user.findUniqueOrThrow({ where: { email: "analyst@bgi-audit.local" } });
  const actionOwner = await prisma.user.findUniqueOrThrow({ where: { email: "audit.user@bgi-audit.local" } });

  const report = await prisma.auditReport.upsert({
    where: { id: "seed-report-001" },
    update: {},
    create: {
      id: "seed-report-001",
      reportName: "FY2026 Procurement Compliance Review",
      reportTypeId: internalAudit.id,
      publicationDate: new Date("2026-08-10"),
      createdBy: analyst.id,
      updatedBy: analyst.id,
    },
  });

  const recommendation = await prisma.recommendation.upsert({
    where: { id: "seed-rec-001" },
    update: {},
    create: {
      id: "seed-rec-001",
      reportId: report.id,
      recommendationNumber: "REC-2026-001",
      description: "Implement purchase order three-way matching for all critical vendors.",
      expectedDeliverable: "Approved SOP and evidence of matched transactions for two periods.",
      actionOwnerId: actionOwner.id,
      internalAuditResponsibleId: analyst.id,
      legalEntityId: legalEntity.id,
      siteId: hq.id,
      departmentId: operations.id,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10),
      notificationEnabled: true,
      notificationIntervalDays: 7,
      statusId: openStatus.id,
      createdBy: analyst.id,
      updatedBy: analyst.id,
    },
  });

  await prisma.followUpUpdate.create({
    data: {
      recommendationId: recommendation.id,
      progressComment: "Implementation plan drafted and aligned with procurement team.",
      statusSnapshot: progressStatus.label,
      submittedBy: actionOwner.id,
    },
  });

  await prisma.notificationSetting.upsert({
    where: { channel: "EMAIL" },
    update: {},
    create: { channel: "EMAIL", enabled: false, upcomingDaysBeforeDue: 7, overdueReminderDays: 7, periodicReminderDays: 7 },
  });

  await prisma.notificationSetting.upsert({
    where: { channel: "IN_APP" },
    update: {},
    create: { channel: "IN_APP", enabled: true, upcomingDaysBeforeDue: 7, overdueReminderDays: 7, periodicReminderDays: 7 },
  });

  console.log("Seed completed.");
  console.log("Default password for demo users: Password123!");
  console.log("Suggested login: analyst@bgi-audit.local");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
