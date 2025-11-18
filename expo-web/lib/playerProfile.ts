import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type DocumentData,
  type QueryConstraint,
  type Unsubscribe,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import type {
  CompletedPlayerIdentityProfile,
  PlayerIdentityProfile,
} from "shared";

import { auth, db, storage } from "@/lib/firebase";

const playerProfilesCollection = collection(db, "playerProfiles");

const normalizeUsername = (value: string): string => value.trim().toLowerCase();

const profileDoc = (userId: string) => doc(playerProfilesCollection, userId);

export type PlayerIdentityProfileDoc = PlayerIdentityProfile & {
  userId: string;
  updatedAt: string;
  usernameNormalized?: string;
  roles?: string[]; // e.g., ['player', 'game-master']
};

export async function getPlayerIdentityProfile(
  userId: string,
): Promise<PlayerIdentityProfileDoc | null> {
  const snap = await getDoc(profileDoc(userId));
  if (!snap.exists()) {
    return null;
  }
  return snap.data() as PlayerIdentityProfileDoc;
}

export function subscribeToPlayerIdentityProfile(
  userId: string,
  handler: (profile: PlayerIdentityProfileDoc | null) => void,
): Unsubscribe {
  return onSnapshot(profileDoc(userId), (snap) => {
    if (!snap.exists()) {
      handler(null);
      return;
    }
    handler(snap.data() as PlayerIdentityProfileDoc);
  });
}

export async function isUsernameAvailable(
  username: string,
  options?: { excludeUserId?: string },
): Promise<boolean> {
  const normalized = normalizeUsername(username);
  if (!normalized) return false;

  const constraints: QueryConstraint[] = [
    where("usernameNormalized", "==", normalized),
  ];
  const snap = await getDocs(query(playerProfilesCollection, ...constraints));
  if (snap.empty) return true;
  return snap.docs.every((docSnap) => docSnap.id === options?.excludeUserId);
}

export async function uploadPlayerProfilePhoto(
  userId: string,
  file: File,
): Promise<string> {
  const fileRef = ref(storage, `playerProfiles/${userId}/profile-${Date.now()}`);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}

export type SavePlayerIdentityProfileInput = Partial<PlayerIdentityProfile> & {
  userId: string;
};

export async function savePlayerIdentityProfile(
  input: SavePlayerIdentityProfileInput,
): Promise<PlayerIdentityProfileDoc> {
  if (!auth.currentUser || auth.currentUser.uid !== input.userId) {
    throw new Error("You must be signed in to update your identity profile.");
  }

  const updatedAt = new Date().toISOString();
  const payload: PlayerIdentityProfileDoc & DocumentData = {
    ...input,
    updatedAt,
    updatedAtServer: serverTimestamp(),
  };

  if (input.username) {
    payload.usernameNormalized = normalizeUsername(input.username);
  }

  await setDoc(profileDoc(input.userId), payload, { merge: true });
  return {
    ...input,
    updatedAt,
  };
}

export function hasCompleteIdentityProfile(
  profile: PlayerIdentityProfile | null,
): profile is CompletedPlayerIdentityProfile {
  if (!profile) return false;
  if (!profile.username || !profile.username.trim()) return false;
  if (!profile.firstName || !profile.firstName.trim()) return false;
  if (!profile.lastName || !profile.lastName.trim()) return false;
  if (!profile.dateOfBirth) return false;
  return true;
}
