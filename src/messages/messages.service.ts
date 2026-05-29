import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './message.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messagesRepository: Repository<Message>,
  ) {}

  create(dto: CreateMessageDto): Promise<Message> {
    const message = this.messagesRepository.create(dto);
    return this.messagesRepository.save(message);
  }

  findAll(): Promise<Message[]> {
    return this.messagesRepository.find({ order: { created_at: 'DESC' } });
  }

  async findOne(id: number): Promise<Message> {
    const message = await this.messagesRepository.findOneBy({ id });
    if (!message) {
      throw new NotFoundException(`Message #${id} not found`);
    }
    return message;
  }

  async update(id: number, dto: UpdateMessageDto): Promise<Message> {
    const message = await this.findOne(id);
    Object.assign(message, dto);
    return this.messagesRepository.save(message);
  }

  async remove(id: number): Promise<void> {
    const message = await this.findOne(id);
    await this.messagesRepository.remove(message);
  }
}
