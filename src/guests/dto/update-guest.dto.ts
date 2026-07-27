import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateGuestDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  phone?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  document?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Observação opcional (ex.: idade da criança). Vazio remove o valor.',
  })
  @IsOptional()
  @IsString()
  observation?: string | null;
}
