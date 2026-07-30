import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { StaffAttendanceService } from './staff-attendance.service';
import { AttendanceController } from './attendance.controller';
import { StaffAttendanceController } from './staff-attendance.controller';

@Module({
  controllers: [AttendanceController, StaffAttendanceController],
  providers: [AttendanceService, StaffAttendanceService],
})
export class AttendanceModule {}
