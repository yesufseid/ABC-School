import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Sex } from 'prisma/src/generated/prisma/enums';

export class TeacherGradeLinkDto {
  @ApiProperty({ example: 'grade-uuid' })
  @IsUUID()
  gradeId: string;

  @ApiProperty({ example: ['subject-uuid-1', 'subject-uuid-2'] })
  @IsArray()
  @IsUUID(undefined, { each: true })
  subjectIds: string[];
}

export class CreateTeacherDto {
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

  @ApiProperty({ example: 24 })
  @IsInt()
  @Min(1)
  weeklyPeriods: number;

  @ApiProperty({ type: [TeacherGradeLinkDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeacherGradeLinkDto)
  grades: TeacherGradeLinkDto[];
}
