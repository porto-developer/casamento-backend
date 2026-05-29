import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { v4 as uuidv4 } from 'uuid';
import { IncomingMessage } from 'http';
import { validate } from './config/env.validation';
import { getDatabaseConfig } from './config/database.config';
import { GiftsModule } from './gifts/gifts.module';
import { GuestsModule } from './guests/guests.module';
import { CustomersModule } from './customers/customers.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { WebhookModule } from './webhook/webhook.module';
import { HealthModule } from './health/health.module';
import { MessagesModule } from './messages/messages.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction =
          configService.get<string>('NODE_ENV') === 'production';
        return {
          pinoHttp: {
            level: isProduction ? 'info' : 'debug',
            transport: isProduction
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: { colorize: true, singleLine: true },
                },
            // Reutiliza o x-request-id recebido ou gera um UUID novo
            genReqId: (req: IncomingMessage) => {
              const incoming = req.headers['x-request-id'];
              return (Array.isArray(incoming) ? incoming[0] : incoming) ?? uuidv4();
            },
            // Logging de request/response é feito pelo LoggingInterceptor
            autoLogging: false,
          },
        };
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: () => [
        {
          // Limite global: 120 requisições por minuto por IP
          name: 'global',
          ttl: 60_000,
          limit: 120,
        },
      ],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
    GiftsModule,
    GuestsModule,
    CustomersModule,
    OrdersModule,
    PaymentsModule,
    WebhookModule,
    HealthModule,
    MessagesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
