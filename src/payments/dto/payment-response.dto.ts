import { ApiProperty } from '@nestjs/swagger';

export class PaymentStatusResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  order_id: number;

  @ApiProperty()
  method: string;

  @ApiProperty()
  amount: number;

  @ApiProperty({ example: 1, description: 'Número de parcelas (cartão); 1 para PIX' })
  installments: number;

  @ApiProperty()
  status: string;

  @ApiProperty({ nullable: true })
  pix_qr_code: string | null;

  @ApiProperty({ nullable: true })
  pix_copy_paste: string | null;

  @ApiProperty({ nullable: true })
  expires_at: Date | null;

  @ApiProperty()
  created_at: Date;
}

export class PaymentConfirmResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  payment_id: string;

  @ApiProperty()
  payment_method: string;

  @ApiProperty({ nullable: true })
  card_last_four: string | null;

  @ApiProperty()
  installments: number;
}
