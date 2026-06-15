/**
 * API route handler for /api/admin/promos/send-email.
 */
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import nodemailer from 'nodemailer';
import { initializeFirebaseAdmin, authenticateWithRoles } from '../../../../../lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, handleApiError } from '../../../../../lib/api/validation';
import { logAdminAction } from '../../../../../lib/api/audit-log';
import { TEAM_MANAGEMENT_ROLES } from '../../../../../lib/roles';

export const dynamic = 'force-dynamic';

/** Creates/generates — createTransporter. */
const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

/** Creates/generates — buildPromoEmail. */
const buildPromoEmail = (displayName, promoCode, points, message) => {
  const name = displayName || 'Iyk Hub User';
  return {
    subject: `🎉 You've received a promo code from Iyk Hub!`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 16px; padding: 32px; color: white; text-align: center;">
          <h1 style="margin: 0 0 8px; font-size: 24px;">🎁 Promo Code</h1>
          <p style="margin: 0; opacity: 0.9;">You've been selected for a special reward!</p>
        </div>
        <div style="padding: 24px 0;">
          <p style="color: #374151; font-size: 16px;">Hi ${name},</p>
          ${message ? `<p style="color: #374151; font-size: 14px;">${message}</p>` : ''}
          <div style="background: #f3f4f6; border: 2px dashed #6366f1; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
            <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Your Promo Code</p>
            <p style="margin: 0; font-size: 28px; font-weight: bold; color: #4f46e5; letter-spacing: 2px; font-family: monospace;">${promoCode}</p>
            <p style="margin: 8px 0 0; color: #6b7280; font-size: 14px;">Worth <strong>${points} points</strong></p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">To redeem, go to your profile and enter this code in the promo code section.</p>
        </div>
        <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px;">Iyk Hub — Connecting Creatives</p>
        </div>
      </div>
    `,
  };
};

/** Handles POST requests to /api/admin/promos/send-email. */
export async function POST(request) {
  try {
    initializeFirebaseAdmin();
    const decoded = await authenticateWithRoles(request, TEAM_MANAGEMENT_ROLES);
    const body = await parseJsonBody(request);
    ensurePlainObject(body);

    const { emails, promoCode, points, message, target, filterValue } = body;

    if (!promoCode || typeof promoCode !== 'string') {
      throw new RequestValidationError('promoCode is required.');
    }
    if (typeof points !== 'number' || points <= 0) {
      throw new RequestValidationError('points must be a positive number.');
    }

    const transporter = createTransporter();
    if (!transporter) {
      return NextResponse.json({
        error: 'Email not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.',
        hint: 'You can use Gmail SMTP: host=smtp.gmail.com, port=587, user=your@gmail.com, pass=app-password',
      }, { status: 503 });
    }

    const db = admin.firestore();
    let recipientList = [];

    if (emails && Array.isArray(emails) && emails.length > 0) {
      const usersSnap = await db.collection('users').where('email', 'in', emails.slice(0, 10)).get();
      usersSnap.docs.forEach((doc) => {
        const data = doc.data();
        recipientList.push({ email: data.email, displayName: data.displayName });
      });
      emails.forEach((e) => {
        if (!recipientList.find((r) => r.email === e)) {
          recipientList.push({ email: e, displayName: null });
        }
      });
    } else if (target === 'all') {
      const snap = await db.collection('users').get();
      snap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.email) recipientList.push({ email: data.email, displayName: data.displayName });
      });
    } else if (target === 'role' && filterValue) {
      const snap = await db.collection('users').where('role', '==', filterValue).get();
      snap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.email) recipientList.push({ email: data.email, displayName: data.displayName });
      });
    }

    if (recipientList.length === 0) {
      return NextResponse.json({ error: 'No recipients found for the given criteria.' }, { status: 404 });
    }

    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
    let sentCount = 0;
    let failedCount = 0;
    const errors = [];

    for (const recipient of recipientList) {
      try {
        const { subject, html } = buildPromoEmail(recipient.displayName, promoCode, points, message);
        await transporter.sendMail({
          from: `"Iyk Hub" <${fromEmail}>`,
          to: recipient.email,
          subject,
          html,
        });
        sentCount++;
      } catch (err) {
        failedCount++;
        errors.push({ email: recipient.email, error: err.message });
      }
    }

    await db.collection('promoHistory').add({
      type: 'email_sent',
      promoCode,
      points,
      recipientCount: recipientList.length,
      sentCount,
      failedCount,
      adminUid: decoded.uid,
      adminEmail: decoded.email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await logAdminAction({
      actorUid: decoded.uid,
      actorEmail: decoded.email,
      action: 'send_promo_email',
      details: { promoCode, sentCount, failedCount, totalRecipients: recipientList.length },
    });

    return NextResponse.json({ success: true, sentCount, failedCount, errors: errors.slice(0, 10) });
  } catch (error) {
    return handleApiError(error, 'Send promo email error');
  }
}
