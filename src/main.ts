import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Substitui o logger padrão do NestJS pelo Pino estruturado
  app.useLogger(app.get(Logger));

  app.use(helmet());

  // /health fica fora do prefixo /api para orquestradores (Docker, K8s)
  app.setGlobalPrefix('api', { exclude: ['health'] });

  const rawOrigins = process.env.CORS_ORIGIN ?? '';
  const allowedOrigins = rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  // RequestIdInterceptor deve vir antes do LoggingInterceptor
  app.useGlobalInterceptors(new RequestIdInterceptor(), new LoggingInterceptor());

  const config = new DocumentBuilder()
    .setTitle('Wedding Gift List API')
    .setDescription('API para gerenciamento de lista de presentes de casamento')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
}

bootstrap();
