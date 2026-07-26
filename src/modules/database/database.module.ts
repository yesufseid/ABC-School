import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { ClsService } from 'nestjs-cls';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  providers: [
    {
      provide: DatabaseService,
      useFactory: (cls: ClsService, configService: ConfigService) => {
        return new DatabaseService(cls, configService).getExtendedClient();
      },
      inject: [ClsService, ConfigService],
    },
  ],
  exports: [DatabaseService],
})
export class DatabaseModule {}
