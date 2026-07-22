import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { TenantService } from './tenant.service';
import { AssignOwnerDto } from './dtos/assign-owner.dto';
import { CreateTenantDto } from './dtos/create-tenant.dto';
import { UpdateTenantDto } from './dtos/update-tenant.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Roles('Admin')
  @Post()
  create(@Body() dto: CreateTenantDto) {
    return this.tenantService.create(dto);
  }

  @Roles('Admin')
  @Post(':id/assign-owner')
  assignOwner(@Param('id') id: string, @Body() dto: AssignOwnerDto) {
    return this.tenantService.assignOwner(id, dto);
  }

  @Roles('Admin')
  @Get()
  findAll() {
    return this.tenantService.findAll();
  }

  @Roles('Admin')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantService.findOne(id);
  }

  @Roles('Admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantService.update(id, dto);
  }

  @Roles('Admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tenantService.remove(id);
  }
}
