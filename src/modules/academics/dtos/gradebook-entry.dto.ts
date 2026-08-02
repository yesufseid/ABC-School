import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
export class GradebookEntryItem {
  @ApiProperty()
  @IsUUID()
  studentId: string;

  @ApiProperty({ example: 85 })
  @IsNumber()
  @Min(0)
  score: number;
}

export class GradebookEntryBatchDto {
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

  @ApiProperty({ type: [GradebookEntryItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradebookEntryItem)
  entries: GradebookEntryItem[];
}
