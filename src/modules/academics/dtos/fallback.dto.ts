import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsUUID, Min } from 'class-validator';

export class FallbackDto {
  @ApiProperty()
  @IsUUID()
  sectionId: string;

  @ApiProperty()
  @IsUUID()
  subjectId: string;

  @ApiProperty()
  @IsUUID()
  slotId: string;

  @ApiProperty({ description: 'Academic period (semester or term) ID' })
  @IsUUID()
  periodId: string;

  @ApiProperty()
  @IsUUID()
  studentId: string;

  @ApiProperty({ example: 75 })
  @IsNumber()
  @Min(0)
  score: number;
}
