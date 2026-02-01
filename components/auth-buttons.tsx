import { login, logout } from "@/app/actions"

export function SignInButton() {
    const isElectron = typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent);

    const handleLogin = (e: React.FormEvent) => {
        if (isElectron) {
            e.preventDefault();
            window.open('http://localhost:3000/login-bridge', '_blank');
        }
    }

    if (isElectron) {
        return (
            <button
                onClick={handleLogin}
                className="px-6 py-2 rounded-full bg-zinc-800/50 hover:bg-zinc-800 border-2 border-zinc-700/50 hover:border-zinc-600 text-sm font-medium text-zinc-100 transition-all duration-200 hover:shadow-[0_0_15px_-3px_rgba(255,255,255,0.1)] active:scale-95"
            >
                <span className="hidden md:inline">Sign up for free</span>
                <span className="md:hidden">Login</span>
            </button>
        )
    }

    return (
        <form action={login}>
            <button
                type="submit"
                className="px-6 py-2 rounded-full bg-zinc-800/50 hover:bg-zinc-800 border-2 border-zinc-700/50 hover:border-zinc-600 text-sm font-medium text-zinc-100 transition-all duration-200 hover:shadow-[0_0_15px_-3px_rgba(255,255,255,0.1)] active:scale-95"
            >
                <span className="hidden md:inline">Sign up for free</span>
                <span className="md:hidden">Login</span>
            </button>
        </form>
    )
}

export function SignOutButton() {
    return (
        <form action={logout}>
            <button
                type="submit"
                className="w-full text-left px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-md transition-colors flex items-center gap-2"
            >
                Sign Out
            </button>
        </form>
    )
}
