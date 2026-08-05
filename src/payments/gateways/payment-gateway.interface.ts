export interface CreatePixPaymentData {
  orderId: number;
  amount: number;
  description: string;
  customerName: string;
  customerDocument: string;
}

export interface CreditCardData {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
}

export interface CreditCardHolderInfo {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  phone: string;
}

export interface CreateCardPaymentData {
  orderId: number;
  amount: number;
  description: string;
  customerName: string;
  customerDocument: string;
  creditCard: CreditCardData;
  creditCardHolderInfo: CreditCardHolderInfo;
  remoteIp: string;
  /** Parcelas (1 a 6x sem juros). Default tratado pelo caller. */
  installments: number;
}

export interface PixPaymentResult {
  providerPaymentId: string;
  qrCode: string;
  copyPasteCode: string;
  expiresAt: Date;
}

export interface CardPaymentResult {
  providerPaymentId: string;
  status: 'processing' | 'approved' | 'rejected';
}

export interface WebhookEvent {
  providerPaymentId: string;
  status: 'approved' | 'rejected' | 'failed';
  rawPayload: Record<string, unknown>;
}

export const PAYMENT_GATEWAY = 'PAYMENT_GATEWAY';

export interface PaymentStatusResult {
  status: 'approved' | 'pending' | 'failed';
}

export interface PaymentGateway {
  createPixPayment(data: CreatePixPaymentData): Promise<PixPaymentResult>;
  createCardPayment(data: CreateCardPaymentData): Promise<CardPaymentResult>;
  checkPaymentStatus(providerPaymentId: string): Promise<PaymentStatusResult>;
  verifyWebhookSignature(payload: unknown, signature: string): boolean;
  parseWebhookEvent(payload: unknown): WebhookEvent;
}
