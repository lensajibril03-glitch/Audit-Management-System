import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { FollowUpModule } from './follow-up/follow-up.module.js';
import { ArchiveModule } from './archive/archive.module.js';
import { AdminModule } from './admin/admin.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';

@Module({
  imports: [AuthModule, ReportsModule, FollowUpModule, ArchiveModule, AdminModule, DashboardModule],
})
export class AppModule {}
