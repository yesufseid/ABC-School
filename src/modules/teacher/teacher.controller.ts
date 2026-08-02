import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { CreateTeacherDto } from './dtos/create-teacher.dto';
import { UpdateTeacherDto } from './dtos/update-teacher.dto';
import { CreateGradeDto } from './dtos/create-grade.dto';
import { UpdateGradeDto } from './dtos/update-grade.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../auth/decorators/user.decorator';
import { ProfileType } from 'prisma/src/generated/prisma/enums';
import { TokenPayload } from '../auth/auth.types';

@Controller('teacher')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Roles(ProfileType.Owner, ProfileType.Registrar)
  @Post('grades')
  createGrade(@Body() dto: CreateGradeDto) {
    return this.teacherService.createGrade(dto);
  }

  @Roles(ProfileType.Owner, ProfileType.Registrar, ProfileType.Teacher)
  @Get('grades')
  findAllGrades() {
    return this.teacherService.findAllGrades();
  }

  @Roles(ProfileType.Owner, ProfileType.Registrar, ProfileType.Teacher)
  @Get('grades/:id')
  findOneGrade(@Param('id') id: string) {
    return this.teacherService.findOneGrade(id);
  }

  @Roles(ProfileType.Owner, ProfileType.Registrar)
  @Patch('grades/:id')
  updateGrade(@Param('id') id: string, @Body() dto: UpdateGradeDto) {
    return this.teacherService.updateGrade(id, dto);
  }

  @Roles(ProfileType.Owner, ProfileType.Registrar)
  @Delete('grades/:id')
  removeGrade(@Param('id') id: string) {
    return this.teacherService.removeGrade(id);
  }

  @Roles(ProfileType.Owner, ProfileType.Registrar)
  @Post()
  create(@Body() dto: CreateTeacherDto) {
    return this.teacherService.create(dto);
  }

  @Roles(ProfileType.Owner, ProfileType.Registrar, ProfileType.Teacher)
  @Get()
  findAll(@User() user: TokenPayload) {
    if (user.type === ProfileType.Teacher) {
      return this.teacherService.getMyScope(user);
    }
    return this.teacherService.findAll();
  }

  @Roles(ProfileType.Teacher)
  @Get('me')
  getMyProfile(@User() user: TokenPayload) {
    return this.teacherService.getMyScope(user);
  }

  @Roles(ProfileType.Teacher)
  @Get('me/sections')
  getMySections(@User() user: TokenPayload) {
    return this.teacherService.getMySections(user);
  }

  @Roles(ProfileType.Teacher)
  @Get('me/students')
  getMyStudents(@User() user: TokenPayload) {
    return this.teacherService.getMyStudents(user);
  }

  @Roles(ProfileType.Teacher)
  @Get('me/timetable')
  getMyTimetable(@User() user: TokenPayload) {
    return this.teacherService.getMyTimetable(user);
  }

  @Roles(ProfileType.Owner, ProfileType.Registrar, ProfileType.Teacher)
  @Get(':id')
  findOne(@Param('id') id: string, @User() user: TokenPayload) {
    if (user.type === ProfileType.Teacher) {
      return this.teacherService.findOne(id, user);
    }
    return this.teacherService.findOne(id);
  }

  @Roles(ProfileType.Owner, ProfileType.Registrar)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTeacherDto) {
    return this.teacherService.update(id, dto);
  }

  @Roles(ProfileType.Owner, ProfileType.Registrar)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.teacherService.remove(id);
  }
}
