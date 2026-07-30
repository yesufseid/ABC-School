import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { PrincipalService } from './principal.service';
import { CreatePrincipalDto } from './dtos/create-principal.dto';
import { UpdatePrincipalDto } from './dtos/update-principal.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProfileType } from 'prisma/src/generated/prisma/enums';

@Controller('principal')
export class PrincipalController {
  constructor(private readonly principalService: PrincipalService) {}

  @Roles(ProfileType.Owner)
  @Post()
  create(@Body() dto: CreatePrincipalDto) {
    return this.principalService.create(dto);
  }

  @Roles(ProfileType.Owner, ProfileType.Principal)
  @Get()
  findAll() {
    return this.principalService.findAll();
  }

  @Roles(ProfileType.Owner, ProfileType.Principal)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.principalService.findOne(id);
  }

  @Roles(ProfileType.Owner)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePrincipalDto) {
    return this.principalService.update(id, dto);
  }

  @Roles(ProfileType.Owner)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.principalService.remove(id);
  }
}
