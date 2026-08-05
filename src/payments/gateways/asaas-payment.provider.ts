import { Injectable, Logger, BadGatewayException } from '@nestjs/common';
import {
  PaymentGateway,
  CreatePixPaymentData,
  CreateCardPaymentData,
  PixPaymentResult,
  CardPaymentResult,
  PaymentStatusResult,
  WebhookEvent,
} from './payment-gateway.interface';

interface AsaasCustomerResponse {
  id: string;
  name: string;
  cpfCnpj: string;
}

interface AsaasPaymentResponse {
  id: string;
  status: string;
  dueDate: string;
  creditCard?: {
    creditCardNumber: string;
    creditCardBrand: string;
    creditCardToken: string;
  };
}

interface AsaasPixQrCodeResponse {
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

@Injectable()
export class AsaasPaymentProvider implements PaymentGateway {
  private readonly logger = new Logger(AsaasPaymentProvider.name);

  constructor(
    private readonly apiUrl: string,
    private readonly apiKey: string,
    private readonly authToken: string,
  ) {}

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = `${this.apiUrl}${path}`;

    const response = await fetch(url, {
      method,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        access_token: this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`Asaas API error [${response.status}]: ${errorBody}`);

      let userMessage = 'Erro ao processar pagamento. Tente novamente.';
      try {
        const parsed = JSON.parse(errorBody) as { errors?: { description: string }[] };
        if (parsed.errors?.[0]?.description) {
          userMessage = parsed.errors[0].description;
        }
      } catch {}

      throw new BadGatewayException(userMessage);
    }

    return response.json() as Promise<T>;
  }

  private async findOrCreateCustomer(
    name: string,
    cpfCnpj: string,
  ): Promise<string> {
    const searchResponse = await this.request<{
      data: AsaasCustomerResponse[];
    }>('GET', `/customers?cpfCnpj=${cpfCnpj}`);

    if (searchResponse.data.length > 0) {
      this.logger.log(`Customer found: ${searchResponse.data[0].id}`);
      return searchResponse.data[0].id;
    }

    const customer = await this.request<AsaasCustomerResponse>(
      'POST',
      '/customers',
      { name, cpfCnpj },
    );

    this.logger.log(`Customer created: ${customer.id}`);
    return customer.id;
  }

  async createPixPayment(data: CreatePixPaymentData): Promise<PixPaymentResult> {
    const customerId = await this.findOrCreateCustomer(
      data.customerName,
      data.customerDocument,
    );

    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + 1);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const payment = await this.request<AsaasPaymentResponse>(
      'POST',
      '/payments',
      {
        customer: customerId,
        billingType: 'PIX',
        value: data.amount,
        dueDate: dueDateStr,
        description: data.description,
      },
    );

    this.logger.log(`PIX payment created: ${payment.id}`);

    const pixQrCode = await this.request<AsaasPixQrCodeResponse>(
      'GET',
      `/payments/${payment.id}/pixQrCode`,
    );

    return {
      providerPaymentId: payment.id,
      qrCode: pixQrCode.encodedImage,
      copyPasteCode: pixQrCode.payload,
      expiresAt: new Date(pixQrCode.expirationDate),
    };
  }

  async createCardPayment(
    data: CreateCardPaymentData,
  ): Promise<CardPaymentResult> {
    const customerId = await this.findOrCreateCustomer(
      data.customerName,
      data.customerDocument,
    );

    const dueDate = new Date();
    const dueDateStr = dueDate.toISOString().split('T')[0];
    const installments = data.installments >= 2 ? data.installments : 1;

    const body: Record<string, unknown> = {
      customer: customerId,
      billingType: 'CREDIT_CARD',
      dueDate: dueDateStr,
      description: data.description,
      creditCard: {
        holderName: data.creditCard.holderName,
        number: data.creditCard.number,
        expiryMonth: data.creditCard.expiryMonth,
        expiryYear: data.creditCard.expiryYear,
        ccv: data.creditCard.ccv,
      },
      creditCardHolderInfo: {
        name: data.creditCardHolderInfo.name,
        email: data.creditCardHolderInfo.email,
        cpfCnpj: data.creditCardHolderInfo.cpfCnpj,
        postalCode: data.creditCardHolderInfo.postalCode,
        addressNumber: data.creditCardHolderInfo.addressNumber,
        phone: data.creditCardHolderInfo.phone,
      },
      remoteIp: data.remoteIp,
    };

    if (installments >= 2) {
      body.installmentCount = installments;
      body.totalValue = data.amount;
    } else {
      body.value = data.amount;
    }

    const payment = await this.request<AsaasPaymentResponse>(
      'POST',
      '/payments',
      body,
    );

    this.logger.log(
      `Card payment created: ${payment.id} — status: ${payment.status} — installments: ${installments}`,
    );

    const statusMap: Record<string, 'processing' | 'approved' | 'rejected'> = {
      CONFIRMED: 'approved',
      RECEIVED: 'approved',
      PENDING: 'processing',
      OVERDUE: 'rejected',
      REFUNDED: 'rejected',
    };

    return {
      providerPaymentId: payment.id,
      status: statusMap[payment.status] || 'processing',
    };
  }

  async checkPaymentStatus(providerPaymentId: string): Promise<PaymentStatusResult> {
    const payment = await this.request<AsaasPaymentResponse>('GET', `/payments/${providerPaymentId}`);

    const approvedStatuses = ['CONFIRMED', 'RECEIVED'];
    const failedStatuses = ['OVERDUE', 'REFUNDED', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE', 'AWAITING_CHARGEBACK_REVERSAL', 'DUNNING_REQUESTED', 'DUNNING_RECEIVED', 'REFUND_REQUESTED'];

    if (approvedStatuses.includes(payment.status)) return { status: 'approved' };
    if (failedStatuses.includes(payment.status)) return { status: 'failed' };
    return { status: 'pending' };
  }

  verifyWebhookSignature(_payload: unknown, token: string): boolean {
    return token === this.authToken;
  }

  parseWebhookEvent(payload: unknown): WebhookEvent {
    const body = payload as Record<string, unknown>;
    const event = body.event as string;
    const paymentData = body.payment as Record<string, unknown>;

    const statusMap: Record<string, 'approved' | 'rejected' | 'failed'> = {
      PAYMENT_CONFIRMED: 'approved',
      PAYMENT_RECEIVED: 'approved',
      PAYMENT_OVERDUE: 'failed',
      PAYMENT_DELETED: 'rejected',
      PAYMENT_REFUNDED: 'rejected',
    };

    return {
      providerPaymentId: (paymentData?.id as string) || '',
      status: statusMap[event] || 'failed',
      rawPayload: body,
    };
  }
}
