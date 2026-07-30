import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CorrectionRequestDto {
  @ApiProperty() @IsUUID()
  resultId: string;

  @ApiProperty({ example: 'Score entry error' })
  @IsString() @IsNotEmpty()
  reason: string;

  @ApiProperty({ example: 90 })
  @IsNumber() @Min(0)
  newScore: number;
}

export class ApproveCorrectionDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  note?: string;
}

export class RejectCorrectionDto {
  @ApiProperty() @IsString() @IsNotEmpty()
  note: string;
}
