import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, IsUUID, Min } from 'class-validator';

export class CreateSectionDto {
  @ApiProperty({ example: 'A' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '2026' })
  @IsString()
  @IsNotEmpty()
  year: string;

  @ApiProperty({ example: 30 })
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiProperty({ example: 'grade-uuid' })
  @IsUUID()
  gradeId: string;

  @ApiProperty({ example: 'branch-uuid' })
  @IsUUID()
  branchId: string;
}
