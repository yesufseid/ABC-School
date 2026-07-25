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
import { CreateTenantDto } from './dtos/create-tenant.dto';
import { UpdateTenantDto } from './dtos/update-tenant.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProfileType } from 'prisma/src/generated/prisma/enums';
import { SubscribeTenantDto } from './dtos/subscribe-tenant.dto';

@Roles(ProfileType.Admin)
@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  create(@Body() dto: CreateTenantDto) {
    return this.tenantService.create(dto);
  }

  @Post('subscribe')
  subscribeTenant(@Body() subscribeTenantDto: SubscribeTenantDto) {
    return this.tenantService.subscribeTenant(subscribeTenantDto);
  }

  @Get()
  findAll() {
    return this.tenantService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantService.update(id, dto);
  }

  @Delete('subscribe/:id')
  removeTenantSubscription(@Param('id') id: string) {
    return this.tenantService.removeTenantSubscription(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tenantService.remove(id);
  }
}
