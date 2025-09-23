'use client';
import { useState } from 'react';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { ensureUserDoc } from '../../lib/firebaseHelpers';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
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
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-4">Sign in</h1>
      {err ? <p className="text-red-600 mb-2">{err}</p> : null}
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full border p-2 rounded" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input className="w-full border p-2 rounded" placeholder="Password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
        <button className="w-full bg-neutral-900 text-white rounded py-2" disabled={loading}>
          {loading ? <LoadingSpinner /> : 'Sign in'}
        </button>
      </form>
      <button onClick={signGoogle} className="w-full mt-3 border rounded py-2">Continue with Google</button>
      <p className="mt-4 text-sm">
        No account? <a className="underline" href="/signup">Sign up</a>
      </p>
    </div>
  );
}