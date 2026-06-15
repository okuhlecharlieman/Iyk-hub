/**
 * gcs utilities (storage).
 */
import { Storage } from '@google-cloud/storage';

const DEFAULT_BUCKET_NAME = 'okuhlesbucket';
const DEFAULT_PROJECT_ID = 'southern-africa-buildathon';

let storageClient;

/** Formats/parses data — parseServiceAccount. */
const parseServiceAccount = () => {
  const raw = process.env.GCS_SERVICE_ACCOUNT_KEY
    || process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY
    || process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    || process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!raw) return null;

  try {
    const serviceAccount = JSON.parse(raw);
    return {
      client_email: serviceAccount.client_email,
      private_key: serviceAccount.private_key,
      project_id: serviceAccount.project_id,
    };
  } catch (error) {
    throw new Error(`Invalid Google service account JSON: ${error?.message || 'unknown parse error'}`);
  }
};

/** Fetches/retrieves data — getGcsConfig. */
export const getGcsConfig = () => ({
  bucketName: process.env.GCS_BUCKET_NAME || DEFAULT_BUCKET_NAME,
  projectId: process.env.GCS_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || DEFAULT_PROJECT_ID,
});

/** Fetches/retrieves data — getStorageClient. */
export const getStorageClient = () => {
  if (storageClient) return storageClient;

  const credentials = parseServiceAccount();
  const { projectId } = getGcsConfig();

  storageClient = new Storage({
    projectId: credentials?.project_id || projectId,
    ...(credentials ? { credentials } : {}),
  });

  return storageClient;
};

/** Fetches/retrieves data — getPublicGcsUrl. */
export const getPublicGcsUrl = (bucketName, objectName) => (
  `https://storage.googleapis.com/${bucketName}/${encodeURIComponent(objectName).replace(/%2F/g, '/')}`
);
