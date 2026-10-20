/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState } from 'react';
import { startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { webAuthnApi } from '@/services/api';
import { getPasskeyErrorMessage } from '@/services/passkey';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SigninPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleAuthentication = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!browserSupportsWebAuthn()) {
      setError('This browser does not support passkeys.');
      setLoading(false);
      return;
    }

    try {
      const options = await webAuthnApi.getAuthenticationOptions(email);

      const authResult = await startAuthentication({ optionsJSON: options });

      const verificationResult = await webAuthnApi.verifyAuthentication(email, authResult);

      if (verificationResult.accessToken) {
        localStorage.setItem('token', verificationResult.accessToken);
        router.push('/welcome');
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      setError(getPasskeyErrorMessage(err, 'Authentication failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-300">
      <div className="bg-white p-8 rounded-lg shadow-sm w-full max-w-md">
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
            <p className="text-sm text-gray-600 mt-2">Access your account</p>
          </div>

          <form onSubmit={handleAuthentication} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Type your email"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#3B97B6] hover:bg-[#2d7591] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Verifying...' : 'Sign in with passkey'}
            </button>
            <p className="text-xs text-center text-gray-500">
              Use your fingerprint, face, or screen lock.
            </p>
          </form>

          <div className="text-center text-sm">
            <span className="text-gray-600">Don&apos;t have an account?</span>{' '}
            <Link 
              href="/signup" 
              className="text-[#3B97B6] hover:text-[#2d7591] font-medium transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}