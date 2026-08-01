import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { BranchService } from './branch.service';
import { CreateBranchDto } from './dtos/create-branch.dto';
import { UpdateBranchDto } from './dtos/update-branch.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProfileType } from 'prisma/src/generated/prisma/enums';

@Controller('tenant/:tenantId/branches')
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Roles(ProfileType.Admin)
  @Post()
  create(@Param('tenantId') tenantId: string, @Body() dto: CreateBranchDto) {
    return this.branchService.create(tenantId, dto);
  }

  @Roles(ProfileType.Admin, ProfileType.Owner)
  @Get()
  findAll(@Param('tenantId') tenantId: string) {
    return this.branchService.findAll(tenantId);
  }

  @Roles(ProfileType.Admin, ProfileType.Owner)
  @Get(':id')
  findOne(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.branchService.findOne(tenantId, id);
  }

  @Roles(ProfileType.Admin)
  @Patch(':id')
  update(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branchService.update(tenantId, id, dto);
  }

  @Roles(ProfileType.Admin)
  @Delete(':id')
  remove(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.branchService.remove(tenantId, id);
  }
}
