import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';
import { Sex, Position, Department } from 'prisma/src/generated/prisma/enums';

export class UpdateStaffDto {
  @ApiPropertyOptional({ example: '+251912345678' })
  @IsOptional()
  @IsPhoneNumber()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'Abebe' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Kebede' })
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiPropertyOptional({ example: 'Lemma' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: 'abebe@school.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Bole Subcity, Addis Ababa' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ enum: Sex })
  @IsOptional()
  @IsEnum(Sex)
  sex?: Sex;

  @ApiPropertyOptional({ example: '2025-09-01' })
  @IsOptional()
  @IsDateString()
  startingDate?: string;

  @ApiPropertyOptional({ enum: Position })
  @IsOptional()
  @IsEnum(Position)
  position?: Position;

  @ApiPropertyOptional({ enum: Department })
  @IsOptional()
  @IsEnum(Department)
  department?: Department;
}
