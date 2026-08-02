import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { AcademicCalendarService } from './academic-calendar.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProfileType } from 'prisma/src/generated/prisma/enums';
import {
  CreateAcademicYearDto,
  UpdateAcademicYearDto,
  CreatePeriodDto,
  UpdatePeriodDto,
} from './dtos/academic-calendar.dto';

@Controller('academics/academic-calendar')
export class AcademicCalendarController {
  constructor(
    private readonly academicCalendarService: AcademicCalendarService,
  ) {}

  // ── Academic Years ──

  @Roles(ProfileType.Owner)
  @Post('years')
  createYear(@Body() dto: CreateAcademicYearDto) {
    return this.academicCalendarService.createYear(dto);
  }

  @Roles(ProfileType.Owner, ProfileType.Principal)
  @Get('years')
  findAllYears() {
    return this.academicCalendarService.findAllYears();
  }

  @Roles(ProfileType.Owner, ProfileType.Principal)
  @Get('years/current')
  getCurrentYear() {
    return this.academicCalendarService.getCurrentYear();
  }

  @Roles(ProfileType.Owner, ProfileType.Principal)
  @Get('years/:id')
  findOneYear(@Param('id') id: string) {
    return this.academicCalendarService.findOneYear(id);
  }

  @Roles(ProfileType.Owner)
  @Patch('years/:id')
  updateYear(@Param('id') id: string, @Body() dto: UpdateAcademicYearDto) {
    return this.academicCalendarService.updateYear(id, dto);
  }

  @Roles(ProfileType.Owner, ProfileType.Principal)
  @Post('years/:id/set-current')
  setCurrentYear(@Param('id') id: string) {
    return this.academicCalendarService.setCurrentYear(id);
  }

  @Roles(ProfileType.Owner)
  @Delete('years/:id')
  removeYear(@Param('id') id: string) {
    return this.academicCalendarService.removeYear(id);
  }

  // ── Periods ──

  @Roles(ProfileType.Owner)
  @Post('years/:id/periods')
  createPeriod(@Param('id') yearId: string, @Body() dto: CreatePeriodDto) {
    return this.academicCalendarService.createPeriod(yearId, dto);
  }

  @Roles(ProfileType.Owner)
  @Patch('periods/:id')
  updatePeriod(@Param('id') id: string, @Body() dto: UpdatePeriodDto) {
    return this.academicCalendarService.updatePeriod(id, dto);
  }

  @Roles(ProfileType.Owner)
  @Delete('periods/:id')
  removePeriod(@Param('id') id: string) {
    return this.academicCalendarService.removePeriod(id);
  }
}
