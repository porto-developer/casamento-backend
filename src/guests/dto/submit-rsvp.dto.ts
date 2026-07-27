import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsInt,
  IsBoolean,
  IsString,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';

export class RsvpAttendeeDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  guest_id: number;

  @ApiProperty({
    example: 'João da Silva',
    description:
      'Nome atualizado. Obrigatório e deve ser diferente do cadastrado.',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: '11999998888',
    description:
      'Celular atualizado. Obrigatório e deve ser diferente do cadastrado. Pode se repetir entre membros do mesmo convite (ex.: criança com o celular do responsável).',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    example: '5 anos',
    required: false,
    nullable: true,
    description:
      'Observação opcional (ex.: idade da criança). Vazio ou null remove o valor.',
  })
  @IsOptional()
  @IsString()
  observation?: string | null;

  @ApiProperty({ example: true })
  @IsBoolean()
  will_attend: boolean;
}

export class SubmitRsvpDto {
  @ApiProperty({
    type: [RsvpAttendeeDto],
    description:
      'Um item por membro do convite (principal + acompanhantes). Cada um deve enviar nome e celular diferentes dos cadastrados. Observation é opcional.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RsvpAttendeeDto)
  attendees: RsvpAttendeeDto[];
}
