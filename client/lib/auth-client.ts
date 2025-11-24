import { createAuthClient } from "better-auth/react"
import { signInWithCustomToken, signOut } from "firebase/auth";
import { auth } from "./firebase";

export const authClient = createAuthClient({
    baseURL: process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000"
})

// Helper to sync session
export const syncFirebaseSession = async () => {
    try {
        const { data: session } = await authClient.getSession();
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