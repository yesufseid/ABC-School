import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Relationship } from 'prisma/src/generated/prisma/enums';

export class ParentLinkDto {
  @ApiProperty({ example: '+251911223344' })
  @IsPhoneNumber()
  phoneNumber: string;

  @ApiPropertyOptional({ example: 'Girma Beyene' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Male' })
  @IsString()
  @IsOptional()
  sex?: string;

  @ApiPropertyOptional({ example: 'Addis Ababa' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'Ethiopian' })
  @IsString()
  @IsOptional()
  nationality?: string;

  @ApiProperty({ example: 'FATHER', enum: Relationship })
  @IsEnum(Relationship)
  relationship: Relationship;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

export class CreateStudentDto {
  @ApiProperty({ example: 'Abebe' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Kebede' })
  @IsString()
  @IsNotEmpty()
  middleName: string;

  @ApiProperty({ example: 'Kebede' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '2024-09-01' })
  @IsDateString()
  admissionDate: string;

  @ApiProperty({ example: '2024-09-01' })
  @IsDateString()
  enrollmentDate: string;

  @ApiProperty({ example: 'Grade 1' })
  @IsString()
  @IsNotEmpty()
  gradeOfInterest: string;

  @ApiProperty({ example: 'Male' })
  @IsString()
  @IsNotEmpty()
  sex: string;

  @ApiProperty({ example: 'Addis Ababa' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Ethiopian' })
  @IsString()
  @IsNotEmpty()
  nationality: string;

  @ApiProperty({ example: 'Sunshine Elementary' })
  @IsString()
  @IsNotEmpty()
  previousSchool: string;

  @ApiProperty({ example: 'English' })
  @IsString()
  @IsNotEmpty()
  languagePreference: string;

  @ApiPropertyOptional({ example: '+251911223344' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ type: [ParentLinkDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParentLinkDto)
  @IsOptional()
  parents?: ParentLinkDto[];
}
