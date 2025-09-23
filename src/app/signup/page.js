'use client';
import { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { ensureUserDoc } from '../../lib/firebaseHelpers';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function SignupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName });
      await ensureUserDoc(cred.user);
      router.push('/dashboard');
    } catch (e) {
      setErr(e.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-4">Create account</h1>
      {err ? <p className="text-red-600 mb-2">{err}</p> : null}
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full border p-2 rounded" placeholder="Display name" value={displayName} onChange={(e)=>setDisplayName(e.target.value)} />
        <input className="w-full border p-2 rounded" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input className="w-full border p-2 rounded" placeholder="Password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
        <button className="w-full bg-neutral-900 text-white rounded py-2" disabled={loading}>
          {loading ? <LoadingSpinner /> : 'Sign up'}
        </button>
      </form>
      <p className="mt-4 text-sm">Already have an account? <a className="underline" href="/login">Sign in</a></p>
    </div>
  );
}