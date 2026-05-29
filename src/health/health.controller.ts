import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { SkipThrottle } from '@nestjs/throttler';
import { DataSource } from 'typeorm';

@ApiTags('Health')
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({ summary: 'Verifica status da aplicação e do banco de dados' })
  @ApiResponse({ status: 200, description: 'Serviço saudável' })
  @ApiResponse({ status: 503, description: 'Banco de dados indisponível' })
  async check() {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok', db: 'ok' };
    } catch {
      throw new ServiceUnavailableException({ status: 'error', db: 'unavailable' });
    }
  }
}
