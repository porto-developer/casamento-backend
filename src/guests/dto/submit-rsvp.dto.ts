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
  ValidateIf,
} from 'class-validator';

export class RsvpAttendeeDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  guest_id: number;

  @ApiProperty({
    example: 'João da Silva',
    required: false,
    description:
      'Nome atualizado. Obrigatório e deve ser diferente do cadastrado quando will_attend=true. Quando will_attend=false, é opcional (pode omitir ou manter o atual).',
  })
  @ValidateIf((o: RsvpAttendeeDto) => o.will_attend === true)
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiProperty({
    example: '11999998888',
    required: false,
    description:
      'Celular atualizado. Obrigatório e deve ser diferente do cadastrado quando will_attend=true. Quando will_attend=false, é opcional. Pode se repetir entre membros do convite.',
  })
  @ValidateIf((o: RsvpAttendeeDto) => o.will_attend === true)
  @IsString()
  @IsNotEmpty()
  phone?: string;

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
      'Um item por membro do convite (principal + acompanhantes). Se will_attend=true, nome e celular são obrigatórios e devem diferir dos cadastrados. Se will_attend=false, atualização de dados é opcional.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RsvpAttendeeDto)
  attendees: RsvpAttendeeDto[];
}
