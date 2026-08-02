import { Module } from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { TeacherController } from './teacher.controller';
import { TeacherScopeService } from './teacher-scope.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [TeacherController],
  providers: [TeacherService, TeacherScopeService],
  exports: [TeacherScopeService],
})
export class TeacherModule {}
