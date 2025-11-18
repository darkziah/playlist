import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";

import { auth } from "@/lib/firebase";
import {
  hasCompleteIdentityProfile,
  subscribeToPlayerIdentityProfile,
  type PlayerIdentityProfileDoc,
} from "@/lib/playerProfile";

export type PlayerIdentityProfileState = {
  user: User | null;
  profile: PlayerIdentityProfileDoc | null;
  loading: boolean;
  profileComplete: boolean;
};

export function usePlayerIdentityProfile(): PlayerIdentityProfileState {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] =
    useState<PlayerIdentityProfileDoc | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    const unsub = subscribeToPlayerIdentityProfile(user.uid, (doc) => {
      setProfile(doc);
      setProfileLoading(false);
    });

    return () => {
      unsub();
    };
  }, [user?.uid]);

  return {
    user,
    profile,
    loading: authLoading || profileLoading,
    profileComplete: hasCompleteIdentityProfile(profile),
  };
}
