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
} from 'class-validator';

export class RsvpAttendeeDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  guest_id: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  will_attend: boolean;
}

export class SubmitRsvpDto {
  @ApiProperty({
    example: 'João da Silva',
    description:
      'Nome atualizado do convidado principal. Obrigatório e deve ser diferente do cadastrado.',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: '11999998888',
    description:
      'Celular atualizado do convidado principal. Obrigatório e deve ser diferente do cadastrado.',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ type: [RsvpAttendeeDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RsvpAttendeeDto)
  attendees: RsvpAttendeeDto[];
}
