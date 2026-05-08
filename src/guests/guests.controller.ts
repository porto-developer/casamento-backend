import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { StreamableFile } from '@nestjs/common';
import { GuestsService } from './guests.service';
import { SubmitRsvpDto } from './dto/submit-rsvp.dto';
import {
  RsvpGroupResponseDto,
  RsvpMemberDto,
} from './dto/rsvp-group-response.dto';
import { GuestListGroupDto, GuestListMemberDto } from './dto/guest-list.dto';
import { Guest } from './guest.entity';

function toRsvpMemberDto(guest: Guest, primaryId: number): RsvpMemberDto {
  return {
    id: guest.id,
    name: guest.name,
    phone: guest.phone,
    document: guest.document,
    parent_guest_id: guest.parent_guest_id,
    will_attend: guest.will_attend,
    rsvp_updated_at: guest.rsvp_updated_at,
    is_primary: guest.id === primaryId,
  };
}

@ApiTags('Guests')
@Controller('guests')
export class GuestsController {
  constructor(private readonly guestsService: GuestsService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar convidados e status de presença',
    description:
      'Retorna os convidados principais e seus subconvidados agrupados, com contagem de presença.',
  })
  @ApiResponse({ status: 200, type: [GuestListGroupDto] })
  async findAll(): Promise<GuestListGroupDto[]> {
    const groups = await this.guestsService.findAllGrouped();

    return groups.map((group) => {
      const { principal, members } = group;
      const dependents = members.filter((m) => m.id !== principal.id);

      const attending = members.filter((m) => m.will_attend === true).length;
      const declined = members.filter((m) => m.will_attend === false).length;
      const pending = members.filter((m) => m.will_attend == null).length;

      const mapMember = (guest: Guest, isPrimary: boolean): GuestListMemberDto => ({
        id: guest.id,
        name: guest.name,
        phone: guest.phone,
        document: guest.document,
        parent_guest_id: guest.parent_guest_id,
        will_attend: guest.will_attend,
        rsvp_updated_at: guest.rsvp_updated_at,
        is_primary: isPrimary,
        created_at: guest.created_at,
      });

      return {
        principal: mapMember(principal, true),
        dependents: dependents.map((d) => mapMember(d, false)),
        attending,
        declined,
        pending,
        rsvp_status: pending > 0 ? 'pending' : 'answered',
      };
    });
  }

  @Get('rsvp/:token')
  @ApiOperation({
    summary: 'Consultar grupo do convite (RSVP)',
    description:
      'Retorna o convidado principal e subconvidados com o estado atual da confirmação.',
  })
  @ApiParam({ name: 'token', format: 'uuid' })
  @ApiResponse({ status: 200, type: RsvpGroupResponseDto })
  @ApiResponse({ status: 404, description: 'Convite não encontrado' })
  async getRsvpGroup(
    @Param('token', ParseUUIDPipe) token: string,
  ): Promise<RsvpGroupResponseDto> {
    const members = await this.guestsService.findRsvpGroupByToken(token);
    const primaryId = members[0].id;
    return {
      members: members.map((g) => toRsvpMemberDto(g, primaryId)),
    };
  }

  @Put('rsvp/:token')
  @ApiOperation({
    summary: 'Enviar confirmação de presença',
    description:
      'Deve incluir um item por cada pessoa do convite (principal + todos os subconvidados).',
  })
  @ApiParam({ name: 'token', format: 'uuid' })
  @ApiResponse({ status: 200, type: RsvpGroupResponseDto })
  @ApiResponse({ status: 400, description: 'Lista inválida' })
  @ApiResponse({ status: 404, description: 'Convite não encontrado' })
  async submitRsvp(
    @Param('token', ParseUUIDPipe) token: string,
    @Body() dto: SubmitRsvpDto,
  ): Promise<RsvpGroupResponseDto> {
    const members = await this.guestsService.submitRsvp(token, dto);
    const primaryId = members[0].id;
    return {
      members: members.map((g) => toRsvpMemberDto(g, primaryId)),
    };
  }

  @Get('export/pdf')
  @ApiOperation({
    summary: 'Exportar lista de convidados em PDF',
    description:
      'Gera um PDF simples com todos os convidados e o status de presença para impressão.',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF gerado com sucesso',
    content: { 'application/pdf': {} },
  })
  async exportPdf(): Promise<StreamableFile> {
    const buffer = await this.guestsService.buildGuestListPdfBuffer();
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: 'attachment; filename="lista-convidados.pdf"',
    });
  }
}
