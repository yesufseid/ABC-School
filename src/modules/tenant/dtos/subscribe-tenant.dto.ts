import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDate, IsNumber, IsPositive, IsUUID } from 'class-validator';

export class SubscribeTenantDto {
  @ApiProperty({ example: '8ad240d4-52bb-4018-ad63-b4c382d0fccc' })
  @IsUUID()
  tenantId: string;

  @ApiProperty({ example: 'b277ff9c-b2a9-4e88-a0cb-4098b7e7efa4' })
  @IsUUID()
  subscriptionId: string;

  @ApiProperty({ example: new Date().toISOString() })
  @Transform(({ value }) =>
    !value || typeof value === 'number' || Number.isNaN(new Date(value))
      ? value
      : new Date(value),
  )
  @IsDate()
  startDate: Date;

  @ApiProperty({ example: 2999.99 })
  @Transform(({ value }) => (typeof value === 'string' ? Number(value) : value))
  @IsNumber()
  @IsPositive()
  paidAmount:number;
}
