import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Gift } from './gift.entity';
import { CreateGiftDto } from './dto/create-gift.dto';
import { UpdateGiftDto } from './dto/update-gift.dto';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class GiftsService {
  constructor(
    @InjectRepository(Gift)
    private readonly giftRepository: Repository<Gift>,
    private readonly storageService: StorageService,
  ) {}

  async findAll(): Promise<Gift[]> {
    const gifts = await this.giftRepository.find({
      order: { category: 'ASC', name: 'ASC' },
    });
    return Promise.all(gifts.map((g) => this.resolveImageUrl(g)));
  }

  async findAvailable(): Promise<Gift[]> {
    const gifts = await this.giftRepository.find({
      where: { is_available: true },
      order: { category: 'ASC', name: 'ASC' },
    });
    return Promise.all(gifts.map((g) => this.resolveImageUrl(g)));
  }

  async findOne(id: number): Promise<Gift> {
    const gift = await this.giftRepository.findOne({ where: { id } });
    if (!gift) {
      throw new NotFoundException(`Presente com ID ${id} não encontrado`);
    }
    return this.resolveImageUrl(gift);
  }

  async create(
    dto: CreateGiftDto,
    image?: Express.Multer.File,
  ): Promise<Gift> {
    let image_url: string | null = null;

    if (image) {
      image_url = await this.storageService.uploadFile(image);
    }

    const gift = this.giftRepository.create({
      ...dto,
      image_url,
      is_available: dto.is_available ?? true,
    });

    const saved = await this.giftRepository.save(gift);
    return this.resolveImageUrl(saved);
  }

  async remove(id: number): Promise<void> {
    const gift = await this.giftRepository.findOne({ where: { id } });
    if (!gift) {
      throw new NotFoundException(`Presente com ID ${id} não encontrado`);
    }

    if (gift.image_url) {
      await this.storageService.deleteFile(gift.image_url);
    }

    await this.giftRepository.remove(gift);
  }

  async update(
    id: number,
    dto: UpdateGiftDto,
    image?: Express.Multer.File,
  ): Promise<Gift> {
    const gift = await this.giftRepository.findOne({ where: { id } });
    if (!gift) {
      throw new NotFoundException(`Presente com ID ${id} não encontrado`);
    }

    if (image) {
      if (gift.image_url) {
        await this.storageService.deleteFile(gift.image_url);
      }
      gift.image_url = await this.storageService.uploadFile(image);
    }

    Object.assign(gift, dto);

    const saved = await this.giftRepository.save(gift);
    return this.resolveImageUrl(saved);
  }

  /**
   * Returns a shallow copy of the gift with image_url replaced by a
   * temporary presigned URL (1 hour TTL). The raw key is kept in the DB.
   */
  private async resolveImageUrl(gift: Gift): Promise<Gift> {
    if (!gift.image_url) return gift;
    const presigned = await this.storageService.getPresignedUrl(gift.image_url);
    return { ...gift, image_url: presigned };
  }
}
