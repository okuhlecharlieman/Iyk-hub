
export const initializeFirebaseAdmin = async () => {
  // Dynamically import to avoid loading the Admin SDK during Next.js RSC/Edge builds
  const { initializeApp, getApps, cert } = await import('firebase-admin/app');

  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!raw) {
      console.error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
      throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_KEY environment variable for Firebase Admin SDK');
    }
    console.log("FIREBASE_SERVICE_ACCOUNT_KEY is present.");

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(raw);
      console.log("Successfully parsed FIREBASE_SERVICE_ACCOUNT_KEY.");
    } catch (err) {
      console.error("Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:", err);
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON');
    }

    initializeApp({
      credential: cert(serviceAccount),
    });
    console.log("Firebase Admin SDK initialized successfully.");
  }
};
