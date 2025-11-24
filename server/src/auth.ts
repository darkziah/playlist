import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { firestoreAdapter } from "@yultyyev/better-auth-firestore";
import { initializeApp, getApps, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Initialize Firebase Admin
// Checks if already initialized to avoid hot-reload errors
const app: App = (getApps().length > 0 ? getApps()[0] : initializeApp()) as App;
const db = getFirestore(app);
const adminAuth = getAuth(app);

export const auth = betterAuth({
  database: firestoreAdapter(db) as any,
  plugins: [
    organization()
  ],
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }
  },
  emailAndPassword: {
    enabled: true
  },
  callbacks: {
    async session({ session, user }: { session: any; user: any }) {
        const token = await adminAuth.createCustomToken(user.id);
        return {
            ...session,
            firebaseToken: token
        }
    }
  }
});

