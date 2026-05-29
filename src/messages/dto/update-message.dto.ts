import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateMessageDto {
  @ApiProperty({ required: false, example: 'João Silva' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiProperty({ required: false, example: 'Parabéns pelo casamento! Muita felicidade!' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  message?: string;
}
