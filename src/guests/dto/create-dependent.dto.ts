import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDependentDto {
  @ApiProperty({ example: 'Maria Silva' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '11988887777', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: '12345678901', required: false })
  @IsOptional()
  @IsString()
  document?: string;

  @ApiProperty({
    example: '5 anos',
    required: false,
    description: 'Observação opcional (ex.: idade da criança)',
  })
  @IsOptional()
  @IsString()
  observation?: string;
}
