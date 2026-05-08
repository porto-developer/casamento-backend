import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { validate } from './config/env.validation';
import { getDatabaseConfig } from './config/database.config';
import { GiftsModule } from './gifts/gifts.module';
import { GuestsModule } from './guests/guests.module';
import { CustomersModule } from './customers/customers.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { WebhookModule } from './webhook/webhook.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
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
  ],
})
export class AppModule {}
