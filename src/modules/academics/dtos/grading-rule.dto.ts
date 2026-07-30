import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateGradingRuleDto {
  @ApiProperty({ example: 90 })
  @IsNumber() @Min(0)
  minMarks: number;

  @ApiProperty({ example: 100 })
  @IsNumber() @Min(0) @Max(100)
  maxMarks: number;

  @ApiProperty({ example: 'A' })
  @IsString() @IsNotEmpty()
  grade: string;

  @ApiProperty({ example: 4.0 })
  @IsNumber() @Min(0) @Max(4)
  points: number;

  @ApiProperty({ default: true })
  @IsBoolean()
  isPass: boolean;
}

export class UpdateGradingRuleDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0)
  minMarks?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100)
  maxMarks?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @IsNotEmpty()
  grade?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(4)
  points?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  isPass?: boolean;
}
