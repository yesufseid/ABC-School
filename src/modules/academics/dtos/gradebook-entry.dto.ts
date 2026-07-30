import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class GradebookEntryItem {
  @ApiProperty() @IsUUID()
  studentId: string;

  @ApiProperty({ example: 85 })
  @IsNumber() @Min(0)
  score: number;
}

export class GradebookEntryBatchDto {
  @ApiProperty() @IsUUID()
  sectionId: string;

  @ApiProperty() @IsUUID()
  subjectId: string;

  @ApiProperty() @IsUUID()
  slotId: string;

  @ApiProperty({ example: 'Term 1' })
  @IsString() @IsNotEmpty()
  term: string;

  @ApiProperty({ type: [GradebookEntryItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradebookEntryItem)
  entries: GradebookEntryItem[];
}
