import React from 'react';
import Link from 'next/link';
import { Fingerprint, ScanFace, Lock, KeyRound, ShieldCheck, Smartphone } from 'lucide-react';

const methods = [
  { icon: Fingerprint, label: 'Fingerprint' },
  { icon: ScanFace, label: 'Face' },
  { icon: Lock, label: 'Screen lock' },
];

const features = [
  {
    icon: KeyRound,
    title: 'No passwords',
    description: 'Nothing to remember, reuse, or leak. Your device creates a unique passkey for this site.',
  },
  {
    icon: ShieldCheck,
    title: 'Phishing-resistant',
    description: 'Passkeys only work on the site that created them, and the private key never leaves your device.',
  },
  {
    icon: Smartphone,
    title: 'Works across devices',
    description: 'Passkeys sync with iCloud Keychain or Google Password Manager, or you can scan a QR code with your phone.',
  },
];

const steps = [
  'Sign up with your email.',
  'Confirm with your fingerprint, face, or screen lock. Your device creates a passkey.',
  'Next time, sign in with a single touch or glance.',
];

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-300 px-4 py-12">
      <div className="bg-white p-8 sm:p-10 rounded-lg shadow-sm w-full max-w-2xl space-y-10">
        <section className="text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#3B97B6]/10">
            <Fingerprint className="h-8 w-8 text-[#3B97B6]" aria-hidden="true" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Passwordless Auth</h1>
          <p className="text-gray-600 max-w-lg mx-auto">
            A demo of passkey authentication built with WebAuthn. Sign up and sign in without a
            password, using the same check you already use to unlock your device.
          </p>

          <ul className="flex flex-wrap justify-center gap-2 pt-2">
            {methods.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-700"
              >
                <Icon className="h-4 w-4 text-[#3B97B6]" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>

          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
            <Link
              href="/signup"
              className="flex justify-center py-2.5 px-6 rounded-md shadow-sm text-sm font-medium text-white bg-[#3B97B6] hover:bg-[#2d7591] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Create an account
            </Link>
            <Link
              href="/signin"
              className="flex justify-center py-2.5 px-6 rounded-md border border-[#3B97B6] text-sm font-medium text-[#3B97B6] hover:bg-[#3B97B6]/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </section>

        <section className="grid gap-6 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="space-y-2">
              <Icon className="h-6 w-6 text-[#3B97B6]" aria-hidden="true" />
              <h2 className="font-semibold">{title}</h2>
              <p className="text-sm text-gray-600">{description}</p>
            </div>
          ))}
        </section>

        <section className="space-y-3 border-t border-gray-200 pt-8">
          <h2 className="text-lg font-semibold">How it works</h2>
          <ol className="space-y-3">
            {steps.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm text-gray-700">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3B97B6] text-xs font-medium text-white">
                  {index + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          <p className="text-xs text-gray-500 pt-2">
            Your biometric data never leaves your device. The server only stores a public key.
          </p>
        </section>
      </div>
    </main>
  );
}
