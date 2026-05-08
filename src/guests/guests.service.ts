import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Guest } from './guest.entity';
import { SubmitRsvpDto } from './dto/submit-rsvp.dto';

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
      where: { parent_guest_id: undefined },
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

    const allowed = new Set<number>([
      principal.id,
      ...(principal.children ?? []).map((c) => c.id),
    ]);

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

    const now = new Date();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const row of dto.attendees) {
        await queryRunner.manager.update(
          Guest,
          { id: row.guest_id },
          {
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

  async buildGuestListPdfBuffer(): Promise<Buffer> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });

    const chunks: Uint8Array[] = [];
    return await new Promise<Buffer>(async (resolve, reject) => {
      doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: Error) => reject(err));

      const groups = await this.findAllGrouped();
      const now = new Date();

      doc.fontSize(18).text('Lista de convidados', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Gerado em: ${now.toLocaleString('pt-BR')}`, {
        align: 'center',
      });
      doc.moveDown();

      for (const group of groups) {
        const { principal, members } = group;
        doc
          .moveDown()
          .fontSize(12)
          .text(`Convidado principal: ${principal.name}`, { continued: false });

        const attending = members.filter((m) => m.will_attend === true).length;
        const declined = members.filter((m) => m.will_attend === false).length;
        const pending = members.filter((m) => m.will_attend == null).length;

        doc
          .fontSize(10)
          .text(
            `Resumo: Sim=${attending}  Não=${declined}  Pendente=${pending}`,
          );
        doc.moveDown(0.5);

        doc.fontSize(10).text('Nome', { continued: true, width: 250 });
        doc.text('Presença', { align: 'right' });
        doc.moveDown(0.25);

        for (const member of members) {
          const presence =
            member.will_attend === true
              ? 'Sim'
              : member.will_attend === false
              ? 'Não'
              : 'Pendente';
          doc.text(member.name, { continued: true, width: 250 });
          doc.text(presence, { align: 'right' });
        }

        doc.moveDown();
      }

      doc.end();
    });
  }
}
