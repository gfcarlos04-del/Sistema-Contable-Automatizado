// Cliente Cloudflare R2 (S3-compatible) + URLs firmadas.
// Las credenciales R2 son opcionales en F0: si faltan, las funciones lanzan
// un error claro. Se completan en F1 cuando habilitemos uploads.

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let cached: { client: S3Client; bucket: string } | null = null;

function getClient(): { client: S3Client; bucket: string } {
  if (cached) return cached;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      "R2 no está configurado. Definí R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY y R2_BUCKET.",
    );
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  cached = { client, bucket };
  return cached;
}

/**
 * Genera la ruta canónica del archivo dentro del bucket.
 * Aísla por organización + cliente + fecha de subida, conforme al SDD §13.
 */
export function buildStorageKey(params: {
  organizacionId: string;
  clienteId: string;
  fecha: Date;
  hashSha256: string;
  extension: string;
}): string {
  const año = params.fecha.getUTCFullYear();
  const mes = String(params.fecha.getUTCMonth() + 1).padStart(2, "0");
  const ext = params.extension.replace(/^\.+/, "").toLowerCase();
  return `org/${params.organizacionId}/clientes/${params.clienteId}/${año}/${mes}/${params.hashSha256}.${ext}`;
}

/**
 * Sube un buffer directamente a R2 desde el servidor (sin URL firmada).
 * Usado por la API de upload para archivos recibidos como FormData.
 */
export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  const { client, bucket } = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentLength: body.length,
    }),
  );
}

export async function deleteObject(key: string): Promise<void> {
  const { client, bucket } = getClient();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function presignedPutUrl(key: string, contentType: string, expiresInSeconds = 600) {
  const { client, bucket } = getClient();
  return getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
    { expiresIn: expiresInSeconds },
  );
}

export async function presignedGetUrl(key: string, expiresInSeconds = 300) {
  const { client, bucket } = getClient();
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn: expiresInSeconds,
  });
}
