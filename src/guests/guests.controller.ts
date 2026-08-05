import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
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
import { CreateGuestDto } from './dto/create-guest.dto';
import { CreateDependentDto } from './dto/create-dependent.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { GuestCrudResponseDto } from './dto/guest-crud-response.dto';

function guestToCrudRow(guest: Guest): GuestCrudResponseDto {
  return {
    id: guest.id,
    name: guest.name,
    phone: guest.phone,
    document: guest.document,
    observation: guest.observation,
    parent_guest_id: guest.parent_guest_id,
    will_attend: guest.will_attend,
    rsvp_updated_at: guest.rsvp_updated_at,
    invite_token: guest.invite_token,
    created_at: guest.created_at,
  };
}

function toGuestCrudResponseDto(guest: Guest): GuestCrudResponseDto {
  const base = guestToCrudRow(guest);
  if (guest.children?.length) {
    base.dependents = guest.children.map((c) => guestToCrudRow(c));
  }
  return base;
}

function toRsvpMemberDto(guest: Guest, primaryId: number): RsvpMemberDto {
  return {
    id: guest.id,
    name: guest.name,
    phone: guest.phone,
    document: guest.document,
    observation: guest.observation,
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
        observation: guest.observation,
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

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar convidado principal',
    description:
      'Cria o convidado principal (com token de convite) e opcionalmente subconvidados na mesma requisição.',
  })
  @ApiBody({ type: CreateGuestDto })
  @ApiResponse({ status: 201, type: GuestCrudResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 409, description: 'Documento duplicado' })
  async create(@Body() dto: CreateGuestDto): Promise<GuestCrudResponseDto> {
    const guest = await this.guestsService.create(dto);
    return toGuestCrudResponseDto(guest);
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
      'Confirma presença de todos os membros. Quando will_attend=true, nome e celular são obrigatórios e devem ser diferentes dos cadastrados. Quando will_attend=false, atualização de dados é opcional.',
  })
  @ApiParam({ name: 'token', format: 'uuid' })
  @ApiBody({ type: SubmitRsvpDto })
  @ApiResponse({ status: 200, type: RsvpGroupResponseDto })
  @ApiResponse({
    status: 400,
    description:
      'Lista inválida, telefone inválido, ou nome/celular iguais aos já cadastrados (apenas quando will_attend=true)',
  })
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

  @Get(':id')
  @ApiOperation({ summary: 'Buscar convidado por id' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, type: GuestCrudResponseDto })
  @ApiResponse({ status: 404, description: 'Não encontrado' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<GuestCrudResponseDto> {
    const guest = await this.guestsService.findOne(id);
    return toGuestCrudResponseDto(guest);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar convidado',
    description:
      'Atualiza nome, telefone e/ou documento. Telefone ou documento vazios removem o valor.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateGuestDto })
  @ApiResponse({ status: 200, type: GuestCrudResponseDto })
  @ApiResponse({ status: 404, description: 'Não encontrado' })
  @ApiResponse({ status: 409, description: 'Documento duplicado' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGuestDto,
  ): Promise<GuestCrudResponseDto> {
    const guest = await this.guestsService.update(id, dto);
    return toGuestCrudResponseDto(guest);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remover convidado',
    description:
      'Remove o convidado. Se for principal, subconvidados são removidos em cascata.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 204, description: 'Removido' })
  @ApiResponse({ status: 404, description: 'Não encontrado' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.guestsService.remove(id);
  }

  @Post(':principalId/dependents')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Adicionar subconvidado',
    description:
      'Cria um subconvidado vinculado ao convidado principal indicado.',
  })
  @ApiParam({ name: 'principalId', type: Number })
  @ApiBody({ type: CreateDependentDto })
  @ApiResponse({ status: 201, type: GuestCrudResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Principal não encontrado' })
  @ApiResponse({ status: 409, description: 'Documento duplicado' })
  async createDependent(
    @Param('principalId', ParseIntPipe) principalId: number,
    @Body() dto: CreateDependentDto,
  ): Promise<GuestCrudResponseDto> {
    const child = await this.guestsService.createDependent(principalId, dto);
    return toGuestCrudResponseDto(child);
  }
}
