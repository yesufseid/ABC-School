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
import { RegistrationService } from './registration.service';
import { CreateStudentDto } from './dtos/create-student.dto';
import { ReAdmitDto } from './dtos/re-admit.dto';
import { UpdateStudentDto } from './dtos/update-student.dto';
import { SearchParentDto } from './dtos/search-parent.dto';
import { CreateSectionDto } from './dtos/create-section.dto';
import { UpdateSectionDto } from './dtos/update-section.dto';
import { AssignSectionDto } from './dtos/assign-section.dto';
import { AutoAssignSectionDto } from './dtos/auto-assign-section.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../auth/decorators/user.decorator';
import { ProfileType } from 'prisma/src/generated/prisma/enums';

@Roles(ProfileType.Owner, ProfileType.Registrar)
@Controller('registration')
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Post('student')
  create(@Body() dto: CreateStudentDto, @User('tenantId') tenantId: string) {
    return this.registrationService.create(dto, tenantId);
  }

  @Get('student')
  findAll(@User('tenantId') tenantId: string) {
    return this.registrationService.findAll(tenantId);
  }

  @Get('student/search')
  search(
    @Query('q') query: string,
    @User('tenantId') tenantId: string,
  ) {
    return this.registrationService.search(query, tenantId);
  }

  @Get('student/:id')
  findOne(
    @Param('id') id: string,
    @User('tenantId') tenantId: string,
  ) {
    return this.registrationService.findOne(id, tenantId);
  }

  @Get('student/:id/confirmation')
  confirmation(
    @Param('id') id: string,
    @User('tenantId') tenantId: string,
  ) {
    return this.registrationService.getConfirmation(id, tenantId);
  }

  @Patch('student/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
    @User('tenantId') tenantId: string,
  ) {
    return this.registrationService.update(id, dto, tenantId);
  }

  @Patch('student/:id/re-admit')
  reAdmit(
    @Param('id') id: string,
    @Body() dto: ReAdmitDto,
    @User('tenantId') tenantId: string,
  ) {
    return this.registrationService.reAdmit(id, dto, tenantId);
  }

  @Delete('student/:id')
  remove(
    @Param('id') id: string,
    @User('tenantId') tenantId: string,
  ) {
    return this.registrationService.remove(id, tenantId);
  }

  @Get('parent/search')
  searchParents(
    @Query() query: SearchParentDto,
    @User('tenantId') tenantId: string,
  ) {
    return this.registrationService.searchParents(
      query.phone,
      query.name,
      tenantId,
    );
  }

  // --- Section endpoints ---

  @Roles(ProfileType.Owner, ProfileType.Registrar)
  @Post('sections')
  createSection(
    @Body() dto: CreateSectionDto,
    @User('tenantId') tenantId: string,
  ) {
    return this.registrationService.createSection(dto, tenantId);
  }

  @Roles(ProfileType.Owner, ProfileType.Registrar, ProfileType.Teacher)
  @Get('sections')
  findAllSections(
    @Query('gradeId') gradeId: string | undefined,
    @Query('branchId') branchId: string | undefined,
    @Query('year') year: string | undefined,
    @User('tenantId') tenantId: string,
  ) {
    return this.registrationService.findAllSections(gradeId, branchId, year, tenantId);
  }

  @Roles(ProfileType.Owner, ProfileType.Registrar, ProfileType.Teacher)
  @Get('sections/:id')
  findOneSection(
    @Param('id') id: string,
    @User('tenantId') tenantId: string,
  ) {
    return this.registrationService.findOneSection(id, tenantId);
  }

  @Roles(ProfileType.Owner, ProfileType.Registrar, ProfileType.Teacher)
  @Get('sections/:id/students')
  listSectionStudents(
    @Param('id') id: string,
    @User('tenantId') tenantId: string,
  ) {
    return this.registrationService.listSectionStudents(id, tenantId);
  }

  @Roles(ProfileType.Owner, ProfileType.Registrar)
  @Patch('sections/:id')
  updateSection(
    @Param('id') id: string,
    @Body() dto: UpdateSectionDto,
    @User('tenantId') tenantId: string,
  ) {
    return this.registrationService.updateSection(id, dto, tenantId);
  }

  @Roles(ProfileType.Owner, ProfileType.Registrar)
  @Delete('sections/:id')
  removeSection(
    @Param('id') id: string,
    @User('tenantId') tenantId: string,
  ) {
    return this.registrationService.removeSection(id, tenantId);
  }

  @Roles(ProfileType.Owner, ProfileType.Registrar)
  @Post('sections/assign')
  assignStudents(
    @Body() dto: AssignSectionDto,
    @User('tenantId') tenantId: string,
  ) {
    return this.registrationService.assignStudents(dto, tenantId);
  }

  @Roles(ProfileType.Owner, ProfileType.Registrar)
  @Post('sections/auto-assign')
  autoAssignPreview(
    @Body() dto: AutoAssignSectionDto,
    @User('tenantId') tenantId: string,
  ) {
    return this.registrationService.autoAssignPreview(dto, tenantId);
  }

  @Roles(ProfileType.Owner, ProfileType.Registrar)
  @Post('sections/auto-assign/confirm')
  confirmAutoAssign(
    @Body() plan: { sectionId: string; studentIds: string[] }[],
    @User('tenantId') tenantId: string,
  ) {
    return this.registrationService.confirmAutoAssign(plan, tenantId);
  }
}
