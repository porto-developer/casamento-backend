import { Controller, Post, Body, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { WebhookService } from './webhook.service';

@ApiTags('Webhook')
@Controller('webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('payment')
  @Throttle({ global: { ttl: 60_000, limit: 30 } })
  @ApiOperation({ summary: 'Recebe eventos de pagamento do gateway' })
  @ApiResponse({ status: 200, description: 'Webhook processado' })
  @ApiResponse({ status: 400, description: 'Payload ou assinatura inválidos' })
  handlePayment(
    @Body() payload: Record<string, unknown>,
    @Headers('asaas-access-token') asaasToken: string,
    @Headers('x-webhook-signature') signature: string,
  ) {
    const token = asaasToken || signature;
    return this.webhookService.handlePaymentWebhook(payload, token);
  }
}
