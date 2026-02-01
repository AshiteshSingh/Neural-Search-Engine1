import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
        }),
    ],
    // This allows the app to work behind the Cloud Run proxy
    trustHost: true,
    secret: process.env.AUTH_SECRET,
    // Fix for Electron Production on HTTP Localhost
    useSecureCookies: process.env.NODE_ENV === 'production' && process.env.AUTH_URL?.startsWith('https') ? true : false,
    cookies: {
        sessionToken: {
            name: `authjs.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production' && process.env.AUTH_URL?.startsWith('https') ? true : false,
            },
        },
    },
});