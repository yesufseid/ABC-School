import { Module } from '@nestjs/common';
import { FeatureModule } from './feature.module';
import { DatabaseModule } from './modules/database/database.module';
import { ConfigModule } from '@nestjs/config';
import { ClsModule } from 'nestjs-cls';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { DatabaseService } from './modules/database/database.service';
import { APP_GUARD } from '@nestjs/core';
import { AppGuard } from './modules/auth/guards/app.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { SubscriptionGuard } from './modules/auth/guards/subscription.guard';

// TODO: refactor config module and transactional db setup
@Module({
  imports: [
    // config module registration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Transactional DB
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
      plugins: [
        new ClsPluginTransactional({
          imports: [DatabaseModule],
          adapter: new TransactionalAdapterPrisma({
            prismaInjectionToken: DatabaseService,
          }),
        }),
      ],
    }),

    DatabaseModule,
    FeatureModule,
  ],

  providers: [
    {
      provide: APP_GUARD,
      useClass: AppGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: SubscriptionGuard,
    },
  ],
})
export class AppModule {}
