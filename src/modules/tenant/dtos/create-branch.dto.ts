import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class CreateBranchDto {
  @ApiProperty({ example: 'Bole Campus' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Main campus in Bole subcity' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'BL-001' })
  @IsString()
  @IsNotEmpty()
  branchCode: string;

  @ApiProperty({ example: 'BL' })
  @IsString()
  @IsNotEmpty()
  branchPrefix: string;

  @ApiProperty({
    example: { phone: '+251911223344', address: 'Bole, Addis Ababa' },
  })
  @IsObject()
  details: Record<string, string | number | boolean>;
}
