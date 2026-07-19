import { Module } from '@nestjs/common';
import { FeatureModule } from './feature.module';

@Module({
  imports: [FeatureModule],
})
export class AppModule {}
