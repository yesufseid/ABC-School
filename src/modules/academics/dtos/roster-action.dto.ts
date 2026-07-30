import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class ApproveRosterDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  note?: string;
}

export class RejectRosterDto {
  @ApiProperty() @IsString() @IsNotEmpty()
  note: string;
}

export class PublishRosterDto {
  @ApiProperty({ example: 'Term 1' })
  @IsString() @IsNotEmpty()
  term: string;

  @ApiProperty({ example: '2026' })
  @IsString() @IsNotEmpty()
  year: string;

  @ApiProperty({ example: ['section-uuid-1', 'section-uuid-2'] })
  @IsArray() @IsUUID(undefined, { each: true })
  sectionIds: string[];
}
