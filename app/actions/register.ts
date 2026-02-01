"use server";

import { hash } from "bcryptjs";
import * as admin from "firebase-admin";

// Ensure Admin is initialized
function getAdminDb() {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.AUTH_FIREBASE_PROJECT_ID,
                clientEmail: process.env.AUTH_FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.AUTH_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            })
        });
    }
    return admin.firestore();
}

export async function registerUser(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string || "User";

    if (!email || !password) {
        return { error: "Missing email or password" };
    }

    try {
        const db = getAdminDb();

        // 1. Check if user exists
        const userSnapshot = await db.collection("users").where("email", "==", email).get();
        if (!userSnapshot.empty) {
            return { error: "User already exists. Please log in." };
        }

        // 2. Hash Password
        const passwordHash = await hash(password, 12);

        // 3. Create User in 'users' collection
        // Auth.js adapter expects timestamps and email verified for some flows, 
        // strictly we just need basic fields. 
        const newUser = {
            name,
            email,
            emailVerified: null,
            image: null,
            passwordHash, // Storing hash!
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const res = await db.collection("users").add(newUser);

        return { success: true, userId: res.id };

    } catch (error: any) {
        console.error("Registration Error:", error);
        return { error: error.message || "Registration failed" };
    }
}
