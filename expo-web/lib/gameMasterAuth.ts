import { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

const gameMastersCollection = collection(db, "gameMasters");
const invitesCollection = collection(db, "gameMasterInvites");

export type GameMasterAuthState = {
  user: User | null;
  isGameMaster: boolean;
  loading: boolean;
};

export function useGameMasterAuth(): GameMasterAuthState {
  const [state, setState] = useState<GameMasterAuthState>({
    user: null,
    isGameMaster: false,
    loading: true,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ user: null, isGameMaster: false, loading: false });
        return;
      }

      try {
        const gmDoc = await getDoc(doc(gameMastersCollection, user.uid));
        setState({
          user,
          isGameMaster: gmDoc.exists(),
          loading: false,
        });
      } catch {
        setState({ user, isGameMaster: false, loading: false });
      }
    });

    return unsub;
  }, []);

  return state;
}

export type LoginGameMasterOptions = {
  redirectToDashboard?: boolean;
};

export async function loginGameMaster(
  options?: LoginGameMasterOptions,
): Promise<void> {
  const provider = new GoogleAuthProvider();
  if (options?.redirectToDashboard) {
    requestDashboardRedirectPreference();
  }
  await signInWithPopup(auth, provider);
}

export async function logoutGameMaster(): Promise<void> {
  await signOut(auth);
}

export type InviteResult =
  | { kind: "accepted" }
  | { kind: "invalid"; reason: string };

export async function createGameMasterInvite(email: string): Promise<string> {
  if (!auth.currentUser) {
    throw new Error("You must be signed in as a game master to create invites.");
  }

  const trimmed = email.trim();
  if (!trimmed) {
    throw new Error("Email is required.");
  }

  const token =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  const inviteRef = doc(invitesCollection, token);

  const expiresAt = Timestamp.fromDate(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  await setDoc(inviteRef, {
    email: trimmed.toLowerCase(),
    createdAt: serverTimestamp(),
    createdBy: auth.currentUser.uid,
    expiresAt,
    used: false,
  });

  return token;
}

export async function acceptGameMasterInvite(
  token: string,
): Promise<InviteResult> {
  const user = auth.currentUser;

  if (!user || !user.email) {
    return {
      kind: "invalid",
      reason: "You must be logged in with an email address to accept an invite.",
    };
  }

  const inviteRef = doc(invitesCollection, token);
  const snap = await getDoc(inviteRef);

  if (!snap.exists()) {
    return { kind: "invalid", reason: "Invite not found." };
  }

  const data = snap.data() as any;

  if (data.used) {
    return { kind: "invalid", reason: "Invite has already been used." };
  }

  if (typeof data.email === "string") {
    const expected = data.email.toLowerCase();
    const actual = user.email.toLowerCase();
    if (expected !== actual) {
      return {
        kind: "invalid",
        reason: "This invite is for a different email address.",
      };
    }
  }

  if (data.expiresAt && typeof data.expiresAt.toMillis === "function") {
    const now = Timestamp.now();
    if (data.expiresAt.toMillis() < now.toMillis()) {
      return { kind: "invalid", reason: "Invite has expired." };
    }
  }

  const gmRef = doc(gameMastersCollection, user.uid);

  await setDoc(
    gmRef,
    {
      email: user.email,
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );

  await setDoc(
    inviteRef,
    {
      used: true,
      usedAt: serverTimestamp(),
      usedBy: user.uid,
    },
    { merge: true },
  );

  return { kind: "accepted" };
}

export function canUserCreateGame(isGameMaster: boolean): boolean {
  return isGameMaster;
}

export type GameMasterAccessState = "loading" | "allowed" | "forbidden";

export function getDashboardAccessState(
  state: Pick<GameMasterAuthState, "isGameMaster" | "loading">,
): GameMasterAccessState {
  if (state.loading) {
    return "loading";
  }
  return state.isGameMaster ? "allowed" : "forbidden";
}

const DASHBOARD_REDIRECT_KEY = "playlist:pending-dashboard-redirect";

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return null;
  }
  return window.sessionStorage;
}

export function requestDashboardRedirectPreference(): void {
  const storage = getSessionStorage();
  storage?.setItem(DASHBOARD_REDIRECT_KEY, "1");
}

export function consumeDashboardRedirectPreference(): boolean {
  const storage = getSessionStorage();
  if (!storage) return false;
  const hasFlag = storage.getItem(DASHBOARD_REDIRECT_KEY) === "1";
  if (hasFlag) {
    storage.removeItem(DASHBOARD_REDIRECT_KEY);
  }
  return hasFlag;
}
