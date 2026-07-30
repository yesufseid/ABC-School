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
import { ProfileType } from 'prisma/src/generated/prisma/enums';

@Controller('teacher')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Roles(ProfileType.Owner, ProfileType.Registrar, ProfileType.Registral)
  @Post('grades')
  createGrade(@Body() dto: CreateGradeDto) {
    return this.teacherService.createGrade(dto);
  }

  @Roles(ProfileType.Owner, ProfileType.Registrar, ProfileType.Registral, ProfileType.Teacher)
  @Get('grades')
  findAllGrades() {
    return this.teacherService.findAllGrades();
  }

  @Roles(ProfileType.Owner, ProfileType.Registrar, ProfileType.Registral, ProfileType.Teacher)
  @Get('grades/:id')
  findOneGrade(@Param('id') id: string) {
    return this.teacherService.findOneGrade(id);
  }

  @Roles(ProfileType.Owner, ProfileType.Registrar, ProfileType.Registral)
  @Patch('grades/:id')
  updateGrade(@Param('id') id: string, @Body() dto: UpdateGradeDto) {
    return this.teacherService.updateGrade(id, dto);
  }

  @Roles(ProfileType.Owner, ProfileType.Registrar, ProfileType.Registral)
  @Delete('grades/:id')
  removeGrade(@Param('id') id: string) {
    return this.teacherService.removeGrade(id);
  }

  @Roles(ProfileType.Owner, ProfileType.Registrar, ProfileType.Registral)
  @Post()
  create(@Body() dto: CreateTeacherDto) {
    return this.teacherService.create(dto);
  }

  @Roles(ProfileType.Owner, ProfileType.Registrar, ProfileType.Registral, ProfileType.Teacher)
  @Get()
  findAll() {
    return this.teacherService.findAll();
  }

  @Roles(ProfileType.Owner, ProfileType.Registrar, ProfileType.Registral, ProfileType.Teacher)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teacherService.findOne(id);
  }

  @Roles(ProfileType.Owner, ProfileType.Registrar, ProfileType.Registral)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTeacherDto) {
    return this.teacherService.update(id, dto);
  }

  @Roles(ProfileType.Owner, ProfileType.Registrar, ProfileType.Registral)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.teacherService.remove(id);
  }
}
