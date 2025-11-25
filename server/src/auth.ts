import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, defaultRoles } from "better-auth/plugins/organization/access";
import { firestoreAdapter } from "@yultyyev/better-auth-firestore";
import { getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { cert } from "firebase-admin/app";
import { firebaseAuthPlugin } from "better-auth-firebase-auth/server";

// Initialize Firebase Admin
// Checks if already initialized to avoid hot-reload errors
const app: App = (getApps().length > 0 ? getApps()[0] : initializeApp({
  credential: cert(process.env.FIREBASE_PRIVATE_KEY!)
})) as App;
export const db = getFirestore(app);
// Ignore undefined properties so optional fields like refreshToken
// do not cause Firestore write errors
db.settings({ ignoreUndefinedProperties: true });
const adminAuth = getAuth(app);

// Custom Access Control for League System
const statement = {
  ...defaultStatements,
  team: ["create", "update", "delete", "join"] as const,
  game: ["create", "update", "delete", "score"] as const,
};

const ac = createAccessControl(statement);

// Define custom roles extending default ones
const owner = ac.newRole({
  ...defaultRoles.owner.statements,
  team: ["create", "update", "delete", "join"],
  game: ["create", "update", "delete", "score"],
});

const admin = ac.newRole({
  ...defaultRoles.admin.statements,
  team: ["create", "update", "join"],
  game: ["create", "update", "score"],
});

const member = ac.newRole({
  ...defaultRoles.member.statements,
  team: ["join"],
  game: [],
});

export const auth = betterAuth({
  database: firestoreAdapter(db),
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:8081",
  ],
  plugins: [
    organization({
      ac,
      roles: {
        owner,
        admin,
        member,
      },
    }),
    firebaseAuthPlugin({
      useClientSideTokens: true, // Client generates Firebase tokens
      firebaseAdminAuth: adminAuth, // Firebase Admin SDK instance
    }),
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

