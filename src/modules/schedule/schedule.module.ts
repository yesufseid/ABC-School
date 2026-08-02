import { Module } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { TimetableService } from './timetable.service';
import { CalendarController } from './calendar.controller';
import { TimetableController } from './timetable.controller';
import { TeacherModule } from '../teacher/teacher.module';

@Module({
  imports: [TeacherModule],
  controllers: [CalendarController, TimetableController],
  providers: [CalendarService, TimetableService],
})
export class ScheduleModule {}
