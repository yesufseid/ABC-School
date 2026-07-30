import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class CheckInDto {
  @ApiPropertyOptional({ description: 'Defaults to now if not provided' })
  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @ApiPropertyOptional({ description: 'Required for manual entry by HR; self-check-in uses profile branch' })
  @IsOptional()
  @IsUUID()
  branchId?: string;
}
