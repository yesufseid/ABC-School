import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Axis SMS')
      .setDescription('Api Docs for Axis SMS')
      .setVersion('0.0.1')
      .addTag('Axis Connect')
      .addBearerAuth()
      .addSecurityRequirements('bearer')
      .build();

    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, documentFactory);
  }

  await app.listen(3000);
}
bootstrap();
