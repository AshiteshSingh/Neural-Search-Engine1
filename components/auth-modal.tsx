"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { X, Mail, Lock, User, Loader2, AlertCircle } from "lucide-react";
import { registerUser } from "@/app/actions/register";

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form Stats
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState(""); // For registration

    if (!isOpen) return null;

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        await signIn("google");
        // signIn redirects, so loading state persists
    };

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            if (isLogin) {
                // LOGIN FLOW
                const result = await signIn("credentials", {
                    redirect: false,
                    email,
                    password
                });

                if (result?.error) {
                    setError("Invalid email or password.");
                    setIsLoading(false);
                } else {
                    onClose();
                    window.location.reload(); // Refresh to update session state
                }

            } else {
                // REGISTER FLOW
                const formData = new FormData();
                formData.append("email", email);
                formData.append("password", password);
                formData.append("name", name);

                const res = await registerUser(formData);

                if (res.error) {
                    setError(res.error);
                    setIsLoading(false);
                } else {
                    // Registration success -> Auto Login
                    const loginRes = await signIn("credentials", {
                        redirect: false,
                        email,
                        password
                    });
                    if (loginRes?.error) {
                        setError("Registration successful, but login failed. Please try logging in.");
                    } else {
                        onClose();
                        window.location.reload();
                    }
                    setIsLoading(false);
                }
            }
        } catch (err: any) {
            setError(err.message || "An error occurred");
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-[#1E1F20] border border-white/10 rounded-2xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 overflow-hidden">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">
                        {isLogin ? "Welcome back" : "Create an account"}
                    </h2>
                    <p className="text-zinc-400 text-sm">
                        {isLogin ? "Sign in to continue your research" : "Join Neural Scholar Search today"}
                    </p>
                </div>

                {/* ERROR ALERT */}
                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                )}

                {/* Google Button */}
                <button
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 bg-white text-black font-medium py-2.5 rounded-xl hover:bg-zinc-200 transition-colors mb-6 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : (
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                    )}
                    Sign in with Google
                </button>

                <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/10"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-[#1E1F20] px-2 text-zinc-500">Or continue with</span>
                    </div>
                </div>

                {/* Email Form */}
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                    {!isLogin && (
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-zinc-400 ml-1">Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                                <input
                                    type="text"
                                    required={!isLogin}
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="John Doe"
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400 ml-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400 ml-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-xl transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:scale-95 transform duration-100"
                    >
                        {isLoading ? <Loader2 size={18} className="animate-spin mx-auto" /> : (
                            isLogin ? "Sign In" : "Create Account"
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError(null);
                        }}
                        className="text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                        {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                    </button>
                </div>
            </div>
        </div>
    );
}
