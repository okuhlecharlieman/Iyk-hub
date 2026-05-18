import { NextResponse } from 'next/server';

const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.paystack.co https://*.paystack.co https://checkout.paystack.com https://apis.google.com https://www.gstatic.com https://www.googletagmanager.com https://*.firebaseapp.com https://*.googleapis.com https://accounts.google.com",
  "script-src-elem 'self' 'unsafe-inline' https://js.paystack.co https://*.paystack.co https://checkout.paystack.com https://apis.google.com https://www.gstatic.com https://www.googletagmanager.com https://*.firebaseapp.com https://*.googleapis.com https://accounts.google.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://storage.googleapis.com https://*.googleapis.com https://lh3.googleusercontent.com https://*.googleusercontent.com",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://*.googleapis.com https://storage.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com wss://*.firebaseio.com https://api.paystack.co https://*.paystack.co https://firebasestorage.googleapis.com https://apis.google.com https://accounts.google.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
  "frame-src 'self' https://js.paystack.co https://*.paystack.co https://checkout.paystack.com https://*.firebaseapp.com https://accounts.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "media-src 'self' blob: https://firebasestorage.googleapis.com https://storage.googleapis.com https://*.googleapis.com",
].join('; ');

export function middleware(request) {
  const response = NextResponse.next();

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Content-Security-Policy', CSP_DIRECTIVES);
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');

  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store');
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.png).*)',
  ],
};
