import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ConfirmPaymentDto {
  @ApiProperty({ example: 'pix', required: false })
  @IsOptional()
  @IsString()
  payment_method?: string;

  @ApiProperty({ example: '1234', required: false })
  @IsOptional()
  @IsString()
  card_last_four?: string;

  @ApiProperty({
    example: 1,
    required: false,
    minimum: 1,
    maximum: 6,
    description: 'Opcional. Se omitido, usa o valor persistido no pagamento.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(6)
  installments?: number;
}
