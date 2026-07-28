import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsObject,
  IsPhoneNumber,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({ example: '+251912345678' })
  @IsPhoneNumber()
  ownerPhone: string;

  @ApiProperty({ example: 'Girma Beyene' })
  @IsString()
  @IsNotEmpty()
  ownerName: string;

  @ApiProperty({ example: 'girma123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Axis International School' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'A private K-12 school in Addis Ababa' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'CRZ' })
  @IsString()
  @IsNotEmpty()
  branchCode: string;

  @ApiProperty({ example: 'CRZ' })
  @IsString()
  @IsNotEmpty()
  branchPrefix: string;

  @ApiProperty({
    example: { address: 'Bole Subcity', phone: '+251911223344' },
  })
  @IsObject()
  details: Record<string, string | number | boolean>;
}
