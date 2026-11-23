import { Module } from '@nestjs/common';
import { ArchiveController } from './archive.controller.js';
import { PrismaService } from '../common/prisma.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [ArchiveController],
  providers: [PrismaService],
})
export class ArchiveModule {}
