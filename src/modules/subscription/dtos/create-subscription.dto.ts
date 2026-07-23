import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsObject, IsString, Min } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty({ example: 'Basic Plan' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 12 })
  @IsInt()
  @Min(1)
  months: number;

  @ApiProperty({ example: 2999.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: { smsLimit: 5000, apiAccess: true } })
  @IsObject()
  features: Record<string, string | number | boolean>;
}
