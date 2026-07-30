import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { NoDuplicates } from '../../../common/decorators/no-duplicates.decorator';
import { CreateBranchDto } from './create-branch.dto';

export class CreateTenantDto {
  @ApiProperty({ example: '+251912345678' })
  @IsPhoneNumber()
  ownerPhone: string;

  @ApiProperty({ example: 'Girma Beyene' })
  @IsString()
  @IsNotEmpty()
  ownerName: string;

  @ApiProperty({ example: 'girma123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Axis International School' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'ADC' })
  @IsString()
  @IsNotEmpty()
  branchCode: string;

  @ApiProperty({ example: 'A private K-12 school in Addis Ababa' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    example: { address: 'Bole Subcity', phone: '+251911223344' },
  })
  @IsObject()
  details: Record<string, string | number | boolean>;

  @ApiPropertyOptional({ type: [CreateBranchDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBranchDto)
  @NoDuplicates('branchCode', {
    message: 'Duplicate branch codes provided',
  })
  @NoDuplicates('branchPrefix', {
    message: 'Duplicate branch prefixes provided',
  })
  branches?: CreateBranchDto[];
}
