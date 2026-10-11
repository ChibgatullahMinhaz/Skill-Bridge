import { env } from '@/config/env';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  region: env.R2.REGION || 'auto',
  ...(env.R2.ENDPOINT ? { endpoint: env.R2.ENDPOINT } : {}),
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.R2.ACCESS_KEY_ID || '',
    secretAccessKey: env.R2.SECRET_ACCESS_KEY || '',
  },
});



export function normalizeKey(keyOrUrl: string) {
  if (!keyOrUrl) return keyOrUrl;

  const cleanUrl = keyOrUrl.split('?')[0] || keyOrUrl;

  if (env.R2.ENDPOINT && env.R2.BUCKET) {
    const prefix = `${env.R2.ENDPOINT.replace(/\/$/, '')}/${env.R2.BUCKET}`;
    if (cleanUrl.startsWith(prefix)) {
      return cleanUrl.replace(prefix, '').replace(/^\//, '');
    }
  }

  return cleanUrl;
}

export async function uploadBufferToR2(key: string, body: Buffer, contentType = 'application/octet-stream') {
  const bucket = env.R2.BUCKET;
  if (!bucket) throw new Error('R2 bucket is not configured');

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return key;
}

export async function getPresignedUploadUrl(key: string, contentType: string, expiresInSeconds = 300) {
  const bucket = env.R2.BUCKET;
  if (!bucket) throw new Error('R2 bucket is not configured');

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });

  return { uploadUrl, key };
}

export async function getPresignedDownloadUrl(keyOrUrl: string, expiresInSeconds = 3600) {
  if (!keyOrUrl) return keyOrUrl;

  const bucket = env.R2.BUCKET;
  if (!bucket) throw new Error('R2 bucket is not configured');

  const key = normalizeKey(keyOrUrl);

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

export async function deleteFromR2(keyOrUrl: string) {
  const bucket = env.R2.BUCKET;
  if (!bucket) throw new Error('R2 bucket is not configured');

  const key = normalizeKey(keyOrUrl);

  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );

  return true;
}

export default {
  uploadBufferToR2,
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  deleteFromR2,
  normalizeKey,
};