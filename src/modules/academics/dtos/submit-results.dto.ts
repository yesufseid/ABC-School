import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SubmitResultsDto {
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
}
