const FIREBASE_ERROR_MAP = {
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled. Please contact support.',
  'auth/user-not-found': 'No account found with this email. Please sign up first.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/invalid-credential': 'Incorrect email or password. Please try again.',
  'auth/email-already-in-use': 'An account with this email already exists. Try logging in instead.',
  'auth/weak-password': 'Password is too weak. Use at least 8 characters with a number and symbol.',
  'auth/too-many-requests': 'Too many failed attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Please check your connection and try again.',
  'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled. Please contact support.',
  'auth/requires-recent-login': 'For security, please log in again before making this change.',
  'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.',
  'auth/missing-email': 'Please enter your email address.',
};

export function getFriendlyError(error) {
  if (!error) return 'An unknown error occurred.';

  const code = error?.code || '';
  if (FIREBASE_ERROR_MAP[code]) {
    return FIREBASE_ERROR_MAP[code];
  }

  const msg = error?.message || String(error);

  if (msg.includes('verify your email')) return msg;

  if (msg.includes('Firebase')) {
    const match = msg.match(/\(auth\/([^)]+)\)/);
    if (match && FIREBASE_ERROR_MAP[`auth/${match[1]}`]) {
      return FIREBASE_ERROR_MAP[`auth/${match[1]}`];
    }
    return 'Something went wrong. Please try again.';
  }

  return msg || 'Something went wrong. Please try again.';
}
