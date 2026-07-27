import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { StudentService } from './student.service';
import { CreateStudentDto } from './dtos/create-student.dto';
import { UpdateStudentDto } from './dtos/update-student.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../auth/decorators/user.decorator';
import { ProfileType } from 'prisma/src/generated/prisma/enums';

@Roles(ProfileType.Owner, ProfileType.Registrar)
@Controller('registration/student')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Post()
  create(@Body() dto: CreateStudentDto, @User('tenantId') tenantId: string) {
    return this.studentService.create(dto, tenantId);
  }

  @Get()
  findAll(@User('tenantId') tenantId: string) {
    return this.studentService.findAll(tenantId);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @User('tenantId') tenantId: string,
  ) {
    return this.studentService.findOne(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
    @User('tenantId') tenantId: string,
  ) {
    return this.studentService.update(id, dto, tenantId);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @User('tenantId') tenantId: string,
  ) {
    return this.studentService.remove(id, tenantId);
  }
}
