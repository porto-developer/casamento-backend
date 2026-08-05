import { ApiProperty } from '@nestjs/swagger';

export class OrderPixResponseDto {
  @ApiProperty()
  order_id: number;

  @ApiProperty()
  total: number;

  @ApiProperty({ example: 'pix' })
  payment_method: string;

  @ApiProperty()
  pix_code: string;

  @ApiProperty({ nullable: true })
  pix_qr_code: string | null;

  @ApiProperty()
  expires_at: Date;
}

export class OrderCardResponseDto {
  @ApiProperty()
  order_id: number;

  @ApiProperty()
  total: number;

  @ApiProperty({ example: 'credit_card' })
  payment_method: string;

  @ApiProperty({ example: 'processing' })
  status: string;

  @ApiProperty({ example: 1, description: 'Número de parcelas (1 a 6x sem juros)' })
  installments: number;
}
