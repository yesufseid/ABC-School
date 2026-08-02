import { Module } from '@nestjs/common';
import { AcademicsService } from './academics.service';
import { RosterService } from './roster.service';
import { GradingService } from './grading.service';
import { AuditService } from './audit.service';
import { AcademicCalendarService } from './academic-calendar.service';
import { AcademicsController } from './academics.controller';
import { AcademicCalendarController } from './academic-calendar.controller';
import { TeacherModule } from '../teacher/teacher.module';

@Module({
  imports: [TeacherModule],
  controllers: [AcademicsController, AcademicCalendarController],
  providers: [
    AcademicsService,
    RosterService,
    GradingService,
    AuditService,
    AcademicCalendarService,
  ],
})
export class AcademicsModule {}
