import { Module } from '@nestjs/common';
import { FeatureModule } from './feature.module';
import {
  DatabaseModule,
  TransactionalDB,
} from './modules/database/database.module';
import { ConfigSetup } from './config/config.setup';

@Module({
  imports: [ConfigSetup, DatabaseModule, TransactionalDB, FeatureModule],
})
export class AppModule {}
