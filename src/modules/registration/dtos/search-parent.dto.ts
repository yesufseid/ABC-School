import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsPhoneNumber, IsString } from 'class-validator';

export class SearchParentDto {
  @ApiPropertyOptional({ example: '+251911223344' })
  @IsPhoneNumber()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'Girma' })
  @IsString()
  @IsOptional()
  name?: string;
}
