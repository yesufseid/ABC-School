import { Module } from '@nestjs/common';
import { FeatureModule } from './feature.module';
import {
  DatabaseModule,
  TransactionalDB,
} from './modules/database/database.module';

@Module({
  imports: [DatabaseModule, TransactionalDB, FeatureModule],
})
export class AppModule {}
