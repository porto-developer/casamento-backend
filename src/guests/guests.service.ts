import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { Guest } from './guest.entity';
import { SubmitRsvpDto } from './dto/submit-rsvp.dto';
import { CreateGuestDto } from './dto/create-guest.dto';
import { CreateDependentDto } from './dto/create-dependent.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import {
  parseOptionalBrazilPhone,
  parseOptionalBrazilCpf,
  parseRequiredBrazilPhone,
} from '../common/utils/brazil-contact.util';
import { throwIfPostgresUniqueViolation } from '../common/utils/postgres-unique.util';

@Injectable()
export class GuestsService {
  constructor(
    @InjectRepository(Guest)
    private readonly guestRepository: Repository<Guest>,
    private readonly dataSource: DataSource,
  ) {}

  async findAllGrouped(): Promise<
    {
      principal: Guest;
      members: Guest[];
    }[]
  > {
    const principals = await this.guestRepository.find({
      where: { parent_guest_id: IsNull() },
      relations: ['children'],
      order: { id: 'ASC' },
    });

    return principals.map((principal) => {
      const children = (principal.children ?? []).slice().sort((a, b) => a.id - b.id);
      return {
        principal,
        members: [principal, ...children],
      };
    });
  }

  async findRsvpGroupByToken(token: string): Promise<Guest[]> {
    const principal = await this.guestRepository.findOne({
      where: { invite_token: token },
      relations: ['children'],
    });

    if (!principal) {
      throw new NotFoundException('Convite não encontrado');
    }

    const members = [
      principal,
      ...(principal.children ?? []).slice().sort((a, b) => a.id - b.id),
    ];
    return members;
  }

