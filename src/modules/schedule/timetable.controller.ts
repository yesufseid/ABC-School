import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { TimetableService } from './timetable.service';
import { GenerateTimetableDto } from './dtos/generate-timetable.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProfileType } from 'prisma/src/generated/prisma/enums';

@Controller('schedule/timetable')
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Roles(ProfileType.Owner, ProfileType.Registrar, ProfileType.Registral)
  @Post('generate')
  generate(@Body() dto: GenerateTimetableDto) {
    return this.timetableService.generate(dto);
  }

  @Roles(
    ProfileType.Owner,
    ProfileType.Registrar,
    ProfileType.Registral,
    ProfileType.Teacher,
  )
  @Get()
  findAll(
    @Query('sectionId') sectionId?: string,
    @Query('year') year?: string,
  ) {
    return this.timetableService.findAll({ sectionId, year });
  }

  @Roles(
    ProfileType.Owner,
    ProfileType.Registrar,
    ProfileType.Registral,
    ProfileType.Teacher,
  )
  @Get('report/teacher-load')
  getTeacherLoad(
    @Query('sectionId') sectionId: string,
    @Query('year') year: string,
  ) {
    return this.timetableService.getTeacherLoad(sectionId, year);
  }

  @Roles(
    ProfileType.Owner,
    ProfileType.Registrar,
    ProfileType.Registral,
    ProfileType.Teacher,
  )
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.timetableService.findOne(id);
  }

  @Roles(ProfileType.Owner, ProfileType.Registrar, ProfileType.Registral)
  @Post(':id/activate')
  activate(@Param('id') id: string) {
    return this.timetableService.activate(id);
  }

  @Roles(ProfileType.Owner, ProfileType.Registrar, ProfileType.Registral)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.timetableService.remove(id);
  }
}
