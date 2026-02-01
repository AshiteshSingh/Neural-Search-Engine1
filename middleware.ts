export { auth as middleware } from "@/auth";

export const config = {
    // Protects all pages except static assets and images
    matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};