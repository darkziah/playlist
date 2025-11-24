import { useEffect, useState } from "react";
import { authClient, syncFirebaseSession } from "@/lib/auth-client";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

const gameMastersCollection = collection(db, "gameMasters");

export type GameMasterRole = "super_admin" | "admin" | "scorer";

export type GameMasterAuthState = {
  user: any | null;
  isGameMaster: boolean;
  role: GameMasterRole | null;
  loading: boolean;
};

export function useGameMasterAuth(): GameMasterAuthState {
  const { data: session, isPending: authLoading } = authClient.useSession();
  const user = session?.user || null;

  const [state, setState] = useState<GameMasterAuthState>({
    user: null,
    isGameMaster: false,
    role: null,
    loading: true,
  });

  useEffect(() => {
    syncFirebaseSession();
  }, [session]);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setState({
        user: null,
        isGameMaster: false,
        role: null,
        loading: false,
      });
      return;
    }

    async function checkRole() {
      try {
        if (!user) return; // Should not happen due to check above
        const gmDoc = await getDoc(doc(gameMastersCollection, user.id));
        if (gmDoc.exists()) {
          const data = gmDoc.data();
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
    }

    checkRole();
  }, [user, authLoading]);

  return state;
}

export type LoginGameMasterOptions = {
  redirectToDashboard?: boolean;
};

export async function loginGameMaster(
  options?: LoginGameMasterOptions,
): Promise<void> {
  if (options?.redirectToDashboard) {
    requestDashboardRedirectPreference();
  }
  await authClient.signIn.social({
    provider: "google",
    callbackURL: "/"
  });
}

export async function logoutGameMaster(): Promise<void> {
  await authClient.signOut();
}

export async function promoteToGameMaster(
  uid: string,
  role: GameMasterRole,
): Promise<void> {
  // Check if current user is signed in (via Better Auth or Firebase sync)
  // For admin operations, we might rely on Firebase Auth being synced.
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
