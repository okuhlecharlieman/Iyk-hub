import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../firebase/admin';

const DEFAULT_BLOCKED_KEYWORDS = [
  'hate',
  'kill',
  'nude',
  'porn',
  'scam',
  'fraud',
  'violence',
  'abuse',
  'terror',
  'weapon',
];

const configuredKeywords = (process.env.MODERATION_BLOCKED_KEYWORDS || '')
  .split(',')
  .map((term) => term.trim().toLowerCase())
  .filter(Boolean);

const BLOCKED_KEYWORDS = configuredKeywords.length > 0 ? configuredKeywords : DEFAULT_BLOCKED_KEYWORDS;

const normalize = (value) => (typeof value === 'string' ? value.toLowerCase() : '');

export function screenTextContent(fields = []) {
  const text = fields.filter(Boolean).map(normalize).join(' ');
  const matchedKeywords = BLOCKED_KEYWORDS.filter((keyword) => text.includes(keyword));

  if (matchedKeywords.length > 0) {
    return {
      decision: 'flagged',
      matchedKeywords,
      reasons: ['Contains blocked keyword(s).'],
    };
  }

  return {
    decision: 'approved',
    matchedKeywords: [],
    reasons: [],
  };
}

export async function enqueueModerationItem({
  contentType,
  contentId,
  submittedBy,
  screening,
  preview = {},
}) {
  await initializeFirebaseAdmin();

  const queueStatus = screening.decision === 'flagged' ? 'open' : 'auto_approved';

  await admin.firestore().collection('moderationQueue').add({
    contentType,
    contentId,
    submittedBy,
    status: queueStatus,
    screening,
    preview,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}
