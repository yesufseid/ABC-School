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
  private readonly s3client: S3Client;

  private bucketConfig: { bucket: string; objectLinkExpiration: number } = {
    bucket: 'my-bucket',
    objectLinkExpiration: 1800,
  };

  constructor(private readonly configService: ConfigService) {
    const credentials = this.findS3Credentials();
    this.s3client = new S3Client({
      endpoint: credentials.s3Endpoint,
      region: credentials.s3Region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: credentials.s3AccessKeyId,
        secretAccessKey: credentials.s3SecretAccessKey,
      },
    });
  }

  async putObject(file: Express.Multer.File) {
    const key = file.originalname + new Date().getTime() + randomStr();

    try {
      await this.s3client.send(
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
    await this.s3client.send(
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

    return await getSignedUrl(
      this.s3client,
      new GetObjectCommand({ Bucket: this.bucketConfig.bucket, Key: key }),
      {
        expiresIn: this.bucketConfig.objectLinkExpiration,
      },
    );
  }

  private findS3Credentials() {
    const s3Endpoint = this.configService.get(S3_ENDPOINT);
    const s3Region = this.configService.get(S3_REGION);
    const s3AccessKeyId = this.configService.get(S3_ACCESS_KEY_ID);
    const s3SecretAccessKey = this.configService.get(S3_SECRET_ACCESS_KEY);
    const s3Bucket = this.configService.get(S3_BUCKET);
    const s3ObjectLinkExpiration =
      parseInt(this.configService.get(S3_OBJECT_LINK_EXPIRATION), 10) || 1800;

    if (
      !s3Endpoint ||
      !s3Region ||
      !s3AccessKeyId ||
      !s3SecretAccessKey ||
      !s3Bucket
    ) {
      this.logger.error(
        `S3 compatible object storage credentials are required`,
      );
      process.exit(1);
    }

    this.bucketConfig = {
      bucket: s3Bucket,
      objectLinkExpiration: s3ObjectLinkExpiration,
    };

    return {
      s3Endpoint,
      s3Region,
      s3AccessKeyId,
      s3SecretAccessKey,
      s3Bucket,
    };
  }
}
