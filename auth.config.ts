import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import type { NextAuthConfig } from "next-auth";

// This file must be Edge-compatible (no firebase-admin, no node: deps)
export const authConfig = {
    providers: [
        Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            allowDangerousEmailAccountLinking: true,
        }),
        Resend({
            from: "onboarding@resend.dev",
            apiKey: process.env.AUTH_RESEND_KEY
        })
    ],
    pages: {
        signIn: '/',
    },
    session: { strategy: "jwt" },
    trustHost: true,
    secret: process.env.AUTH_SECRET,
} satisfies NextAuthConfig;