  async submitRsvp(token: string, dto: SubmitRsvpDto): Promise<Guest[]> {
    const principal = await this.guestRepository.findOne({
      where: { invite_token: token },
      relations: ['children'],
    });

    if (!principal) {
      throw new NotFoundException('Convite não encontrado');
    }

    const membersById = new Map<number, Guest>([
      [principal.id, principal],
      ...(principal.children ?? []).map(
        (c): [number, Guest] => [c.id, c],
      ),
    ]);

    const allowed = new Set(membersById.keys());

    const payloadIds = dto.attendees.map((a) => a.guest_id);
    if (payloadIds.length !== allowed.size) {
      throw new BadRequestException(
        'A lista de participantes deve incluir exatamente todos os membros do convite',
      );
    }

    if (new Set(payloadIds).size !== payloadIds.length) {
      throw new BadRequestException('guest_id duplicado na lista');
    }

    for (const id of payloadIds) {
      if (!allowed.has(id)) {
        throw new BadRequestException(
          `Participante ${id} não pertence a este convite`,
        );
      }
    }

    const normalized = dto.attendees.map((row) => {
      const current = membersById.get(row.guest_id)!;

      let name = current.name;
      let phone = current.phone;

      if (row.will_attend) {
        if (row.name == null || row.name.trim() === '') {
          throw new BadRequestException(
            `O nome do participante ${row.guest_id} é obrigatório quando confirma presença`,
          );
        }
        if (row.phone == null || row.phone.trim() === '') {
          throw new BadRequestException(
            `O celular do participante ${row.guest_id} é obrigatório quando confirma presença`,
          );
        }

        name = row.name.trim();
        phone = parseRequiredBrazilPhone(row.phone);

        if (name === current.name.trim()) {
          throw new BadRequestException(
            `O nome do participante ${row.guest_id} deve ser diferente do cadastrado`,
          );
        }

        if (phone === current.phone) {
          throw new BadRequestException(
            `O celular do participante ${row.guest_id} deve ser diferente do cadastrado`,
          );
        }
      } else {
        if (row.name != null && row.name.trim() !== '') {
          name = row.name.trim();
        }
        if (row.phone != null && row.phone.trim() !== '') {
          phone = parseRequiredBrazilPhone(row.phone);
        }
      }

      const observation =
        row.observation === undefined
          ? current.observation
          : row.observation === null || row.observation.trim() === ''
            ? null
            : row.observation.trim();

      return { ...row, name, phone, observation };
    });

    const now = new Date();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const row of normalized) {
        await queryRunner.manager.update(
          Guest,
          { id: row.guest_id },
          {
            name: row.name,
            phone: row.phone,
            observation: row.observation,
            will_attend: row.will_attend,
            rsvp_updated_at: now,
          },
        );
      }
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    return this.findRsvpGroupByToken(token);
  }

  async create(dto: CreateGuestDto): Promise<Guest> {
    const phone = parseOptionalBrazilPhone(dto.phone);
    const document = parseOptionalBrazilCpf(dto.document);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let principalId!: number;

    try {
      const principal = queryRunner.manager.create(Guest, {
        name: dto.name.trim(),
        phone,
        document,
        observation:
          dto.observation?.trim() ? dto.observation.trim() : null,
        parent_guest_id: null,
      });
      const savedPrincipal = await queryRunner.manager.save(principal);
      principalId = savedPrincipal.id;

      if (dto.dependents?.length) {
        for (const dep of dto.dependents) {
          const childPhone = parseOptionalBrazilPhone(dep.phone);
          const childDoc = parseOptionalBrazilCpf(dep.document);
          const child = queryRunner.manager.create(Guest, {
            name: dep.name.trim(),
            phone: childPhone,
            document: childDoc,
            observation:
              dep.observation?.trim() ? dep.observation.trim() : null,
            parent_guest_id: principalId,
          });
          await queryRunner.manager.save(child);
        }
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throwIfPostgresUniqueViolation(
        err,
        'Documento já cadastrado para outro convidado',
      );
      throw err;
    } finally {
      await queryRunner.release();
    }

    const reloaded = await this.guestRepository.findOne({
      where: { id: principalId },
      relations: ['children'],
    });
    if (!reloaded) {
      throw new NotFoundException('Convidado não encontrado após criação');
    }
    return reloaded;
  }

  async createDependent(
    principalId: number,
    dto: CreateDependentDto,
  ): Promise<Guest> {
    const principal = await this.guestRepository.findOne({
      where: { id: principalId, parent_guest_id: IsNull() },
    });
    if (!principal) {
      throw new NotFoundException(
        'Convidado principal não encontrado ou o id não é de um principal',
      );
    }

    const phone = parseOptionalBrazilPhone(dto.phone);
    const document = parseOptionalBrazilCpf(dto.document);

    const child = this.guestRepository.create({
      name: dto.name.trim(),
      phone,
      document,
      observation:
        dto.observation?.trim() ? dto.observation.trim() : null,
      parent_guest_id: principalId,
    });

    try {
      return await this.guestRepository.save(child);
    } catch (err) {
      throwIfPostgresUniqueViolation(
        err,
        'Documento já cadastrado para outro convidado',
      );
      throw err;
    }
  }

  async findOne(id: number): Promise<Guest> {
    const guest = await this.guestRepository.findOne({
      where: { id },
      relations: ['children'],
    });
    if (!guest) {
      throw new NotFoundException('Convidado não encontrado');
    }
    if (guest.parent_guest_id != null) {
      guest.children = [];
    } else if (guest.children) {
      guest.children = guest.children.slice().sort((a, b) => a.id - b.id);
    }
    return guest;
  }

  async update(id: number, dto: UpdateGuestDto): Promise<Guest> {
    const guest = await this.guestRepository.findOne({ where: { id } });
    if (!guest) {
      throw new NotFoundException('Convidado não encontrado');
    }

    if (dto.name !== undefined) {
      guest.name = dto.name.trim();
    }
    if (dto.phone !== undefined) {
      guest.phone =
        dto.phone === null || dto.phone === ''
          ? null
          : parseOptionalBrazilPhone(dto.phone);
    }
    if (dto.document !== undefined) {
      guest.document =
        dto.document === null || dto.document === ''
          ? null
          : parseOptionalBrazilCpf(dto.document);
    }
    if (dto.observation !== undefined) {
      guest.observation =
        dto.observation === null || dto.observation.trim() === ''
          ? null
          : dto.observation.trim();
    }

    try {
      await this.guestRepository.save(guest);
    } catch (err) {
      throwIfPostgresUniqueViolation(
        err,
        'Documento já cadastrado para outro convidado',
      );
      throw err;
    }

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const guest = await this.guestRepository.findOne({ where: { id } });
    if (!guest) {
      throw new NotFoundException('Convidado não encontrado');
    }
    await this.guestRepository.remove(guest);
  }

  private presenceLabel(willAttend: boolean | null): string {
    if (willAttend === true) return 'Sim';
    if (willAttend === false) return 'Não';
    return 'Pendente';
  }

  private async findAllGuestsFlat(): Promise<Guest[]> {
    return this.guestRepository.find({ order: { id: 'ASC' } });
  }

  async buildGuestListPdfBuffer(): Promise<Buffer> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });

    const chunks: Uint8Array[] = [];
    return await new Promise<Buffer>(async (resolve, reject) => {
      doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: Error) => reject(err));

      const guests = await this.findAllGuestsFlat();
      const now = new Date();

      const attending = guests.filter((g) => g.will_attend === true).length;
      const declined = guests.filter((g) => g.will_attend === false).length;
      const pending = guests.filter((g) => g.will_attend == null).length;

      doc.fontSize(18).text('Lista de convidados', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Gerado em: ${now.toLocaleString('pt-BR')}`, {
        align: 'center',
      });
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .text(
          `Resumo: Sim=${attending}  Não=${declined}  Pendente=${pending}`,
          { align: 'center' },
        );
      doc.moveDown();

      doc.fontSize(10).text('Nome', { continued: true, width: 250 });
      doc.text('Presença', { align: 'right' });
      doc.moveDown(0.25);

      for (const guest of guests) {
        doc.text(guest.name, { continued: true, width: 250 });
        doc.text(this.presenceLabel(guest.will_attend), { align: 'right' });
      }

      doc.end();
    });
  }

  async buildGuestListXlsxBuffer(): Promise<Buffer> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Wedding Gifts API';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Lista de convidados', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    sheet.columns = [
      { header: 'Nome', key: 'name', width: 28 },
      { header: 'Tipo', key: 'type', width: 14 },
      { header: 'Telefone', key: 'phone', width: 16 },
      { header: 'Documento', key: 'document', width: 16 },
      { header: 'Observação', key: 'observation', width: 32 },
      { header: 'Presença', key: 'presence', width: 12 },
      { header: 'RSVP atualizado em', key: 'rsvpUpdatedAt', width: 22 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle' };

    const guests = await this.findAllGuestsFlat();

    for (const guest of guests) {
      sheet.addRow({
        name: guest.name,
        type: guest.parent_guest_id == null ? 'Principal' : 'Dependente',
        phone: guest.phone ?? '',
        document: guest.document ?? '',
        observation: guest.observation ?? '',
        presence: this.presenceLabel(guest.will_attend),
        rsvpUpdatedAt: guest.rsvp_updated_at
          ? guest.rsvp_updated_at.toLocaleString('pt-BR')
          : '',
      });
    }

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }
}
