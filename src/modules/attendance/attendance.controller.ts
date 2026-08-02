import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { TakeAttendanceDto, AttendanceEntryDto } from './dtos/take-attendance.dto';
import { CorrectAttendanceDto } from './dtos/correct-attendance.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../auth/decorators/user.decorator';
import { ProfileType } from 'prisma/src/generated/prisma/enums';
import { TokenPayload } from '../auth/auth.types';

@Controller('attendance/students')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Roles(
    ProfileType.Teacher,
    ProfileType.Principal,
    ProfileType.VicePrincipal,
    ProfileType.Registrar,
  )
  @Post()
  take(@Body() dto: TakeAttendanceDto, @User() user: TokenPayload) {
    return this.attendanceService.take(dto, user);
  }

  @Roles(
    ProfileType.Teacher,
    ProfileType.Principal,
    ProfileType.VicePrincipal,
    ProfileType.Registrar,
    ProfileType.Owner,
  )
  @Get('section/:sectionId/date/:date')
  getSectionSheet(
    @Param('sectionId') sectionId: string,
    @Param('date') date: string,
    @User() user: TokenPayload,
  ) {
    return this.attendanceService.getSectionSheet(sectionId, date, user);
  }

  @Roles(
    ProfileType.Teacher,
    ProfileType.Principal,
    ProfileType.VicePrincipal,
    ProfileType.Registrar,
    ProfileType.Owner,
    ProfileType.Parent,
  )
  @Get('history/:studentId')
  getHistory(
    @Param('studentId') studentId: string,
    @Query('year') year?: string,
  ) {
    return this.attendanceService.getHistory(studentId, year);
  }

  @Roles(ProfileType.Principal, ProfileType.VicePrincipal, ProfileType.Owner)
  @Get('statistics')
  getStatistics(
    @Query('branchId') branchId?: string,
    @Query('gradeId') gradeId?: string,
    @Query('sectionId') sectionId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.attendanceService.getStatistics({
      branchId,
      gradeId,
      sectionId,
      dateFrom,
      dateTo,
    });
  }

  @Roles(
    ProfileType.Teacher,
    ProfileType.Principal,
    ProfileType.VicePrincipal,
    ProfileType.Registrar,
  )
  @Patch(':id')
  directEdit(
    @Param('id') id: string,
    @Body() dto: AttendanceEntryDto,
    @User() user: TokenPayload,
  ) {
    return this.attendanceService.directEdit(
      id,
      { status: dto.status, note: dto.note },
      user,
    );
  }

  @Roles(
    ProfileType.Teacher,
    ProfileType.Principal,
    ProfileType.VicePrincipal,
    ProfileType.Owner,
  )
  @Post(':id/correct')
  correct(
    @Param('id') id: string,
    @Body() dto: CorrectAttendanceDto,
    @User() user: TokenPayload,
  ) {
    return this.attendanceService.correct(id, dto, user);
  }
}
