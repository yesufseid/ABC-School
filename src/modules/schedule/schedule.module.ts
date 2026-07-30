import { Module } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { TimetableService } from './timetable.service';
import { CalendarController } from './calendar.controller';
import { TimetableController } from './timetable.controller';

@Module({
  controllers: [CalendarController, TimetableController],
  providers: [CalendarService, TimetableService],
})
export class ScheduleModule {}
