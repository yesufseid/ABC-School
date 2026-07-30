import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { CalendarEventCategory } from 'prisma/src/generated/prisma/enums';

export class CreateEventDto {
  @ApiProperty({ example: 'Mid-term Exam' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ enum: CalendarEventCategory })
  @IsEnum(CalendarEventCategory)
  category: CalendarEventCategory;

  @ApiPropertyOptional({ example: 'Schedule for mid-term examinations' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '2026-10-15' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-10-20' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: ['branch-uuid-1', 'branch-uuid-2'] })
  @IsArray()
  @IsUUID(undefined, { each: true })
  branchIds: string[];
}
