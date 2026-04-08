
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserSupabaseClient as createClient } from '@/lib/supabase';

export default function ConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const token_hash = searchParams.get('token_hash');
    const type = searchParams.get('type');

    if (!token_hash) {
      router.push('/login');
      return;
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    supabase.auth.verifyOtp({ token_hash, type: type as any })
      .then(({ error }) => {
        if (error) {
          setError('Invalid or expired invite link.');
        } else {
          setVerified(true);
        }
      });
  }, []);

  const handleSubmit = async () => {
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/map');
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#1a1c1e',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: '#22252a', borderRadius: 12, padding: 40,
        width: 400, border: '1px solid rgba(255,255,255,0.08)'
      }}>
        <h1 style={{ color: '#f57c20', textAlign: 'center', marginBottom: 8 }}>
          RackScan
        </h1>
        {!verified ? (
          <p style={{ color: '#9ca3af', textAlign: 'center' }}>
            {error || 'Verifying invite link...'}
          </p>
        ) : (
          <>
            <p style={{ color: '#9ca3af', textAlign: 'center', marginBottom: 24 }}>
              Set your password
            </p>
            {error && (
              <div style={{
                background: '#e5393520', border: '1px solid #e53935',
                borderRadius: 6, padding: '10px 14px', marginBottom: 16,
                color: '#e53935', fontSize: 14
              }}>{error}</div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#9ca3af', fontSize: 13 }}>New Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', marginTop: 6,
                  background: '#2a2e35', border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: 6, color: '#e8eaed', fontSize: 14, boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ color: '#9ca3af', fontSize: 13 }}>Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', marginTop: 6,
                  background: '#2a2e35', border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: 6, color: '#e8eaed', fontSize: 14, boxSizing: 'border-box'
                }}
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: '100%', padding: '12px',
                background: '#f57c20', border: 'none',
                borderRadius: 6, color: '#fff',
                fontSize: 15, fontWeight: 600, cursor: 'pointer'
              }}
            >
              {loading ? 'Saving...' : 'Set Password & Sign In'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}


