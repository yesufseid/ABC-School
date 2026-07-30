import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsUUID, Min } from 'class-validator';

export class FallbackDto {
  @ApiProperty() @IsUUID()
  sectionId: string;

  @ApiProperty() @IsUUID()
  subjectId: string;

  @ApiProperty() @IsUUID()
  slotId: string;

  @ApiProperty({ example: 'Term 1' })
  @IsString() @IsNotEmpty()
  term: string;

  @ApiProperty() @IsUUID()
  studentId: string;

  @ApiProperty({ example: 75 })
  @IsNumber() @Min(0)
  score: number;
}
