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
import { ensureUserDoc } from '../../lib/firebaseHelpers';
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
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-12 md:py-20 bg-gradient-to-br from-yellow-50 via-blue-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 md:p-10">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center bg-gradient-to-r from-yellow-400 via-teal-400 to-blue-600 bg-clip-text text-transparent drop-shadow-lg">
          Sign Up
        </h2>
        {message ? <p className={`mb-2 ${message.includes('verification') ? 'text-green-600' : 'text-red-600'}`}>{message}</p> : null}

        {/* Email signup form */}
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            className="w-full border p-2 rounded"
            placeholder="Display name"
            value={displayName}
            onChange={(e)=>setDisplayName(e.target.value)}
          />
          <input
            className="w-full border p-2 rounded"
            placeholder="Email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
          />
          <input
            className="w-full border p-2 rounded"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
          />
          <button 
            className="w-full bg-neutral-900 text-white rounded py-2" 
            disabled={loading}
          >
            {loading ? <LoadingSpinner /> : 'Sign up'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-4">
          <hr className="flex-grow border-gray-300" />
          <span className="px-2 text-gray-500 text-sm">or</span>
          <hr className="flex-grow border-gray-300" />
        </div>

        {/* Google signup button */}
        <button
          onClick={signUpWithGoogle}
          disabled={loading}
          className="w-full border border-gray-300 flex items-center justify-center gap-2 py-2 rounded hover:bg-gray-50"
        >
          {loading ? <LoadingSpinner /> : (
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

        <p className="mt-4 text-sm">
          Already have an account?{' '}
          <a className="underline" href="/login">Sign in</a>
        </p>
      </div>
    </div>
  );
}
