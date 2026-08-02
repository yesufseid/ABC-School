import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import {
  AcademicCalendarType,
  AcademicPeriodType,
  AcademicYearStatus,
} from 'prisma/src/generated/prisma/enums';

export class CreateAcademicYearDto {
  @ApiProperty({ example: '2026/2027' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    enum: AcademicCalendarType,
    example: AcademicCalendarType.TERM,
  })
  @IsEnum(AcademicCalendarType)
  calendarType: AcademicCalendarType;

  @ApiProperty({ example: '2026-09-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2027-06-30' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ enum: AcademicYearStatus, default: 'ACTIVE' })
  @IsOptional()
  @IsEnum(AcademicYearStatus)
  status?: AcademicYearStatus;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}

export class UpdateAcademicYearDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ enum: AcademicCalendarType })
  @IsOptional()
  @IsEnum(AcademicCalendarType)
  calendarType?: AcademicCalendarType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: AcademicYearStatus })
  @IsOptional()
  @IsEnum(AcademicYearStatus)
  status?: AcademicYearStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}

export class CreatePeriodDto {
  @ApiProperty({ example: 'Term 3' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 3 })
  @IsNumber()
  @Min(1)
  @Max(10)
  sequence: number;

  @ApiProperty({ enum: AcademicPeriodType })
  @IsEnum(AcademicPeriodType)
  type: AcademicPeriodType;

  @ApiProperty({ example: '2026-03-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-04-30' })
  @IsDateString()
  endDate: string;
}

export class UpdatePeriodDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  sequence?: number;

  @ApiPropertyOptional({ enum: AcademicPeriodType })
  @IsOptional()
  @IsEnum(AcademicPeriodType)
  type?: AcademicPeriodType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class SetCurrentAcademicYearDto {
  @ApiProperty()
  @IsUUID()
  id: string;
}
