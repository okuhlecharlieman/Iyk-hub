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
import { ensureUserDoc } from '../../lib/helpers';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function SignupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Email signup
  async function onSubmit(e) {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName });
      await ensureUserDoc(cred.user);
      await sendEmailVerification(cred.user);
      setMessage('A verification email has been sent. Please check your inbox.');
    } catch (e) {
      setMessage(e.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  }

  // Google signup
  async function signUpWithGoogle() {
    setMessage('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await ensureUserDoc(result.user);
      router.push('/dashboard');
    } catch (e) {
      setMessage(e.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-12 md:py-20">
      <div className="w-full max-w-md bg-white/50 dark:bg-gray-800/50 rounded-2xl shadow-lg p-6 md:p-10 border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center bg-gradient-to-r from-yellow-400 via-teal-400 to-blue-500 bg-clip-text text-transparent drop-shadow-sm">
          Create Your Account
        </h2>
        {message ? <p className={`mb-4 text-center text-sm ${message.includes('verification') ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>{message}</p> : null}

        {/* Email signup form */}
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            className="w-full p-3 rounded-lg bg-gray-100/80 dark:bg-gray-900/60 border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-800 transition-all"
            placeholder="Display name"
            value={displayName}
            onChange={(e)=>setDisplayName(e.target.value)}
          />
          <input
            className="w-full p-3 rounded-lg bg-gray-100/80 dark:bg-gray-900/60 border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-800 transition-all"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
          />
          <input
            className="w-full p-3 rounded-lg bg-gray-100/80 dark:bg-gray-900/60 border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-800 transition-all"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
          />
          <button 
            className="w-full btn-primary rounded-lg py-3" 
            disabled={loading}
          >
            {loading ? <LoadingSpinner /> : 'Create Account'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-4">
          <hr className="flex-grow border-gray-300 dark:border-gray-600" />
          <span className="px-3 text-gray-500 dark:text-gray-400 text-sm">OR</span>
          <hr className="flex-grow border-gray-300 dark:border-gray-600" />
        </div>

        {/* Google signup button */}
        <button
          onClick={signUpWithGoogle}
          disabled={loading}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg py-3 flex items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors"
        >
          {loading && !message ? <LoadingSpinner /> : (
            <>
              <img 
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                alt="Google" 
                className="w-5 h-5"
              />
              Continue with Google
            </>
          )}
        </button>

        <p className="mt-6 text-sm text-center text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <a className="underline hover:text-blue-500" href="/login">Sign in</a>
        </p>
      </div>
    </div>
  );
}
