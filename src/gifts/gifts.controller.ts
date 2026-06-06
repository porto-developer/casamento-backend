import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseIntPipe,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { GiftsService } from './gifts.service';
import { GiftResponseDto } from './dto/gift-response.dto';
import { CreateGiftDto } from './dto/create-gift.dto';
import { UpdateGiftDto } from './dto/update-gift.dto';

const IMAGE_MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@ApiTags('Gifts')
@Controller('gifts')
export class GiftsController {
  constructor(private readonly giftsService: GiftsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista todos os presentes' })
  @ApiResponse({ status: 200, type: [GiftResponseDto] })
  findAll() {
    return this.giftsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de um presente' })
  @ApiResponse({ status: 200, type: GiftResponseDto })
  @ApiResponse({ status: 404, description: 'Presente não encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.giftsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Cria um novo presente' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'price'],
      properties: {
        name: { type: 'string', example: 'Jogo de Panelas' },
        description: { type: 'string', example: 'Jogo com 5 peças' },
        price: { type: 'number', example: 299.9 },
        category: { type: 'string', example: 'Cozinha' },
        is_available: { type: 'boolean', example: true },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, type: GiftResponseDto })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: IMAGE_MAX_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Formato inválido. Use JPEG, PNG ou WebP.',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  create(
    @Body() dto: CreateGiftDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.giftsService.create(dto, image);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um presente' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Jogo de Panelas' },
        description: { type: 'string', example: 'Jogo com 5 peças' },
        price: { type: 'number', example: 299.9 },
        category: { type: 'string', example: 'Cozinha' },
        is_available: { type: 'boolean', example: true },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 200, type: GiftResponseDto })
  @ApiResponse({ status: 404, description: 'Presente não encontrado' })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: IMAGE_MAX_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          return cb(
            new BadRequestException('Formato inválido. Use JPEG, PNG ou WebP.'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGiftDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.giftsService.update(id, dto, image);
  }
}
