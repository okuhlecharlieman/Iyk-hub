import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { getGcsConfig, getPublicGcsUrl, getStorageClient } from '../../../../lib/storage/gcs';
import { handleApiError } from '../lib/api/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_CONTEXTS = new Set(['opportunities', 'showcase', 'sponsored-challenges', 'profiles', 'uploads']);
const IMAGE_EXTENSIONS = {
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const contextAliases = {
  challenges: 'sponsored-challenges',
  opportunity: 'opportunities',
  posts: 'showcase',
};

const normalizeContext = (value) => {
  const raw = String(value || 'uploads').toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const context = contextAliases[raw] || raw;
  return ALLOWED_CONTEXTS.has(context) ? context : 'uploads';
};

const sanitizeBaseName = (name) => {
  const withoutExtension = String(name || 'image')
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return withoutExtension || 'image';
};

const createObjectName = ({ context, uid, file }) => {
  const extension = IMAGE_EXTENSIONS[file.type] || 'bin';
  const baseName = sanitizeBaseName(file.name);
  const uniqueSuffix = `${Date.now()}-${randomUUID()}`;

  return `IYK-HUB/${context}/${uid}/${uniqueSuffix}-${baseName}.${extension}`;
};

export async function POST(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'uploads:images', limit: 30, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'An image file is required.' }, { status: 400 });
    }

    if (!IMAGE_EXTENSIONS[file.type]) {
      return NextResponse.json({ error: 'Only AVIF, GIF, JPEG, PNG, and WebP images are supported.' }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image must be 10MB or smaller.' }, { status: 400 });
    }

    const context = normalizeContext(formData.get('context'));
    const objectName = createObjectName({ context, uid, file });
    const buffer = Buffer.from(await file.arrayBuffer());
    const { bucketName } = getGcsConfig();
    const storage = getStorageClient();
    const object = storage.bucket(bucketName).file(objectName);

    await object.save(buffer, {
      resumable: false,
      contentType: file.type,
      metadata: {
        cacheControl: 'public, max-age=31536000, immutable',
        metadata: {
          app: 'iyk-hub',
          context,
          uploadedBy: uid,
          originalName: file.name || 'image',
        },
      },
    });

    // Make the object publicly readable so it can be displayed in the app
    try {
      await object.makePublic();
    } catch (publicErr) {
      console.warn('Could not make object public (bucket may use uniform access):', publicErr?.message);
    }

    const url = getPublicGcsUrl(bucketName, objectName);

    return NextResponse.json({ url, bucket: bucketName, path: objectName });
  } catch (error) {
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }

    console.error('Error in /api/uploads/images:', error);
    return NextResponse.json({ error: 'Failed to upload image.' }, { status: 500 });
  }
}
