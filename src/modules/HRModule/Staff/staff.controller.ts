import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { User } from '../../auth/decorators/user.decorator';
import { ProfileType } from 'prisma/src/generated/prisma/enums';
import { TokenPayload } from 'src/modules/auth/auth.types';
import { CreateStaffDto } from './dtos/create-staff.dto';
import { UpdateStaffDto } from './dtos/update-staff.dto';

@Roles(ProfileType.Admin, ProfileType.Owner)
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  create(@Body() dto: CreateStaffDto, @User() user: TokenPayload) {
    return this.staffService.create(dto, user);
  }

  @Get()
  findAll(@User() user: TokenPayload) {
    return this.staffService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @User() user: TokenPayload) {
    return this.staffService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
    @User() user: TokenPayload,
  ) {
    return this.staffService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @User() user: TokenPayload) {
    return this.staffService.remove(id, user);
  }
}
