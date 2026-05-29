import {
  Injectable,
  BadRequestException,
  ConflictException,
  Inject,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository, In } from 'typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { Gift } from '../gifts/gift.entity';
import { CustomersService } from '../customers/customers.service';
import { Payment } from '../payments/payment.entity';
import {
  PAYMENT_GATEWAY,
  PaymentGateway,
} from '../payments/gateways/payment-gateway.interface';
import { CreateOrderDto, PaymentMethodEnum } from './dto/create-order.dto';
import {
  parseRequiredBrazilPhone,
  parseRequiredBrazilCpf,
} from '../common/utils/brazil-contact.util';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly dataSource: DataSource,
    private readonly customersService: CustomersService,
    private readonly configService: ConfigService,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: PaymentGateway,
  ) {}

  async create(dto: CreateOrderDto) {
    const phone = parseRequiredBrazilPhone(dto.customer_phone);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const document = parseRequiredBrazilCpf(dto.customer_document);

      const customer = await this.customersService.upsert(
        dto.customer_name,
        phone,
        document,
        queryRunner,
      );

      const giftIds = dto.items.map((i) => i.gift_id);
      const gifts = await queryRunner.manager.find(Gift, {
        where: { id: In(giftIds) },
        lock: { mode: 'pessimistic_write' },
      });

      if (gifts.length !== giftIds.length) {
        throw new BadRequestException('Um ou mais presentes não foram encontrados');
      }

      const unavailable = gifts.filter((g) => !g.is_available);
      if (unavailable.length > 0) {
        throw new ConflictException(
          'Um ou mais presentes já foram escolhidos por outra pessoa',
        );
      }

      const total = gifts.reduce(
        (sum, g) => sum + Number(g.price),
        0,
      );

      const order = queryRunner.manager.create(Order, {
        customer_id: customer.id,
        guest_message: dto.guest_message || null,
        total,
        payment_method: dto.payment_method,
        payment_status: 'pending',
      });

      const savedOrder = await queryRunner.manager.save(order);

      const orderItems = gifts.map((gift) =>
        queryRunner.manager.create(OrderItem, {
          order_id: savedOrder.id,
          gift_id: gift.id,
          gift_name: gift.name,
          gift_price: gift.price,
        }),
      );
      await queryRunner.manager.save(orderItems);

      let paymentResult: {
        providerPaymentId: string;
        pixQrCode?: string | null;
        pixCopyPaste?: string | null;
        expiresAt?: Date | null;
        status?: string;
      };

      if (dto.payment_method === PaymentMethodEnum.PIX) {
        const pixResult = await this.paymentGateway.createPixPayment({
          orderId: savedOrder.id,
          amount: total,
          description: `Presente de casamento - Pedido #${savedOrder.id}`,
          customerName: customer.name,
          customerDocument: customer.document,
        });
        paymentResult = {
          providerPaymentId: pixResult.providerPaymentId,
          pixQrCode: pixResult.qrCode,
          pixCopyPaste: pixResult.copyPasteCode,
          expiresAt: pixResult.expiresAt,
        };
      } else {
        if (!dto.credit_card || !dto.credit_card_holder_info || !dto.remote_ip) {
          throw new BadRequestException(
            'Dados do cartão, titular e IP são obrigatórios para pagamento com cartão',
          );
        }

        const cardResult = await this.paymentGateway.createCardPayment({
          orderId: savedOrder.id,
          amount: total,
          description: `Presente de casamento - Pedido #${savedOrder.id}`,
          customerName: customer.name,
          customerDocument: customer.document,
          creditCard: {
            holderName: dto.credit_card.holder_name,
            number: dto.credit_card.number,
            expiryMonth: dto.credit_card.expiry_month,
            expiryYear: dto.credit_card.expiry_year,
            ccv: dto.credit_card.ccv,
          },
          creditCardHolderInfo: {
            name: dto.credit_card_holder_info.name,
            email: dto.credit_card_holder_info.email,
            cpfCnpj: dto.credit_card_holder_info.cpf_cnpj,
            postalCode: dto.credit_card_holder_info.postal_code,
            addressNumber: dto.credit_card_holder_info.address_number,
            phone: dto.credit_card_holder_info.phone,
          },
          remoteIp: dto.remote_ip,
        });
        paymentResult = {
          providerPaymentId: cardResult.providerPaymentId,
          status: cardResult.status,
        };
      }

      const provider = this.configService.get<string>('PAYMENT_PROVIDER', 'mock');

      const payment = queryRunner.manager.create(Payment, {
        order_id: savedOrder.id,
        provider,
        provider_payment_id: paymentResult.providerPaymentId,
        method: dto.payment_method,
        amount: total,
        status: 'pending',
        pix_qr_code: paymentResult.pixQrCode || null,
        pix_copy_paste: paymentResult.pixCopyPaste || null,
        expires_at: paymentResult.expiresAt || null,
      });
      await queryRunner.manager.save(payment);

      await queryRunner.commitTransaction();

      if (dto.payment_method === PaymentMethodEnum.PIX) {
        return {
          order_id: savedOrder.id,
          total,
          payment_method: 'pix',
          pix_code: paymentResult.pixCopyPaste,
          pix_qr_code: paymentResult.pixQrCode,
          expires_at: paymentResult.expiresAt,
        };
      }

      return {
        order_id: savedOrder.id,
        total,
        payment_method: 'credit_card',
        status: paymentResult.status || 'processing',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Order creation failed: ${error}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findOne(id: number): Promise<Order | null> {
    return this.orderRepository.findOne({
      where: { id },
      relations: ['items', 'customer'],
    });
  }
}
