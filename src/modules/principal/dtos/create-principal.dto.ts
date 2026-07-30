import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
} from 'class-validator';
import { Sex } from 'prisma/src/generated/prisma/enums';

export class CreatePrincipalDto {
  @ApiProperty({ example: 'branch-uuid' })
  @IsUUID()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({ example: 'Abebe' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiPropertyOptional({ example: 'Kebede' })
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiProperty({ example: 'Lemma' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '+251911223344' })
  @IsPhoneNumber()
  phone: string;

  @ApiPropertyOptional({ example: 'abebe@school.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'Bole Subcity, Addis Ababa' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ enum: Sex })
  @IsEnum(Sex)
  sex: Sex;

  @ApiProperty({ example: '2026-09-01' })
  @IsDateString()
  startingDate: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isVicePrincipal?: boolean;
}
