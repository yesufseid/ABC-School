import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class AssignSectionDto {
  @ApiProperty({ example: ['student-uuid-1', 'student-uuid-2'] })
  @IsArray()
  @IsUUID(undefined, { each: true })
  studentIds: string[];

  @ApiProperty({ example: 'section-uuid' })
  @IsUUID()
  sectionId: string;
}
