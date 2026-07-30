import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { AdmissionScenario } from 'prisma/src/generated/prisma/enums';

export class ReAdmitDto {
  @ApiProperty({ example: 'GRADE_PROMOTION', enum: AdmissionScenario })
  @IsEnum(AdmissionScenario)
  scenario: AdmissionScenario;

  @ApiPropertyOptional({ example: 2 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  startingGrade?: number;

  @ApiPropertyOptional({ example: 'branch-uuid' })
  @IsString()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ example: 'section-uuid' })
  @IsString()
  @IsOptional()
  sectionId?: string;

  @ApiPropertyOptional({ example: 'New Address' })
  @IsString()
  @IsOptional()
  address?: string;
}
