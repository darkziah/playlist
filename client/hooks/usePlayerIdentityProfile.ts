import { useEffect, useState } from "react";
import { authClient, syncFirebaseSession } from "@/lib/auth-client";
import {
  hasCompleteIdentityProfile,
  subscribeToPlayerIdentityProfile,
  type PlayerIdentityProfileDoc,
} from "@/lib/playerProfile";

export type PlayerIdentityProfileState = {
  user: any | null; // better-auth user
  profile: PlayerIdentityProfileDoc | null;
  loading: boolean;
  profileComplete: boolean;
};

export function usePlayerIdentityProfile(): PlayerIdentityProfileState {
  const { data: session, isPending: authLoading } = authClient.useSession();
  const user = session?.user || null;

  const [profile, setProfile] =
    useState<PlayerIdentityProfileDoc | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    syncFirebaseSession();
  }, [session]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    const unsub = subscribeToPlayerIdentityProfile(user.id, (doc) => {
      setProfile(doc);
      setProfileLoading(false);
    });

    return () => {
      unsub();
    };
  }, [user?.id]);

  return {
    user,
    profile,
    loading: authLoading || profileLoading,
    profileComplete: hasCompleteIdentityProfile(profile),
  };
}
