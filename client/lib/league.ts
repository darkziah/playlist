import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import type { League } from "shared";
import { db } from "./firebase";
import { authClient } from "./auth-client";

const organizationsCollection = collection(db, "organizations");

export async function listLeagues(): Promise<League[]> {
  const snapshot = await getDocs(organizationsCollection);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as League));
}

export async function joinLeague(leagueId: string) {
  const { data, error } = await authClient.$fetch("/api/league/join", {
    method: "POST",
    body: { leagueId }
  });
  if (error) throw error;
  return data;
}

export async function createTeam(leagueId: string, payload: { name: string, logo?: string, colors?: { primary: string, secondary: string } }) {
  const { data, error } = await authClient.$fetch("/api/league/team", {
    method: "POST",
    body: { leagueId, ...payload }
  });
  if (error) throw error;
  return data;
}

export function subscribeToTeams(
  leagueId: string,
  handler: (teams: any[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, "organizations", leagueId, "teams"), (snap) => {
    const teams = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    handler(teams);
  });
}

export function subscribeToTeam(
  leagueId: string,
  teamId: string,
  handler: (team: any | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, "organizations", leagueId, "teams", teamId), (snap) => {
    if (!snap.exists()) {
      handler(null);
      return;
    }
    handler({ id: snap.id, ...snap.data() });
  });
}

export function subscribeToTeamMembers(
  leagueId: string,
  teamId: string,
  handler: (members: any[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, "organizations", leagueId, "teams", teamId, "members"), (snap) => {
    const members = snap.docs.map(d => ({ userId: d.id, ...d.data() }));
    handler(members);
  });
}

export function subscribeToLeague(
  leagueId: string,
  handler: (league: League | null) => void
): Unsubscribe {
  return onSnapshot(doc(organizationsCollection, leagueId), (snap) => {
    if (!snap.exists()) {
      handler(null);
      return;
    }
    const data = snap.data();
    // Helper to cast or fill defaults if needed
    handler({ id: snap.id, ...data } as League);
  });
}

export async function updateLeagueSettings(
  leagueId: string,
  settings: Partial<League['metadata']['settings']>
) {
  const ref = doc(organizationsCollection, leagueId);
  await setDoc(ref, {
    metadata: {
      settings
    }
  }, { merge: true });
}

export async function joinTeam(leagueId: string, teamId: string) {
  const { data, error } = await authClient.$fetch("/api/league/team/join", {
    method: "POST",
    body: { leagueId, teamId }
  });
  if (error) throw error;
  return data;
}

// Followers

export function subscribeToFollowers(
  leagueId: string,
  handler: (followers: any[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, "organizations", leagueId, "followers"), (snap) => {
    const followers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    handler(followers);
  });
}

export async function followLeague(leagueId: string, userId: string, preferences?: {
  gameStart?: boolean;
  liveScore?: boolean;
  gameEnd?: boolean;
  highlights?: boolean;
  announcements?: boolean;
}) {
  const followerRef = doc(db, "organizations", leagueId, "followers", userId);
  await setDoc(followerRef, {
    userId,
    notificationPreferences: {
      gameStart: preferences?.gameStart ?? true,
      liveScore: preferences?.liveScore ?? true,
      gameEnd: preferences?.gameEnd ?? true,
      highlights: preferences?.highlights ?? false,
      announcements: preferences?.announcements ?? true,
    },
    followedAt: new Date(),
  });
}

export async function unfollowLeague(leagueId: string, userId: string) {
  const followerRef = doc(db, "organizations", leagueId, "followers", userId);
  const { deleteDoc } = await import("firebase/firestore");
  await deleteDoc(followerRef);
}

export async function updateNotificationPreferences(
  leagueId: string,
  userId: string,
  preferences: {
    gameStart?: boolean;
    liveScore?: boolean;
    gameEnd?: boolean;
    highlights?: boolean;
    announcements?: boolean;
  }
) {
  const followerRef = doc(db, "organizations", leagueId, "followers", userId);
  await setDoc(followerRef, {
    notificationPreferences: preferences,
  }, { merge: true });
}

export async function updateTeamMemberProfile(
  leagueId: string,
  teamId: string,
  profileData: {
    jerseyNumber: number;
    position: string;
    height?: string;
    weight?: string;
    yearOfBirth?: number;
    preferredHand?: "Left" | "Right" | "Both";
  }
) {
  const { data, error } = await authClient.$fetch("/api/league/team/profile", {
    method: "POST",
    body: { leagueId, teamId, ...profileData }
  });
  if (error) throw error;
  return data;
}
