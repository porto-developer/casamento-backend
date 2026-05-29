import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { Message } from './message.entity';

function toResponseDto(message: Message): MessageResponseDto {
  return {
    id: message.id,
    name: message.name,
    message: message.message,
    created_at: message.created_at,
    updated_at: message.updated_at,
  };
}

@ApiTags('messages')
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @ApiCreatedResponse({ type: MessageResponseDto })
  async create(@Body() dto: CreateMessageDto): Promise<MessageResponseDto> {
    const message = await this.messagesService.create(dto);
    return toResponseDto(message);
  }

  @Get()
  @ApiOkResponse({ type: [MessageResponseDto] })
  async findAll(): Promise<MessageResponseDto[]> {
    const messages = await this.messagesService.findAll();
    return messages.map(toResponseDto);
  }

  @Get(':id')
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiNotFoundResponse({ description: 'Message not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<MessageResponseDto> {
    const message = await this.messagesService.findOne(id);
    return toResponseDto(message);
  }

  @Patch(':id')
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiNotFoundResponse({ description: 'Message not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMessageDto,
  ): Promise<MessageResponseDto> {
    const message = await this.messagesService.update(id, dto);
    return toResponseDto(message);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Message deleted' })
  @ApiNotFoundResponse({ description: 'Message not found' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.messagesService.remove(id);
  }
}
