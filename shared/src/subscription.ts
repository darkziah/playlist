import type { SubscriptionTier } from "./types/schema";

export interface SubscriptionLimits {
  maxGamesPerMonth: number;
  maxPlayers: number;
  maxTeams: number;
  maxAdmins: number;
  maxSubAdmins: number;
  maxFollowers: number;
  liveScoreUpdates: "delayed_30s" | "realtime";
  pushNotifications: boolean;
  features: string[];
}

export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  free: {
    maxGamesPerMonth: 5,
    maxPlayers: 30,
    maxTeams: 2,
    maxAdmins: 1,
    maxSubAdmins: 0,
    maxFollowers: 100,
    liveScoreUpdates: "delayed_30s",
    pushNotifications: false,
    features: ["live_scoring", "basic_stats"],
  },
  starter: {
    maxGamesPerMonth: 25,
    maxPlayers: 100,
    maxTeams: 5,
    maxAdmins: 2,
    maxSubAdmins: 1,
    maxFollowers: 500,
    liveScoreUpdates: "realtime",
    pushNotifications: true,
    features: ["live_scoring", "advanced_stats", "match_history"],
  },
  pro: {
    maxGamesPerMonth: -1, // unlimited
    maxPlayers: 500,
    maxTeams: 20,
    maxAdmins: 5,
    maxSubAdmins: 3,
    maxFollowers: 2000,
    liveScoreUpdates: "realtime",
    pushNotifications: true,
    features: ["live_scoring", "advanced_stats", "api_access", "custom_branding"],
  },
  enterprise: {
    maxGamesPerMonth: -1,
    maxPlayers: -1,
    maxTeams: -1,
    maxAdmins: -1,
    maxSubAdmins: 10,
    maxFollowers: -1,
    liveScoreUpdates: "realtime",
    pushNotifications: true,
    features: ["*"],
  },
};

export function getSubscriptionLimits(tier: SubscriptionTier): SubscriptionLimits {
  return SUBSCRIPTION_LIMITS[tier] || SUBSCRIPTION_LIMITS.free;
}

export function isLimitReached(
  tier: SubscriptionTier,
  limitKey: keyof Omit<SubscriptionLimits, "liveScoreUpdates" | "pushNotifications" | "features">,
  currentCount: number
): boolean {
  const limits = getSubscriptionLimits(tier);
  const limit = limits[limitKey];
  if (limit === -1) return false; // unlimited
  return currentCount >= limit;
}
