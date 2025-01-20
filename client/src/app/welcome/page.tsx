'use client'

import React from 'react';

export default function WelcomePage() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-300">
            <div className="flex flex-col justify-center items-center mb-40">
                <h1 className="text-4xl text-blue-500 font-bold">Welcome !</h1>
                <p className="text-2xl">Kudos! &#127881; you have just created your first passwordless authentication with WebAuthn...</p>
            </div>
        </main>
    );
}