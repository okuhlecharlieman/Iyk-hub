'use client';
import { useMemo, useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { ensureUserDoc } from '../../lib/firebase/helpers';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/ToastProvider';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const validateEmail = (value) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const validatePassword = (value) => {
    // at least 8 chars, one number, one symbol
    return /^(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/.test(value);
  };

  const passwordHint = useMemo(() => {
    if (!password) return '';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (!/[0-9]/.test(password)) return 'Password should include at least one number.';
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) return 'Password should include at least one symbol.';
    return '';
  }, [password]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');

    if (!validateEmail(email)) {
      setErr('Please enter a valid email address.');
      return;
    }

    if (!validatePassword(password)) {
      setErr('Password must be at least 8 characters and include a number + symbol.');
      return;
    }

    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (!cred.user.emailVerified) {
        throw new Error('Please verify your email before logging in.');
      }
      await ensureUserDoc(cred.user);
      router.push('/dashboard');
    } catch (e) {
      setErr(e.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  }

  async function signGoogle() {
    setErr('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      await ensureUserDoc(cred.user);
      router.push('/dashboard');
    } catch (e) {
      setErr(e.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-12 md:py-20">
      <div className="w-full max-w-md bg-white/50 dark:bg-gray-800/50 rounded-2xl shadow-lg p-6 md:p-10 border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center bg-gradient-to-r from-yellow-400 via-teal-400 to-blue-500 bg-clip-text text-transparent drop-shadow-sm">
          Login
        </h2>
        {err ? <p className="text-red-500 dark:text-red-400 mb-4 text-center text-sm">{err}</p> : null}
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="relative">
            <input
              className="w-full p-3 rounded-lg bg-gray-100/80 dark:bg-gray-900/60 border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-800 transition-all"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="relative">
            <input
              className="w-full p-3 rounded-lg bg-gray-100/80 dark:bg-gray-900/60 border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-800 transition-all"
              placeholder="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          {passwordHint && <p className="text-xs text-gray-500 dark:text-gray-400">{passwordHint}</p>}
          <Button type="submit" className="w-full rounded-lg py-3" variant="primary" disabled={loading}>{loading ? <LoadingSpinner /> : 'Sign in'}</Button>
        </form>
        <Button onClick={signGoogle} className="w-full mt-4 rounded-lg py-3" variant="secondary">Continue with Google</Button>
        <p className="mt-6 text-sm text-center text-gray-600 dark:text-gray-400">
          No account? <a className="underline hover:text-blue-500" href="/signup">Sign up</a>
        </p>
      </div>
    </div>
  );
}
