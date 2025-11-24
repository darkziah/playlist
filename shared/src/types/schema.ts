import type { Timestamp } from "firebase/firestore";

// Common Types
export type UserRole = "owner" | "admin" | "player" | "follower";
export type SubscriptionTier = "free" | "starter" | "pro" | "enterprise";
export type SubscriptionStatus = "active" | "past_due" | "canceled";
export type JoinType = "open" | "approval_required" | "invite_only";
export type TeamCreationPolicy = "admin_only" | "player_request" | "any_player";
export type TeamRole = "player" | "coach" | "staff" | "team_admin";
export type GameStatus = "draft" | "scheduled" | "live" | "completed" | "cancelled";
export type PlayerPosition = "Point Guard" | "Shooting Guard" | "Small Forward" | "Power Forward" | "Center";

// Better Auth Collections (Admin SDK managed, but we define types for client usage)

// organizations/{orgId} - LEAGUE
export interface League {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  metadata: {
    subscriptionTier: SubscriptionTier;
    subscriptionStatus: SubscriptionStatus;
    settings: {
      joinType: JoinType;
      teamCreationPolicy: TeamCreationPolicy;
      maxTeams: number;
    };
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// members/{memberId} - League Members
export interface LeagueMember {
  id: string;
  organizationId: string;
  userId: string;
  role: UserRole;
  createdAt: Timestamp;
}

// Application Collections

// organizations/{leagueId}/join_requests/{requestId}
export interface LeagueJoinRequest {
  userId: string;
  userName: string;
  userEmail: string;
  userImage?: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: Timestamp;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  message?: string;
}

// organizations/{leagueId}/teams/{teamId}
export interface Team {
  id: string;
  leagueId: string;
  name: string;
  logo?: string;
  colors: {
    primary: string;
    secondary: string;
  };
  status: "active" | "inactive" | "disbanded";
  teamAdmin: string; // userId
  coaches: string[]; // userId[]
  staff: string[]; // userId[]
  stats: {
    wins: number;
    losses: number;
    totalGames: number;
  };
  settings: {
    joinType: JoinType;
    maxPlayers: number;
  };
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
}

// organizations/{leagueId}/team_requests/{requestId}
export interface TeamCreationRequest {
  userId: string;
  userName: string;
  proposedTeamName: string;
  proposedTeamLogo?: string;
  reason?: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: Timestamp;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  rejectionReason?: string;
}

// organizations/{leagueId}/teams/{teamId}/members/{memberId}
export interface TeamMember {
  userId: string;
  teamId: string;
  leagueId: string;
  role: TeamRole;
  playerData?: {
    jerseyNumber: number;
    position: PlayerPosition;
    height?: string;
    weight?: string;
    yearOfBirth?: number;
    preferredHand?: "Left" | "Right" | "Both";
  };
  stats: {
    gamesPlayed: number;
    points: number;
    assists: number;
    rebounds: number;
    steals: number;
    blocks: number;
  };
  status: "active" | "inactive" | "injured" | "suspended";
  joinedAt: Timestamp;
  updatedAt: Timestamp;
}

// organizations/{leagueId}/teams/{teamId}/join_requests/{requestId}
export interface TeamJoinRequest {
  userId: string;
  userName: string;
  userEmail: string;
  teamId: string;
  leagueId: string;
  proposedJerseyNumber?: number;
  proposedPosition?: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: Timestamp;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  message?: string;
}

// games/{gameId}
export interface LeagueGame {
  id: string;
  leagueId: string;
  seasonId: string;
  homeTeam: {
    id: string;
    name: string;
  };
  awayTeam: {
    id: string;
    name: string;
  };
  homeScore: number;
  awayScore: number;
  status: GameStatus;
  quarter: number;
  gameDate: Timestamp;
  createdAt: Timestamp;
  createdBy: string;
}

// organizations/{leagueId}/followers/{userId}
export interface Follower {
  userId: string;
  notificationPreferences: {
    gameStart: boolean;
    liveScore: boolean;
    gameEnd: boolean;
    highlights: boolean;
    announcements: boolean;
  };
  followedAt: Timestamp;
  lastNotificationAt?: Timestamp;
}

// notifications/{notificationId}
export interface Notification {
  userId: string;
  organizationId: string;
  type: "game_start" | "live_score" | "game_end" | "highlight" | "announcement";
  title: string;
  body: string;
  data: object;
  read: boolean;
  sentAt?: Timestamp;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

// Realtime Database Types

// /orgs/{orgId}/live_games/{gameId}
export interface LiveGame {
  gameId: string;
  status: "live" | "finished";
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  quarter: number;
  timeRemaining: string;
  lastUpdate: number; // timestamp
  followerCount: number;
  recentPlays: Array<{
    playerId: string;
    playerName: string;
    type: "point" | "assist" | "rebound";
    value: number;
    timestamp: number;
  }>;
}

// /orgs/{orgId}/followers_online/{userId}
export interface FollowerPresence {
  gameId: string;
  joinedAt: number;
  presence: "online" | "away";
  lastSeen: number;
}
