import { Module } from '@nestjs/common';
import { AcademicsService } from './academics.service';
import { RosterService } from './roster.service';
import { GradingService } from './grading.service';
import { AuditService } from './audit.service';
import { AcademicsController } from './academics.controller';

@Module({
  controllers: [AcademicsController],
  providers: [
    AcademicsService,
    RosterService,
    GradingService,
    AuditService,
  ],
})
export class AcademicsModule {}
