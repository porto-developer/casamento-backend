import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  PaymentGateway,
  CreatePixPaymentData,
  CreateCardPaymentData,
  PixPaymentResult,
  CardPaymentResult,
  PaymentStatusResult,
  WebhookEvent,
} from './payment-gateway.interface';

@Injectable()
export class MockPaymentProvider implements PaymentGateway {
  private readonly logger = new Logger(MockPaymentProvider.name);

  async createPixPayment(data: CreatePixPaymentData): Promise<PixPaymentResult> {
    this.logger.log(`[MOCK] Creating PIX payment for order ${data.orderId}: R$${data.amount}`);

    const paymentId = `mock_pix_${uuidv4()}`;
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    return {
      providerPaymentId: paymentId,
      qrCode: `https://mock-qr.example.com/${paymentId}`,
      copyPasteCode: `00020126580014BR.GOV.BCB.PIX0136${paymentId}5204000053039865802BR5913CASAMENTO6009SAOPAULO62140510PED${data.orderId}`,
      expiresAt,
    };
  }

  async createCardPayment(data: CreateCardPaymentData): Promise<CardPaymentResult> {
    this.logger.log(
      `[MOCK] Creating card payment for order ${data.orderId}: R$${data.amount} in ${data.installments}x`,
    );

    return {
      providerPaymentId: `mock_card_${uuidv4()}`,
      status: 'processing',
    };
  }

  async checkPaymentStatus(_providerPaymentId: string): Promise<PaymentStatusResult> {
    this.logger.log(`[MOCK] checkPaymentStatus — always returns approved`);
    return { status: 'approved' };
  }

  verifyWebhookSignature(_payload: unknown, _signature: string): boolean {
    this.logger.log('[MOCK] Webhook signature verification — always returns true');
    return true;
  }

  parseWebhookEvent(payload: unknown): WebhookEvent {
    const body = payload as Record<string, unknown>;
    return {
      providerPaymentId: (body.provider_payment_id as string) || '',
      status: (body.status as 'approved' | 'rejected' | 'failed') || 'approved',
      rawPayload: body,
    };
  }
}
