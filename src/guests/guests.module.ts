import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Guest } from './guest.entity';
import { GuestsService } from './guests.service';
import { GuestsController } from './guests.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Guest])],
  controllers: [GuestsController],
  providers: [GuestsService],
  exports: [TypeOrmModule, GuestsService],
})
export class GuestsModule {}
