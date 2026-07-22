import { OmitType } from '@nestjs/swagger';
import { CreateTenantDto } from './create-tenant.dto';

export class UpdateTenantDto extends OmitType(CreateTenantDto, ['password']) {}
