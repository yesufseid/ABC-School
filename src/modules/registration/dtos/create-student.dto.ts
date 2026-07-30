import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Sex, StudentParentRelation } from 'prisma/src/generated/prisma/enums';

export class ParentLinkDto {
  @ApiProperty({ example: '+251911223344' })
  @IsPhoneNumber()
  phoneNumber: string;

  @ApiProperty({ example: 'Girma Beyene' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Male', enum: Sex })
  @IsEnum(Sex)
  sex: Sex;

  @ApiProperty({ example: 'Addis Ababa' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Ethiopian' })
  @IsString()
  @IsNotEmpty()
  nationality: string;

  @ApiProperty({ example: 'Father', enum: StudentParentRelation })
  @IsEnum(StudentParentRelation)
  relation: StudentParentRelation;

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

  @ApiProperty({ example: '2015-05-15' })
  @IsDateString()
  dateOfBirth: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  startingGrade: number;

  @ApiProperty({ example: '2026-09-01' })
  @IsDateString()
  enrollmentDate: string;

  @ApiProperty({ example: '2026-09-01' })
  @IsDateString()
  admissionDate: string;

  @ApiProperty({ example: 'Male', enum: Sex })
  @IsEnum(Sex)
  sex: Sex;

  @ApiProperty({ example: 'Addis Ababa' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Ethiopian' })
  @IsString()
  @IsNotEmpty()
  nationality: string;

  @ApiPropertyOptional({ example: 'Sunshine Elementary' })
  @IsString()
  @IsOptional()
  previousSchool?: string;

  @ApiPropertyOptional({ example: 'English' })
  @IsString()
  @IsOptional()
  languagePreference?: string;

  @ApiPropertyOptional({ example: '+251911223344' })
  @IsPhoneNumber()
  @IsOptional()
  phone?: string;

  @ApiProperty({ type: [ParentLinkDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParentLinkDto)
  parents: ParentLinkDto[];
}
