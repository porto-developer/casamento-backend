import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  ArrayMinSize,
  IsEnum,
  IsOptional,
  IsNumber,
  IsEmail,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  gift_id: number;

  @ApiProperty({ example: 'Jogo de Panelas' })
  @IsString()
  @IsNotEmpty()
  gift_name: string;

  @ApiProperty({ example: 299.9 })
  @IsNumber()
  gift_price: number;
}

export enum PaymentMethodEnum {
  PIX = 'pix',
  CREDIT_CARD = 'credit_card',
}

export class CreditCardDto {
  @ApiProperty({ example: 'João da Silva' })
  @IsString()
  @IsNotEmpty()
  holder_name: string;

  @ApiProperty({ example: '1234567890123456' })
  @IsString()
  @IsNotEmpty()
  number: string;

  @ApiProperty({ example: '10' })
  @IsString()
  @IsNotEmpty()
  expiry_month: string;

  @ApiProperty({ example: '2026' })
  @IsString()
  @IsNotEmpty()
  expiry_year: string;

  @ApiProperty({ example: '123' })
  @IsString()
  @IsNotEmpty()
  ccv: string;
}

export class CreditCardHolderInfoDto {
  @ApiProperty({ example: 'João da Silva' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'joao@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '44591902811' })
  @IsString()
  @IsNotEmpty()
  cpf_cnpj: string;

  @ApiProperty({ example: '02976230' })
  @IsString()
  @IsNotEmpty()
  postal_code: string;

  @ApiProperty({ example: '123' })
  @IsString()
  @IsNotEmpty()
  address_number: string;

  @ApiProperty({ example: '11980540272' })
  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'João da Silva' })
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  guest_name: string;

  @ApiProperty({ example: '11999998888' })
  @IsString()
  @IsNotEmpty({ message: 'Telefone é obrigatório' })
  guest_phone: string;

  @ApiProperty({ example: '12345678900' })
  @IsString()
  @IsNotEmpty({ message: 'Documento (CPF) é obrigatório' })
  guest_document: string;

  @ApiProperty({ example: 'Parabéns aos noivos!', required: false })
  @IsOptional()
  @IsString()
  guest_message?: string;

  @ApiProperty({ enum: PaymentMethodEnum, example: 'pix' })
  @IsEnum(PaymentMethodEnum, { message: 'Método de pagamento deve ser pix ou credit_card' })
  payment_method: PaymentMethodEnum;

  @ApiProperty({ type: CreditCardDto, required: false })
  @ValidateIf((o) => o.payment_method === PaymentMethodEnum.CREDIT_CARD)
  @ValidateNested()
  @IsNotEmpty({ message: 'Dados do cartão são obrigatórios para pagamento com cartão' })
  @Type(() => CreditCardDto)
  credit_card?: CreditCardDto;

  @ApiProperty({ type: CreditCardHolderInfoDto, required: false })
  @ValidateIf((o) => o.payment_method === PaymentMethodEnum.CREDIT_CARD)
  @ValidateNested()
  @IsNotEmpty({ message: 'Dados do titular são obrigatórios para pagamento com cartão' })
  @Type(() => CreditCardHolderInfoDto)
  credit_card_holder_info?: CreditCardHolderInfoDto;

  @ApiProperty({ example: '116.213.42.532', required: false })
  @ValidateIf((o) => o.payment_method === PaymentMethodEnum.CREDIT_CARD)
  @IsString()
  @IsNotEmpty({ message: 'IP remoto é obrigatório para pagamento com cartão' })
  remote_ip?: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Pedido deve conter ao menos 1 item' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
