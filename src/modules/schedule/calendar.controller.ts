import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CreateEventDto } from './dtos/create-event.dto';
import { UpdateEventDto } from './dtos/update-event.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProfileType } from 'prisma/src/generated/prisma/enums';

@Controller('schedule/calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Roles(ProfileType.Owner, ProfileType.Registrar, ProfileType.Registral)
  @Post()
  create(@Body() dto: CreateEventDto) {
    return this.calendarService.create(dto);
  }

  @Roles(
    ProfileType.Owner,
    ProfileType.Registrar,
    ProfileType.Registral,
    ProfileType.Teacher,
  )
  @Get()
  findAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('category') category?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.calendarService.findAll({ startDate, endDate, category, branchId });
  }

  @Roles(
    ProfileType.Owner,
    ProfileType.Registrar,
    ProfileType.Registral,
    ProfileType.Teacher,
  )
  @Get('report/upcoming')
  getUpcoming() {
    return this.calendarService.getUpcoming();
  }

  @Roles(
    ProfileType.Owner,
    ProfileType.Registrar,
    ProfileType.Registral,
    ProfileType.Teacher,
  )
  @Get('report/by-category')
  getByCategory() {
    return this.calendarService.getByCategory();
  }

  @Roles(
    ProfileType.Owner,
    ProfileType.Registrar,
    ProfileType.Registral,
    ProfileType.Teacher,
  )
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.calendarService.findOne(id);
  }

  @Roles(ProfileType.Owner, ProfileType.Registrar, ProfileType.Registral)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.calendarService.update(id, dto);
  }

  @Roles(ProfileType.Owner, ProfileType.Registrar, ProfileType.Registral)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.calendarService.remove(id);
  }
}
