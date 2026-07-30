import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { AssessmentSlotType, GradeCycle } from 'prisma/src/generated/prisma/enums';

export class CreateAssessmentSlotDto {
  @ApiProperty({ example: 'Final Exam' })
  @IsString() @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: AssessmentSlotType })
  @IsEnum(AssessmentSlotType)
  slotType: AssessmentSlotType;

  @ApiProperty({ example: 0.4 })
  @IsNumber() @Min(0) @Max(1)
  weight: number;

  @ApiProperty({ example: 100 })
  @IsNumber() @Min(1)
  maxMark: number;

  @ApiProperty({ enum: GradeCycle })
  @IsEnum(GradeCycle)
  gradeCycle: GradeCycle;
}

export class UpdateAssessmentSlotDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ enum: AssessmentSlotType })
  @IsOptional() @IsEnum(AssessmentSlotType)
  slotType?: AssessmentSlotType;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1)
  weight?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1)
  maxMark?: number;

  @ApiPropertyOptional({ enum: GradeCycle })
  @IsOptional() @IsEnum(GradeCycle)
  gradeCycle?: GradeCycle;
}

export class CreateSlotWindowDto {
  @ApiProperty() @IsUUID()
  slotId: string;

  @ApiProperty() @IsUUID()
  branchId: string;

  @ApiProperty({ default: false })
  @IsBoolean()
  isScheduled: boolean;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  startDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  endDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  assessmentPeriodStart?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  assessmentPeriodEnd?: string;
}

export class UpdateSlotWindowDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  isScheduled?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  startDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  endDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  assessmentPeriodStart?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  assessmentPeriodEnd?: string;
}
