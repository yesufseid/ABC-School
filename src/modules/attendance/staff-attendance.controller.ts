import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { StaffAttendanceService } from './staff-attendance.service';
import { CheckInDto } from './dtos/check-in.dto';
import { CheckOutDto } from './dtos/check-out.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProfileType, AttendanceStatus } from 'prisma/src/generated/prisma/enums';
import { TokenPayload } from '../auth/auth.types';

@Controller('attendance/staff')
export class StaffAttendanceController {
  constructor(
    private readonly staffAttendanceService: StaffAttendanceService,
  ) {}

  @Roles(ProfileType.Teacher, ProfileType.Staff)
  @Post('check-in')
  checkIn(@Body() dto: CheckInDto, @Req() req: { user: TokenPayload }) {
    return this.staffAttendanceService.checkIn(dto, req.user.profileId!);
  }

  @Roles(ProfileType.Teacher, ProfileType.Staff)
  @Post('check-out')
  checkOut(@Body() dto: CheckOutDto, @Req() req: { user: TokenPayload }) {
    return this.staffAttendanceService.checkOut(dto, req.user.profileId!);
  }

  @Roles(
    ProfileType.HR,
    ProfileType.Principal,
    ProfileType.VicePrincipal,
    ProfileType.Owner,
  )
  @Get()
  findAll(
    @Query('branchId') branchId?: string,
    @Query('profileId') profileId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.staffAttendanceService.findAll({
      branchId,
      profileId,
      dateFrom,
      dateTo,
    });
  }

  @Roles(
    ProfileType.HR,
    ProfileType.Principal,
    ProfileType.VicePrincipal,
    ProfileType.Owner,
  )
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.staffAttendanceService.findOne(id);
  }

  @Roles(ProfileType.HR, ProfileType.Principal, ProfileType.Owner)
  @Post(':id/correct')
  correct(
    @Param('id') id: string,
    @Body()
    dto: {
      newStatus: AttendanceStatus;
      reason: string;
      approvedBy?: string;
    },
    @Req() req: { user: TokenPayload },
  ) {
    return this.staffAttendanceService.correct(id, dto, req.user.profileId!);
  }

  @Roles(ProfileType.HR, ProfileType.Owner)
  @Get('payroll/:branchId')
  getPayrollSummary(
    @Param('branchId') branchId: string,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
  ) {
    return this.staffAttendanceService.getPayrollSummary(
      branchId,
      periodStart,
      periodEnd,
    );
  }
}
