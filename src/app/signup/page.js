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

  const handleSignup = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!displayName.trim()) {
      setError("Display name is required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName });
      await sendEmailVerification(userCredential.user);
      await ensureUserDoc(userCredential.user, { displayName }); // Pass additional data
      toast('success', "Verification email sent! Please check your inbox.");
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-8 space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Create an Account</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Join the hub and start collaborating.</p>
        </div>

        {error && <p className="text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-lg text-sm text-center">{error}</p>}

        <form onSubmit={handleSignup} className="space-y-4">
          <input type="text" placeholder="Display Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className="input-field" />
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-field" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="input-field" />
          <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="input-field" />
          <Button type="submit" disabled={loading} variant="primary" className="w-full flex justify-center">{loading ? <LoadingSpinner size="sm" /> : 'Sign Up'}</Button>
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
