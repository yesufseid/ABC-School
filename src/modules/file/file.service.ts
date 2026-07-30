import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomStr } from 'src/common/utils/common.helpers';
import {
  S3_ACCESS_KEY_ID,
  S3_BUCKET,
  S3_ENDPOINT,
  S3_OBJECT_LINK_EXPIRATION,
  S3_REGION,
  S3_SECRET_ACCESS_KEY,
} from 'src/config/env.tokens';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);
  private s3client: S3Client | null = null;
  private bucketConfig: { bucket: string; objectLinkExpiration: number } = {
    bucket: 'my-bucket',
    objectLinkExpiration: 1800,
  };

  constructor(private readonly configService: ConfigService) {}

  async putObject(file: Express.Multer.File) {
    const client = this.getClient();
    const key = file.originalname + new Date().getTime() + randomStr();

    try {
      await client.send(
        new PutObjectCommand({
          Bucket: this.bucketConfig.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      return key;
    } catch (error) {
      this.logger.error(
        'Failed to store uploaded image',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async deleteObject(key: string) {
    const client = this.getClient();
    await client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketConfig.bucket,
        Key: key,
      }),
    );
  }

  async getSignedUrl(key: string) {
    if (!key) {
      return null;
    }

    const client = this.getClient();
    return await getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: this.bucketConfig.bucket, Key: key }),
      {
        expiresIn: this.bucketConfig.objectLinkExpiration,
      },
    );
  }

  private getClient(): S3Client {
    if (this.s3client) {
      return this.s3client;
    }

    const s3Endpoint = this.configService.get(S3_ENDPOINT);
    const s3Region = this.configService.get(S3_REGION);
    const s3AccessKeyId = this.configService.get(S3_ACCESS_KEY_ID);
    const s3SecretAccessKey = this.configService.get(S3_SECRET_ACCESS_KEY);
    const s3Bucket = this.configService.get(S3_BUCKET);

    if (
      !s3Endpoint ||
      !s3Region ||
      !s3AccessKeyId ||
      !s3SecretAccessKey ||
      !s3Bucket
    ) {
      throw new Error('S3 compatible object storage credentials are required');
    }

    this.bucketConfig = {
      bucket: s3Bucket,
      objectLinkExpiration:
        parseInt(this.configService.get(S3_OBJECT_LINK_EXPIRATION), 10) || 1800,
    };

    this.s3client = new S3Client({
      endpoint: s3Endpoint,
      region: s3Region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: s3AccessKeyId,
        secretAccessKey: s3SecretAccessKey,
      },
    });

    return this.s3client;
  }
}
