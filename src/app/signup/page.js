'use client';
import { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  updateProfile, 
  GoogleAuthProvider, 
  signInWithPopup,
  sendEmailVerification
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { ensureUserDoc } from '../../lib/firebase/helpers';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/ToastProvider';

export default function SignupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const validateEmail = (value) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const validatePassword = (value) => {
    return typeof value === 'string' && value.length >= 6;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError('Display name is required.');
      return;
    }
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!validatePassword(password)) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName });
      await sendEmailVerification(userCredential.user);
      await ensureUserDoc(userCredential.user, { displayName }); // Pass additional data
      toast('success', 'Verification email sent! Please check your inbox.');
      router.push('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await ensureUserDoc(result.user, { 
        displayName: result.user.displayName, 
        photoURL: result.user.photoURL 
      });
      router.push('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-12 md:py-20">
      <div className="w-full max-w-md bg-white/50 dark:bg-gray-800/50 rounded-2xl shadow-lg p-6 md:p-10 border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center bg-gradient-to-r from-yellow-400 via-teal-400 to-blue-500 bg-clip-text text-transparent drop-shadow-sm">
          Create an Account
        </h2>

        {error && <p className="text-red-500 dark:text-red-400 mb-4 text-center text-sm">{error}</p>}

        <form onSubmit={handleSignup} className="space-y-4">
          <input
            className="w-full p-3 rounded-lg bg-gray-100/80 dark:bg-gray-900/60 border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-800 transition-all"
            type="text"
            placeholder="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
          <input
            className="w-full p-3 rounded-lg bg-gray-100/80 dark:bg-gray-900/60 border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-800 transition-all"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="w-full p-3 rounded-lg bg-gray-100/80 dark:bg-gray-900/60 border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-800 transition-all"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <input
            className="w-full p-3 rounded-lg bg-gray-100/80 dark:bg-gray-900/60 border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-800 transition-all"
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <Button type="submit" disabled={loading} className="w-full rounded-lg py-3" variant="primary">
            {loading ? <LoadingSpinner /> : 'Sign Up'}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or continue with</span>
          </div>
        </div>

        <div>
          <Button onClick={handleGoogleSignIn} disabled={loading} variant="secondary" className="w-full">Sign in with Google</Button>
        </div>

        <div className="text-sm text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Already have an account? <a href="/login" className="font-medium text-blue-600 hover:text-blue-500 dark:hover:text-blue-400">Log in</a>
          </p>
        </div>
      </div>
    </div>
  );
}

