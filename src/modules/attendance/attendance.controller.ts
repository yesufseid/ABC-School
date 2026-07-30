import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { TakeAttendanceDto, AttendanceEntryDto } from './dtos/take-attendance.dto';
import { CorrectAttendanceDto } from './dtos/correct-attendance.dto';
import { Roles } from '../auth/decorators/roles.decorator';
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
    ProfileType.Registral,
  )
  @Post()
  take(@Body() dto: TakeAttendanceDto, @Req() req: { user: TokenPayload }) {
    return this.attendanceService.take(dto, req.user.profileId!);
  }

  @Roles(
    ProfileType.Teacher,
    ProfileType.Principal,
    ProfileType.VicePrincipal,
    ProfileType.Registrar,
    ProfileType.Owner,
    ProfileType.Registral,
  )
  @Get('section/:sectionId/date/:date')
  getSectionSheet(
    @Param('sectionId') sectionId: string,
    @Param('date') date: string,
  ) {
    return this.attendanceService.getSectionSheet(sectionId, date);
  }

  @Roles(
    ProfileType.Teacher,
    ProfileType.Principal,
    ProfileType.VicePrincipal,
    ProfileType.Registrar,
    ProfileType.Owner,
    ProfileType.Parent,
    ProfileType.Registral,
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
    @Req() req: { user: TokenPayload },
  ) {
    return this.attendanceService.directEdit(
      id,
      { status: dto.status, note: dto.note },
      req.user.profileId!,
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
    @Req() req: { user: TokenPayload },
  ) {
    return this.attendanceService.correct(id, dto, req.user.profileId!);
  }
}
