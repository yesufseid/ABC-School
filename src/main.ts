import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SlackExceptionFilter } from './common/filters/slack-exception.filter';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  const configService = app.get(ConfigService);
  app.useGlobalFilters(new SlackExceptionFilter(configService));

  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Axis SMS')
      .setDescription('Api Docs for Axis SMS')
      .setVersion('0.0.1')
      .addTag('Axis Connect')
      .addBearerAuth()
      .addSecurityRequirements('bearer')
      .build();

    const document = SwaggerModule.createDocument(app, config);

    // public routes
    document.paths['/api/v1/auth/login'].post.security = [];

    SwaggerModule.setup('api', app, document);
  }

  await app.listen(3000);
}
bootstrap();
