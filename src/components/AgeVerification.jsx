'use client';
import { useState, useEffect } from 'react';

const AGE_VERIFIED_KEY = 'iyk_age_verified';
const MIN_AGE = 13;

export default function AgeVerification() {
  const [visible, setVisible] = useState(false);
  const [birthYear, setBirthYear] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const verified = localStorage.getItem(AGE_VERIFIED_KEY);
    if (!verified) {
      setVisible(true);
    }
  }, []);

  const handleVerify = () => {
    const year = parseInt(birthYear, 10);
    const currentYear = new Date().getFullYear();

    if (!year || year < 1900 || year > currentYear) {
      setError('Please enter a valid birth year.');
      return;
    }

    const age = currentYear - year;
    if (age < MIN_AGE) {
      setError(`You must be at least ${MIN_AGE} years old to use Intwana Hub.`);
      return;
    }

    localStorage.setItem(AGE_VERIFIED_KEY, JSON.stringify({ verified: true, timestamp: Date.now() }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        backgroundColor: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--card-bg, #1a1a2e)',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        <h2 style={{ margin: '0 0 8px', color: 'var(--text-color, #fff)', fontSize: '22px' }}>
          Age Verification
        </h2>
        <p style={{ margin: '0 0 20px', color: 'var(--text-secondary, #aaa)', fontSize: '14px' }}>
          You must be at least {MIN_AGE} years old to use Intwana Hub. Please enter your birth year.
        </p>

        <input
          type="number"
          placeholder="e.g. 2005"
          value={birthYear}
          onChange={(e) => {
            setBirthYear(e.target.value);
            setError('');
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid var(--border-color, #444)',
            backgroundColor: 'var(--input-bg, #111)',
            color: 'var(--text-color, #fff)',
            fontSize: '16px',
            textAlign: 'center',
            marginBottom: '12px',
            boxSizing: 'border-box',
          }}
        />

        {error && (
          <p style={{ margin: '0 0 12px', color: '#ff6b6b', fontSize: '13px' }}>{error}</p>
        )}

        <button
          onClick={handleVerify}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'var(--accent-color, #6c5ce7)',
            color: '#fff',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Continue
        </button>

        <p style={{ margin: '16px 0 0', color: 'var(--text-secondary, #666)', fontSize: '11px' }}>
          By continuing, you confirm you meet the minimum age requirement and agree to our{' '}
          <a href="/terms" style={{ color: 'var(--accent-color, #6c5ce7)' }}>Terms of Service</a>.
        </p>
      </div>
    </div>
  );
}
