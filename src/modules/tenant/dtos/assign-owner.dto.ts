import { ApiProperty } from '@nestjs/swagger';
import { IsPhoneNumber } from 'class-validator';

export class AssignOwnerDto {
  @ApiProperty({
    example: '+251912345678',
    description: 'Phone number of the user to assign as tenant owner',
  })
  @IsPhoneNumber()
  ownerPhoneNumber: string;
}
