import { ApiProperty } from '@nestjs/swagger';
import { IsPhoneNumber, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: '+251912345678',
  })
  @IsPhoneNumber()
  phoneNumber: string;

  @ApiProperty({
    example: '000000',
  })
  @IsString()
  @MinLength(4)
  password: string;
}
