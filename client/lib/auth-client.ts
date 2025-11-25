import { createAuthClient } from "better-auth/react"
import { organizationClient } from "better-auth/client/plugins"
import { signInWithCustomToken, signOut } from "firebase/auth";
import { auth, firebaseConfig } from "./firebase";
import { firebaseAuthClientPlugin } from "better-auth-firebase-auth/client";

export const authClient = createAuthClient({
    baseURL: process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000",
    plugins: [
        organizationClient(),
        firebaseAuthClientPlugin({
            // Optional: Add Firebase client config for additional features
            useClientSideTokens: true,
            firebaseConfig
        }),
    ]
})

// Helper to sync session
export const syncFirebaseSession = async () => {
    try {
        const { data } = await authClient.getSession();
        const session = data?.session;
        if (session && (session as any).firebaseToken) {
            // Only sign in if different user or not signed in
            if (auth.currentUser?.uid !== session.user.id) {
                await signInWithCustomToken(auth, (session as any).firebaseToken);
            }
        } else {
            if (auth.currentUser) {
                await signOut(auth);
            }
        }
    } catch (error) {
        console.error("Failed to sync Firebase session:", error);
    }
}