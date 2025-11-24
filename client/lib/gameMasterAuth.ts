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

export type GameMasterRole = "super_admin" | "admin" | "scorer";

export type GameMasterAuthState = {
  user: User | null;
  isGameMaster: boolean;
  role: GameMasterRole | null;
  loading: boolean;
};

export function useGameMasterAuth(): GameMasterAuthState {
  const [state, setState] = useState<GameMasterAuthState>({
    user: null,
    isGameMaster: false,
    role: null,
    loading: true,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({
          user: null,
          isGameMaster: false,
          role: null,
          loading: false,
        });
        return;
      }

      try {
        const gmDoc = await getDoc(doc(gameMastersCollection, user.uid));
        if (gmDoc.exists()) {
          const data = gmDoc.data();
          // Default to 'admin' for existing users without a role field
          const role = (data.role as GameMasterRole) || "admin";
          setState({
            user,
            isGameMaster: true,
            role,
            loading: false,
          });
        } else {
          setState({
            user,
            isGameMaster: false,
            role: null,
            loading: false,
          });
        }
      } catch {
        setState({
          user,
          isGameMaster: false,
          role: null,
          loading: false,
        });
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

export async function promoteToGameMaster(
  uid: string,
  role: GameMasterRole,
): Promise<void> {
  if (!auth.currentUser) {
    throw new Error("You must be signed in to promote users.");
  }

  // Check if user has a player profile to ensure valid UID
  const playerProfileRef = doc(db, "playerProfiles", uid);
  const playerProfileSnap = await getDoc(playerProfileRef);

  if (!playerProfileSnap.exists()) {
    throw new Error("User does not have a player profile. Please check the UID.");
  }

  const gmRef = doc(gameMastersCollection, uid);

  // We might not have the email since we are promoting by UID, 
  // but we can try to get it from the profile if it exists there (it usually doesn't for privacy),
  // or we just rely on the UID/Username for identification.
  // For now, we'll just set the role.

  await setDoc(
    gmRef,
    {
      role,
      promotedAt: serverTimestamp(),
      promotedBy: auth.currentUser.uid,
    },
    { merge: true },
  );
}

export function canUserCreateGame(role: GameMasterRole | null): boolean {
  return role === "admin" || role === "super_admin";
}

export function canUserEditGame(role: GameMasterRole | null): boolean {
  return role === "admin" || role === "super_admin";
}

export function canUserRecordStats(role: GameMasterRole | null): boolean {
  return role === "scorer" || role === "admin" || role === "super_admin";
}

export function canUserManageGameMasters(role: GameMasterRole | null): boolean {
  return role === "super_admin";
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
