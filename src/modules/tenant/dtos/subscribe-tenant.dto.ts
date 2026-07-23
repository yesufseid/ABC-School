import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsUUID } from 'class-validator';

export class SubscribeTenantDto {
  @ApiProperty({ example: '8ad240d4-52bb-4018-ad63-b4c382d0fccc' })
  @IsUUID()
  tenantId: string;

  @ApiProperty({ example: 'b277ff9c-b2a9-4e88-a0cb-4098b7e7efa4' })
  @IsUUID()
  subscriptionId: string;

  @ApiProperty({ example: 24_000 })
  @IsNumber()
  @IsPositive()
  paidAmount: string;
}
