import { Module } from '@nestjs/common';
import { PrincipalService } from './principal.service';
import { PrincipalController } from './principal.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PrincipalController],
  providers: [PrincipalService],
})
export class PrincipalModule {}
