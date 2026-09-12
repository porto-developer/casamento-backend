import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository, In } from 'typeorm';
import { Payment } from './payment.entity';
import { Order } from '../orders/order.entity';
import { OrderItem } from '../orders/order-item.entity';
import { Gift } from '../gifts/gift.entity';
import {
  PAYMENT_GATEWAY,
  PaymentGateway,
} from './gateways/payment-gateway.interface';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly dataSource: DataSource,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: PaymentGateway,
  ) {}

  async findByOrderId(orderId: number): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { order_id: orderId },
      order: { created_at: 'DESC' },
    });
    if (!payment) {
      throw new NotFoundException(`Pagamento para o pedido ${orderId} não encontrado`);
    }
    return payment;
  }

  async confirmPayment(
    orderId: number,
    cardLastFour?: string,
    installments?: number,
  ) {
    const payment = await this.paymentRepository.findOne({
      where: { order_id: orderId },
      order: { created_at: 'DESC' },
    });

    if (!payment) {
      throw new NotFoundException(`Pagamento para o pedido ${orderId} não encontrado`);
    }

    if (payment.method === 'pix') {
      return this.confirmPixPayment(payment);
    }

    return this.confirmCardPayment(orderId, payment, cardLastFour, installments);
  }

  private async confirmPixPayment(payment: Payment) {
    if (payment.status === 'approved') {
      return { approved: true, status: 'approved' };
    }

    this.logger.log(`Checking PIX status for provider payment ${payment.provider_payment_id}`);
    const result = await this.paymentGateway.checkPaymentStatus(payment.provider_payment_id);

    if (result.status === 'approved') {
      await this.approveByProviderPaymentId(payment.provider_payment_id);
      return { approved: true, status: 'approved' };
    }

    return { approved: false, status: result.status };
  }

  private async confirmCardPayment(
    orderId: number,
    payment: Payment,
    cardLastFour?: string,
    installments?: number,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId },
      });

      if (!order) {
        throw new NotFoundException('Pedido não encontrado');
      }

      if (order.payment_status === 'approved' || order.payment_status === 'confirmed') {
        throw new ConflictException('Este pedido já foi pago');
      }

      const orderItems = await queryRunner.manager.find(OrderItem, {
        where: { order_id: orderId },
      });

      const giftIds = orderItems.map((i) => i.gift_id);
      const gifts = await queryRunner.manager.find(Gift, {
        where: { id: In(giftIds) },
        lock: { mode: 'pessimistic_write' },
      });

      const unavailable = gifts.filter((g) => !g.is_available);
      if (unavailable.length > 0) {
        await queryRunner.manager.update(Order, orderId, {
          payment_status: 'cancelled',
        });
        await queryRunner.commitTransaction();
        throw new ConflictException(
          'Infelizmente, um ou mais presentes já foram escolhidos enquanto você realizava o pagamento.',
        );
      }

      for (const gift of gifts) {
        gift.is_available = false;
        await queryRunner.manager.save(gift);
      }

      await queryRunner.manager.update(Order, orderId, {
        payment_status: 'confirmed',
        payment_id: payment.provider_payment_id,
      });

      payment.status = 'approved';
      await queryRunner.manager.save(payment);

      await queryRunner.commitTransaction();

      return {
        approved: true,
        payment_id: payment.provider_payment_id,
        payment_method: order.payment_method,
        card_last_four: cardLastFour || null,
        installments: payment.installments ?? installments ?? 1,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async approveByProviderPaymentId(
    providerPaymentId: string,
    providerInstallmentId?: string,
  ): Promise<void> {
    const existing = await this.findPaymentForProviderEvent(
      this.paymentRepository.manager,
      providerPaymentId,
      providerInstallmentId,
    );

    if (!existing) {
      throw new NotFoundException(
        `Pagamento com provider_payment_id ${providerPaymentId} não encontrado`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const payment = await queryRunner.manager.findOne(Payment, {
        where: { id: existing.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!payment) {
        throw new NotFoundException(
          `Pagamento com provider_payment_id ${providerPaymentId} não encontrado`,
        );
      }

      if (payment.status === 'approved') {
        this.logger.log(
          `Payment ${payment.provider_payment_id} already approved` +
            (providerPaymentId !== payment.provider_payment_id
              ? ` — acknowledging related installment ${providerPaymentId}`
              : ' — idempotent skip'),
        );
        await queryRunner.commitTransaction();
        return;
      }

      payment.status = 'approved';
      await queryRunner.manager.save(payment);

      await queryRunner.manager.update(Order, payment.order_id, {
        payment_status: 'approved',
        payment_id: payment.provider_payment_id,
      });

      const orderItems = await queryRunner.manager.find(OrderItem, {
        where: { order_id: payment.order_id },
      });

      const giftIds = orderItems.map((i) => i.gift_id);
      if (giftIds.length > 0) {
        const gifts = await queryRunner.manager.find(Gift, {
          where: { id: In(giftIds) },
          lock: { mode: 'pessimistic_write' },
        });

        for (const gift of gifts) {
          gift.is_available = false;
          await queryRunner.manager.save(gift);
        }
      }

      await queryRunner.commitTransaction();
      this.logger.log(
        `Payment ${payment.provider_payment_id} approved for order ${payment.order_id}`,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async rejectByProviderPaymentId(
    providerPaymentId: string,
    providerInstallmentId?: string,
  ): Promise<void> {
    const payment = await this.findPaymentForProviderEvent(
      this.paymentRepository.manager,
      providerPaymentId,
      providerInstallmentId,
    );

    if (!payment) {
      throw new NotFoundException(
        `Pagamento com provider_payment_id ${providerPaymentId} não encontrado`,
      );
    }

    if (payment.status === 'approved') {
      this.logger.warn(
        `Cannot reject already approved payment ${payment.provider_payment_id}` +
          (providerPaymentId !== payment.provider_payment_id
            ? ` — ignoring related installment ${providerPaymentId}`
            : ''),
      );
      return;
    }

    payment.status = 'failed';
    await this.paymentRepository.save(payment);

    await this.dataSource.manager.update(Order, payment.order_id, {
      payment_status: 'failed',
    });

    this.logger.log(
      `Payment ${payment.provider_payment_id} marked as failed for order ${payment.order_id}`,
    );
  }

  private async findPaymentForProviderEvent(
    manager: EntityManager,
    providerPaymentId: string,
    providerInstallmentId?: string,
  ): Promise<Payment | null> {
    const byPaymentId = await manager.findOne(Payment, {
      where: { provider_payment_id: providerPaymentId },
    });
    if (byPaymentId) {
      return byPaymentId;
    }

    if (!providerInstallmentId) {
      return null;
    }

    const byInstallmentId = await manager.findOne(Payment, {
      where: { provider_installment_id: providerInstallmentId },
    });
    if (byInstallmentId) {
      return byInstallmentId;
    }

    const relatedIds =
      await this.paymentGateway.listInstallmentPaymentIds(providerInstallmentId);
    if (relatedIds.length === 0) {
      return null;
    }

    const related = await manager.findOne(Payment, {
      where: { provider_payment_id: In(relatedIds) },
    });

    if (related && !related.provider_installment_id) {
      related.provider_installment_id = providerInstallmentId;
      await manager.save(related);
      this.logger.log(
        `Backfilled provider_installment_id ${providerInstallmentId} for payment ${related.provider_payment_id}`,
      );
    }

    return related;
  }
}
