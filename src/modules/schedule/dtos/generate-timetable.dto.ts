import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class GenerateTimetableDto {
  @ApiProperty({ example: 'section-uuid' })
  @IsUUID()
  @IsNotEmpty()
  sectionId: string;

  @ApiProperty({ example: '2026' })
  @IsString()
  @IsNotEmpty()
  year: string;
}
