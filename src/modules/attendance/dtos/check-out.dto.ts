import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class CheckOutDto {
  @ApiPropertyOptional({ description: 'Defaults to now if not provided' })
  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @ApiPropertyOptional({ description: 'Required for manual entry by HR' })
  @IsOptional()
  @IsUUID()
  branchId?: string;
}
