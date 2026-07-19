import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { ClsModule } from 'nestjs-cls';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

@Global()
@Module({
  providers: [DatabaseService],
})
export class DatabaseModule {}

export const TransactionalDB = ClsModule.forRoot({
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
});
