import {
  Injectable,
  Inject,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  PAYMENT_GATEWAY,
  PaymentGateway,
} from '../payments/gateways/payment-gateway.interface';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: PaymentGateway,
    private readonly paymentsService: PaymentsService,
  ) {}

  async handlePaymentWebhook(payload: unknown, token: string) {
    const isValid = this.paymentGateway.verifyWebhookSignature(payload, token);
    if (!isValid) {
      throw new BadRequestException('Assinatura do webhook inválida');
    }

    const event = this.paymentGateway.parseWebhookEvent(payload);

    if (!event.providerPaymentId) {
      throw new BadRequestException('provider_payment_id ausente no payload');
    }

    this.logger.log(
      `Webhook received: ${event.providerPaymentId} -> ${event.status}` +
        (event.providerInstallmentId
          ? ` (installment ${event.providerInstallmentId}` +
            (event.installmentNumber
              ? `, parcela ${event.installmentNumber}`
              : '') +
            ')'
          : ''),
    );

    switch (event.status) {
      case 'approved':
        await this.paymentsService.approveByProviderPaymentId(
          event.providerPaymentId,
          event.providerInstallmentId,
        );
        break;

      case 'rejected':
      case 'failed':
        await this.paymentsService.rejectByProviderPaymentId(
          event.providerPaymentId,
          event.providerInstallmentId,
        );
        break;

      default:
        this.logger.warn(`Unhandled webhook status: ${event.status}`);
    }

    return { received: true };
  }
}
