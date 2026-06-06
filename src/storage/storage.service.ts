import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { extname } from 'path';

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucketName: string;
  private readonly endpointUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.endpointUrl = this.configService.get<string>('AWS_ENDPOINT_URL')!;
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME')!;

    this.s3 = new S3Client({
      endpoint: this.endpointUrl,
      region: this.configService.get<string>('AWS_DEFAULT_REGION') ?? 'auto',
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID')!,
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
        )!,
      },
      forcePathStyle: false,
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    folder = 'gifts',
  ): Promise<string> {
    const ext = extname(file.originalname).toLowerCase();
    const key = `${folder}/${randomUUID()}${ext}`;

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
    } catch (err) {
      console.error(err);
      throw new InternalServerErrorException(
        `Falha ao fazer upload da imagem: ${(err as Error).message}`,
      );
    }

    return key;
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    return getSignedUrl(this.s3, command, { expiresIn });
  }

  /**
   * Accepts either a bare key ("gifts/uuid.jpg") or the old full URL format
   * ("https://storage.railway.app/bucket/gifts/uuid.jpg") for backwards compatibility.
   */
  private extractKey(keyOrUrl: string): string {
    const prefix = `${this.endpointUrl.replace(/\/$/, '')}/${this.bucketName}/`;
    return keyOrUrl.startsWith(prefix) ? keyOrUrl.slice(prefix.length) : keyOrUrl;
  }

  async deleteFile(keyOrUrl: string): Promise<void> {
    const key = this.extractKey(keyOrUrl);

    try {
      await this.s3.send(
        new DeleteObjectCommand({ Bucket: this.bucketName, Key: key }),
      );
    } catch (err) {
      console.error(`Falha ao remover imagem do bucket: ${(err as Error).message}`);
    }
  }
}
