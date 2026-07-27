import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CreateDependentNestedDto {
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

export class CreateGuestDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '11999998888', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: '12345678900', required: false })
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

  @ApiProperty({
    type: [CreateDependentNestedDto],
    required: false,
    description: 'Subconvidados criados junto com o principal',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDependentNestedDto)
  dependents?: CreateDependentNestedDto[];
}
