import type { UserRole, TeamRole, TeamCreationPolicy } from "./types/schema";

/**
 * Checks if a user has sufficient permissions for a given action in a league context.
 */
export const LEAGUE_PERMISSIONS = {
  canManageSettings: (role?: UserRole) => role === "owner" || role === "admin",
  canManageMembers: (role?: UserRole) => role === "owner" || role === "admin",
  canCreateTeams: (role?: UserRole, policy?: TeamCreationPolicy) => {
    if (role === "owner" || role === "admin") return true;
    if (policy === "admin_only") return false;
    return true; // policy is "any_player" or "player_request"
  },
  canScheduleGames: (role?: UserRole) => role === "owner" || role === "admin",
  canScoreGames: (role?: UserRole) => role === "owner" || role === "admin",
};

/**
 * Checks if a user has sufficient permissions for a given action in a team context.
 */
export const TEAM_PERMISSIONS = {
  canManageRoster: (role?: TeamRole) => role === "team_admin" || role === "coach",
  canEditTeam: (role?: TeamRole) => role === "team_admin",
};

export const ROLES = {
  // Better Auth organization roles
  LEAGUE: ["owner", "admin", "member"] as const,
  // Team-specific roles (separate from org membership)
  TEAM: ["team_admin", "coach", "staff", "player"] as const,
};
