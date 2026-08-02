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
import { User } from '../auth/decorators/user.decorator';
import { ProfileType } from 'prisma/src/generated/prisma/enums';
import { TokenPayload } from '../auth/auth.types';

@Controller('schedule/timetable')
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Roles(ProfileType.Owner, ProfileType.Registrar)
  @Post('generate')
  generate(@Body() dto: GenerateTimetableDto) {
    return this.timetableService.generate(dto);
  }

  @Roles(
    ProfileType.Owner,
    ProfileType.Registrar,
    ProfileType.Teacher,
  )
  @Get()
  findAll(
    @Query('sectionId') sectionId?: string,
    @Query('year') year?: string,
    @User() user?: TokenPayload,
  ) {
    return this.timetableService.findAll({ sectionId, year }, user);
  }

  @Roles(
    ProfileType.Owner,
    ProfileType.Registrar,
    ProfileType.Teacher,
  )
  @Get('report/teacher-load')
  getTeacherLoad(
    @Query('sectionId') sectionId: string,
    @Query('year') year: string,
    @User() user?: TokenPayload,
  ) {
    return this.timetableService.getTeacherLoad(sectionId, year, user);
  }

  @Roles(
    ProfileType.Owner,
    ProfileType.Registrar,
    ProfileType.Teacher,
  )
  @Get(':id')
  findOne(@Param('id') id: string, @User() user?: TokenPayload) {
    return this.timetableService.findOne(id, user);
  }

  @Roles(ProfileType.Owner, ProfileType.Registrar)
  @Post(':id/activate')
  activate(@Param('id') id: string) {
    return this.timetableService.activate(id);
  }

  @Roles(ProfileType.Owner, ProfileType.Registrar)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.timetableService.remove(id);
  }
}
