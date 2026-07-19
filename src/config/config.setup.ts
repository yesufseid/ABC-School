import { ConfigModule } from '@nestjs/config';

export const ConfigSetup = ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: '.env',
});
