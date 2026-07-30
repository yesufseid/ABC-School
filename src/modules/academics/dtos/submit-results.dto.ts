import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class SubmitResultsDto {
  @ApiProperty() @IsUUID()
  sectionId: string;

  @ApiProperty() @IsUUID()
  subjectId: string;

  @ApiProperty() @IsUUID()
  slotId: string;

  @ApiProperty({ example: 'Term 1' })
  @IsString() @IsNotEmpty()
  term: string;
}
