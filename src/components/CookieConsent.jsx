'use client';
/**
 * CookieConsentx component.
 */
import { useState, useEffect } from 'react';

const CONSENT_KEY = 'iyk_cookie_consent';

/** CookieConsent React component. */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      setVisible(true);
    }
  }, []);

  /** Handles accept action. */
  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ accepted: true, timestamp: Date.now() }));
    setVisible(false);
  };

  /** Handles decline action. */
  const handleDecline = () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ accepted: false, timestamp: Date.now() }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: 'var(--card-bg, #1a1a2e)',
        borderTop: '1px solid var(--border-color, #333)',
        padding: '16px 24px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.3)',
      }}
    >
      <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-color, #e0e0e0)', flex: '1 1 300px' }}>
        We use cookies and local storage to improve your experience, remember preferences, and analyse usage.
        By continuing, you agree to our{' '}
        <a href="/privacy" style={{ color: 'var(--accent-color, #6c5ce7)', textDecoration: 'underline' }}>
          Privacy Policy
        </a>.
      </p>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={handleDecline}
          style={{
            padding: '8px 16px',
            border: '1px solid var(--border-color, #555)',
            borderRadius: '6px',
            backgroundColor: 'transparent',
            color: 'var(--text-secondary, #aaa)',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Decline
        </button>
        <button
          onClick={handleAccept}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: 'var(--accent-color, #6c5ce7)',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          Accept
        </button>
      </div>
    </div>
  );
}
