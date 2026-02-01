'use client';

import { useEffect, useState } from 'react';

export default function LoginBridgePage() {
    const [status, setStatus] = useState('Checking session...');

    useEffect(() => {
        async function transferSession() {
            try {
                // Fetch the session token from an API route we will create
                // Or simpler: try to read the cookie from document.cookie? 
                // No, authjs tokens are httpOnly. We need a server action or API route to return it.
                // Let's call a simple API route to get the token.

                const res = await fetch('/api/auth/token');
                if (res.ok) {
                    const data = await res.json();
                    if (data.token) {
                        setStatus('Login successful! Returning to app...');

                        // Deep Link Redirect
                        // Delay slightly to ensure UI renders
                        setTimeout(() => {
                            window.location.href = `neuralscholar://auth?token=${data.token}`;
                        }, 1000);
                    } else {
                        setStatus('No session token found. Please log in.');
                        // Redirect to login if needed, or wait for auto-login
                        // window.location.href = '/api/auth/signin?callbackUrl=/login-bridge';
                    }
                } else {
                    setStatus('Not authenticated.');
                    window.location.href = '/api/auth/signin?callbackUrl=/login-bridge';
                }
            } catch (e) {
                setStatus('Error transferring session.');
            }
        }

        transferSession();
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
            <h1 className="text-2xl font-bold mb-4">Neural Scholar Engine</h1>
            <p className="text-zinc-400">{status}</p>
            <div className="mt-8 animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
        </div>
    );
}
