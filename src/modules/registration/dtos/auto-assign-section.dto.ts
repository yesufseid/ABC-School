import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export enum AutoAssignMode {
  COUNT = 'count',
  GENDER_RATIO = 'gender_ratio',
}

export class AutoAssignSectionDto {
  @ApiProperty({ example: 'grade-uuid' })
  @IsUUID()
  gradeId: string;

  @ApiProperty({ example: 'branch-uuid' })
  @IsUUID()
  branchId: string;

  @ApiProperty({ example: '2026' })
  @IsString()
  @IsNotEmpty()
  year: string;

  @ApiProperty({ enum: AutoAssignMode })
  @IsEnum(AutoAssignMode)
  mode: AutoAssignMode;
}
