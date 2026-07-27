import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';
import { Sex, Position, Department } from 'prisma/src/generated/prisma/enums';

export class CreateStaffDto {
  @ApiProperty({ example: '+251912345678' })
  @IsPhoneNumber()
  phoneNumber: string;

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

  @ApiProperty({ example: '2025-09-01' })
  @IsDateString()
  startingDate: string;

  @ApiProperty({ enum: Position })
  @IsEnum(Position)
  @IsNotEmpty()
  position: Position;

  @ApiPropertyOptional({ enum: Department })
  @IsOptional()
  @IsEnum(Department)
  department?: Department;
}
