import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({ example: 'Axis International School' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'A private K-12 school in Addis Ababa' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    example: { address: 'Bole Subcity', phone: '+251911223344' },
  })
  @IsOptional()
  @IsObject()
  details?: Record<string, unknown>;
}
