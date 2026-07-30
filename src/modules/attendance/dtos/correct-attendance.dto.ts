import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { AttendanceStatus } from 'prisma/src/generated/prisma/enums';

export class CorrectAttendanceDto {
  @ApiProperty({ enum: AttendanceStatus })
  @IsEnum(AttendanceStatus)
  newStatus: AttendanceStatus;

  @ApiProperty({ example: 'Student was present but marked absent by mistake' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ description: 'Owner profile ID for corrections beyond 3-day window' })
  @IsOptional()
  @IsUUID()
  approvedBy?: string;
}
