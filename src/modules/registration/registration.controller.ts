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
}
