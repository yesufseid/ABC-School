import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { AttendanceStatus } from 'prisma/src/generated/prisma/enums';

export class AttendanceEntryDto {
  @ApiProperty({ example: 'student-uuid' })
  @IsUUID()
  studentId: string;

  @ApiProperty({ enum: AttendanceStatus })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiPropertyOptional({ example: 'Sick - fever' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class TakeAttendanceDto {
  @ApiProperty({ example: 'section-uuid' })
  @IsUUID()
  @IsNotEmpty()
  sectionId: string;

  @ApiProperty({ example: '2026-07-30' })
  @IsDateString()
  date: string;

  @ApiProperty({ type: [AttendanceEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries: AttendanceEntryDto[];
}
