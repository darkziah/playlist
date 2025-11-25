<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# 🏀 BASKETBALL LEAGUE MANAGEMENT SYSTEM

## Complete Implementation Specification \& Prompt

---

## 📋 TABLE OF CONTENTS

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Database Schema](#database-schema)
4. [Authentication \& Authorization](#authentication--authorization)
5. [API Endpoints](#api-endpoints)
6. [Workflows](#workflows)
7. [Frontend Components](#frontend-components)
8. [Data Sync Strategy](#data-sync-strategy)
9. [Implementation Phases](#implementation-phases)
10. [LLM Implementation Prompts](#llm-implementation-prompts)

---

## 1. PROJECT OVERVIEW

### Project Name

**Basketball League Management System**

### Description

A multi-tenant SaaS platform for basketball league management with real-time scoring, team roster management, player statistics tracking, advanced analytics, and follower engagement features.

### Tech Stack

```yaml
Architecture: Monorepo (Bun workspaces)

Frontend:
  - client/: Expo Router (React Native for Web)
  - client-admin/: Vite + React (Admin Dashboard)

Backend:
  - server/: Hono API (Bun runtime)

Shared:
  - shared/: TypeScript types and utilities

Authentication:
  - Better Auth with Organization plugin
  - Google OAuth provider
  - Custom Firestore adapter (@yultyyev/better-auth-firestore)

Databases:
  Real-time:
    - Firestore: Document-based data (teams, rosters, games)
    - Realtime Database: Live scores, presence, follower counts
  Analytics:
    - Firebase Data Connect: PostgreSQL + GraphQL for reports

Languages:
  - TypeScript (100%)

Form:
  - TanStack Form
  - Zod for validation
  - React Hook Form integration
  - Hono/Client - Zod integration for type-safe API calls
```

### Key Features

1. **Multi-tenant Organizations (Leagues)**
   - Better Auth organization = League
   - Isolated data per league
   - 4-tier subscription system (free, starter, pro, enterprise)

2. **Team Management**
   - Teams within leagues
   - Approval workflows for team creation
   - Team roles: admin, coach, staff, player

3. **Player Roster System**
   - Join league with approval (if required)
   - Join team with approval
   - Player wizard: jersey number, position, height, weight
   - Role assignment (player, coach, staff)

4. **Real-time Game Scoring**
   - Live score updates
   - Quarter tracking
   - Recent plays feed
   - Active follower count

5. **Follower System**
   - Follow leagues for notifications
   - Real-time score notifications
   - Customizable notification preferences
   - Push notifications (Expo)

6. **Advanced Analytics \& Reporting**
   - Player season statistics
   - Team performance reports
   - League-wide leaderboards
   - Subscription analytics
   - Complex SQL queries via Data Connect

7. **Role-Based Access Control**
   - League level: owner, admin, player, follower
   - Team level: team_admin, coach, staff, player
   - Permission system for all actions

---

## 2. SYSTEM ARCHITECTURE

### High-Level Architecture Diagram

```ini
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT APPLICATIONS                          │
├─────────────────────────────────────────────────────────────────┤
│  Expo App (Mobile/Web)     │    Admin Portal (Vite + React)     │
│  - Player interface        │    - League management             │
│  - Live scoring            │    - Reports & analytics           │
│  - Team roster             │    - Subscription management       │
└──────────────┬──────────────────────────────┬───────────────────┘
               │                              │
               └──────────────┬───────────────┘
                              │
                   ┌──────────▼──────────┐
                   │   Hono API Server   │
                   │   (Better Auth)     │
                   └──────────┬──────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌──────────────────┐   ┌──────────────┐
│  Better Auth  │   │   Firestore      │   │ Data Connect │
│  (Admin SDK)  │   │   (Client SDK)   │   │ (PostgreSQL) │
├───────────────┤   ├──────────────────┤   ├──────────────┤
│ • users       │   │ • organizations/ │   │ • player_    │
│ • sessions    │   │   teams/         │   │   stats      │
│ • accounts    │   │   join_requests/ │   │ • game_      │
│ • orgs        │   │   games/         │   │   results    │
│ • members     │   │   followers/     │   │ • analytics  │
│ • invitations │   │                  │   │              │
└───────────────┘   └──────────────────┘   └──────────────┘
                              │
                    ┌─────────▼─────────┐
                    │ Realtime Database │
                    ├───────────────────┤
                    │ • live_games/     │
                    │ • followers_      │
                    │   online/         │
                    └───────────────────┘
```

### Data Flow

```ini
Authentication Flow:
User → Google OAuth → Better Auth → Session → Firebase Custom Token

Real-time Scoring:
Game Master → Firestore (write) → Realtime DB (sync) → Followers (listen)

Analytics:
Completed Game → Firestore → Cloud Function → Data Connect (sync)

Approval Workflows:
Player Request → Firestore (write) → Admin Review → Better Auth (update role)
```

---

## 3. DATABASE SCHEMA

### 3.1 Better Auth Collections (Firestore - Admin SDK)

Managed automatically by Better Auth:

```typescript
// users/{userId}
interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  image?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// sessions/{sessionId}
interface Session {
  id: string;
  userId: string;
  expiresAt: Timestamp;
  ipAddress?: string;
  userAgent?: string;
}

// accounts/{accountId}
interface Account {
  id: string;
  userId: string;
  provider: 'google';
  providerAccountId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Timestamp;
  scope: string;
}

// organizations/{orgId} - LEAGUE
interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  metadata: {
    subscriptionTier: 'free' | 'starter' | 'pro' | 'enterprise';
    subscriptionStatus: 'active' | 'past_due' | 'canceled';
    settings: {
      joinType: 'open' | 'approval_required';
      teamCreationPolicy: 'admin_only' | 'player_request' | 'any_player';
      maxTeams: number;
    };
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// members/{memberId} - League Members
interface Member {
  id: string;
  organizationId: string;
  userId: string;
  role: 'owner' | 'admin' | 'player' | 'follower';
  createdAt: Timestamp;
}

// invitations/{invitationId}
interface Invitation {
  id: string;
  organizationId: string;
  email: string;
  role: string;
  inviterId: string;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: Timestamp;
  createdAt: Timestamp;
}
```

### 3.2 Application Collections (Firestore - Client SDK)

```typescript
// organizations/{leagueId}/join_requests/{requestId}
interface LeagueJoinRequest {
  userId: string;
  userName: string;
  userEmail: string;
  userImage?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Timestamp;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  message?: string;
}

// organizations/{leagueId}/teams/{teamId}
interface Team {
  id: string;
  leagueId: string;
  name: string;
  logo?: string;
  colors: {
    primary: string;
    secondary: string;
  };
  status: 'active' | 'inactive' | 'disbanded';
  teamAdmin: string; // userId
  coaches: string[]; // userId[]
  staff: string[]; // userId[]
  stats: {
    wins: number;
    losses: number;
    totalGames: number;
  };
  settings: {
    joinType: 'open' | 'approval_required' | 'invite_only';
    maxPlayers: number;
  };
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
}

// organizations/{leagueId}/team_requests/{requestId}
interface TeamCreationRequest {
  userId: string;
  userName: string;
  proposedTeamName: string;
  proposedTeamLogo?: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Timestamp;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  rejectionReason?: string;
}

// organizations/{leagueId}/teams/{teamId}/members/{memberId}
interface TeamMember {
  userId: string;
  teamId: string;
  leagueId: string;
  role: 'player' | 'coach' | 'staff' | 'team_admin';
  playerData?: {
    jerseyNumber: number;
    position: 'Point Guard' | 'Shooting Guard' | 'Small Forward' | 'Power Forward' | 'Center';
    height?: string;
    weight?: string;
    yearOfBirth?: number;
    preferredHand?: 'Left' | 'Right' | 'Both';
  };
  stats: {
    gamesPlayed: number;
    points: number;
    assists: number;
    rebounds: number;
    steals: number;
    blocks: number;
  };
  status: 'active' | 'inactive' | 'injured' | 'suspended';
  joinedAt: Timestamp;
  updatedAt: Timestamp;
}

// organizations/{leagueId}/teams/{teamId}/join_requests/{requestId}
interface TeamJoinRequest {
  userId: string;
  userName: string;
  userEmail: string;
  teamId: string;
  leagueId: string;
  proposedJerseyNumber?: number;
  proposedPosition?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Timestamp;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  message?: string;
}

// games/{gameId}
interface Game {
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
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  quarter: number;
  gameDate: Timestamp;
  createdAt: Timestamp;
  createdBy: string;
}

// organizations/{leagueId}/followers/{userId}
interface Follower {
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
interface Notification {
  userId: string;
  organizationId: string;
  type: 'game_start' | 'live_score' | 'game_end' | 'highlight' | 'announcement';
  title: string;
  body: string;
  data: object;
  read: boolean;
  sentAt?: Timestamp;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}
```

### 3.3 Realtime Database (Client SDK)

```typescript
// /orgs/{orgId}/live_games/{gameId}
interface LiveGame {
  gameId: string;
  status: 'live' | 'finished';
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
    type: 'point' | 'assist' | 'rebound';
    value: number;
    timestamp: number;
  }>;
}

// /orgs/{orgId}/followers_online/{userId}
interface FollowerPresence {
  gameId: string;
  joinedAt: number;
  presence: 'online' | 'away';
  lastSeen: number;
}
```

### 3.4 Data Connect Schema (PostgreSQL + GraphQL)

```graphql
# dataconnect/schema/schema.gql

type PlayerSeasonStats @table(name: "player_season_stats") {
  id: UUID! @default(expr: "uuidV4()")
  userId: String!
  leagueId: String!
  teamId: String!
  seasonId: String!
  playerName: String!
  jerseyNumber: Int!
  position: String!
  
  gamesPlayed: Int! @default(value: 0)
  minutesPlayed: Int! @default(value: 0)
  points: Int! @default(value: 0)
  fieldGoalsMade: Int! @default(value: 0)
  fieldGoalsAttempted: Int! @default(value: 0)
  threePointersMade: Int! @default(value: 0)
  threePointersAttempted: Int! @default(value: 0)
  freeThrowsMade: Int! @default(value: 0)
  freeThrowsAttempted: Int! @default(value: 0)
  assists: Int! @default(value: 0)
  rebounds: Int! @default(value: 0)
  offensiveRebounds: Int! @default(value: 0)
  defensiveRebounds: Int! @default(value: 0)
  steals: Int! @default(value: 0)
  blocks: Int! @default(value: 0)
  turnovers: Int! @default(value: 0)
  fouls: Int! @default(value: 0)
  
  fieldGoalPercentage: Float
  threePointPercentage: Float
  freeThrowPercentage: Float
  pointsPerGame: Float
  assistsPerGame: Float
  reboundsPerGame: Float
  
  createdAt: Timestamp! @default(expr: "request.time")
  updatedAt: Timestamp! @default(expr: "request.time")
}

type GameResult @table(name: "game_results") {
  id: UUID! @default(expr: "uuidV4()")
  gameId: String! @unique
  leagueId: String!
  seasonId: String!
  homeTeamId: String!
  homeTeamName: String!
  homeScore: Int!
  awayTeamId: String!
  awayTeamName: String!
  awayScore: Int!
  winnerId: String
  gameDate: Date!
  status: GameStatus!
  createdAt: Timestamp! @default(expr: "request.time")
}

enum GameStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

type TeamSeasonStats @table(name: "team_season_stats") {
  id: UUID! @default(expr: "uuidV4()")
  teamId: String!
  teamName: String!
  leagueId: String!
  seasonId: String!
  gamesPlayed: Int! @default(value: 0)
  wins: Int! @default(value: 0)
  losses: Int! @default(value: 0)
  pointsScored: Int! @default(value: 0)
  pointsAllowed: Int! @default(value: 0)
  winPercentage: Float
  pointsPerGame: Float
  pointsAllowedPerGame: Float
  createdAt: Timestamp! @default(expr: "request.time")
  updatedAt: Timestamp! @default(expr: "request.time")
}

type LeagueAnalytics @table(name: "league_analytics") {
  id: UUID! @default(expr: "uuidV4()")
  leagueId: String! @unique
  leagueName: String!
  subscriptionTier: String!
  totalMembers: Int! @default(value: 0)
  totalTeams: Int! @default(value: 0)
  totalGames: Int! @default(value: 0)
  totalFollowers: Int! @default(value: 0)
  activeUsers30d: Int! @default(value: 0)
  gamesThisMonth: Int! @default(value: 0)
  createdAt: Timestamp! @default(expr: "request.time")
  updatedAt: Timestamp! @default(expr: "request.time")
}
```

---

## 4. AUTHENTICATION \& AUTHORIZATION

### 4.1 Better Auth Configuration

```typescript
// server/auth.ts
import { betterAuth } from 'better-auth';
import { firestoreAdapter, initFirestore } from '@yultyyev/better-auth-firestore';
import { organization } from 'better-auth/plugins';
import { cert } from 'firebase-admin/app';

const firestore = initFirestore({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n')
  }),
  projectId: process.env.FIREBASE_PROJECT_ID!
});

export const auth = betterAuth({
  database: firestoreAdapter({ firestore }),
  
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      prompt: 'select_account',
      accessType: 'offline'
    }
  },
  
  plugins: [
    organization({
      async sendInvitationEmail(data) {
        // Send email invitation
      },
      
      roles: {
        owner: {
          permissions: ['*']
        },
        admin: {
          permissions: [
            'league:read',
            'league:update',
            'member:invite',
            'member:remove',
            'member:approve',
            'team:approve',
            'team:delete',
            'game:*'
          ]
        },
        player: {
          permissions: [
            'league:read',
            'team:request_create',
            'team:join',
            'game:read'
          ]
        },
        follower: {
          permissions: [
            'league:read',
            'game:read'
          ]
        }
      },
      
      organizationHooks: {
        beforeAddMember: async ({ member, organization }) => {
          // Check subscription limits
          const tier = organization.metadata?.subscriptionTier;
          const limits = SUBSCRIPTION_LIMITS[tier];
          const memberCount = await getMemberCount(organization.id);
          
          if (memberCount >= limits.maxPlayers) {
            throw new APIError("BAD_REQUEST", {
              message: `Player limit (${limits.maxPlayers}) reached`
            });
          }
        }
      }
    })
  ]
});
```

### 4.2 Subscription Tiers

```typescript
// shared/subscription-limits.ts
export const SUBSCRIPTION_LIMITS = {
  free: {
    maxGamesPerMonth: 5,
    maxPlayers: 30,
    maxTeams: 2,
    maxAdmins: 1,
    maxSubAdmins: 0,
    maxFollowers: 100,
    liveScoreUpdates: 'delayed_30s',
    pushNotifications: false,
    features: ['live_scoring', 'basic_stats']
  },
  starter: {
    maxGamesPerMonth: 25,
    maxPlayers: 100,
    maxTeams: 5,
    maxAdmins: 2,
    maxSubAdmins: 1,
    maxFollowers: 500,
    liveScoreUpdates: 'realtime',
    pushNotifications: true,
    features: ['live_scoring', 'advanced_stats', 'match_history']
  },
  pro: {
    maxGamesPerMonth: -1,
    maxPlayers: 500,
    maxTeams: 20,
    maxAdmins: 5,
    maxSubAdmins: 3,
    maxFollowers: 2000,
    liveScoreUpdates: 'realtime',
    pushNotifications: true,
    features: ['live_scoring', 'advanced_stats', 'api_access', 'custom_branding']
  },
  enterprise: {
    maxGamesPerMonth: -1,
    maxPlayers: -1,
    maxTeams: -1,
    maxAdmins: -1,
    maxSubAdmins: 10,
    maxFollowers: -1,
    liveScoreUpdates: 'realtime',
    pushNotifications: true,
    features: ['*']
  }
};
```

### 4.3 Permission System

```typescript
// lib/permissions.ts
export const TEAM_PERMISSIONS = {
  team_admin: [
    'team:update',
    'team:delete',
    'team:invite_player',
    'team:approve_player',
    'team:remove_player',
    'team:assign_coach',
    'team:assign_staff',
    'roster:*'
  ],
  coach: [
    'team:read',
    'roster:read',
    'roster:update',
    'game:manage'
  ],
  staff: [
    'team:read',
    'roster:read'
  ],
  player: [
    'team:read',
    'roster:read'
  ]
};

export function hasTeamPermission(
  userTeamRole: string,
  permission: string
): boolean {
  const permissions = TEAM_PERMISSIONS[userTeamRole] || [];
  return permissions.includes(permission) || permissions.includes('*');
}
```

---

## 5. API ENDPOINTS

### 5.1 League Endpoints

```typescript
// POST /api/league/join
// Request league membership
{
  leagueId: string;
  message?: string;
}

// POST /api/league/join-requests/:requestId/approve
// Admin approves league join request
{
  leagueId: string;
  requestId: string;
}

// GET /api/league/:leagueId/join-requests
// Get pending join requests (admin only)

// POST /api/league/:leagueId/follow
// Follow league for notifications
{
  leagueId: string;
}

// DELETE /api/league/:leagueId/follow
// Unfollow league

// PATCH /api/league/:leagueId/notification-preferences
// Update notification preferences
{
  preferences: {
    gameStart: boolean;
    liveScore: boolean;
    gameEnd: boolean;
  }
}
```

### 5.2 Team Endpoints

```typescript
// POST /api/league/:leagueId/team/request
// Request to create team
{
  name: string;
  logo?: string;
  colors?: { primary: string; secondary: string };
  reason?: string;
}

// POST /api/league/:leagueId/team-requests/:requestId/approve
// Admin approves team creation
{
  requestId: string;
}

// GET /api/league/:leagueId/teams
// List teams in league

// GET /api/league/:leagueId/team/:teamId
// Get team details

// POST /api/league/:leagueId/team/:teamId/join
// Request to join team
{
  message?: string;
  proposedJerseyNumber?: number;
  proposedPosition?: string;
}

// POST /api/league/:leagueId/team/:teamId/join-requests/:requestId/approve
// Team admin approves join request

// POST /api/league/:leagueId/team/:teamId/join-wizard
// Complete join wizard
{
  jerseyNumber: number;
  position: string;
  height?: string;
  weight?: string;
  yearOfBirth?: number;
  preferredHand?: string;
}

// POST /api/league/:leagueId/team/:teamId/assign-role
// Assign coach or staff role
{
  userId: string;
  role: 'coach' | 'staff';
}

// GET /api/league/:leagueId/team/:teamId/roster
// Get team roster
```

### 5.3 Game Endpoints

```typescript
// POST /api/league/:leagueId/game
// Create game
{
  homeTeamId: string;
  awayTeamId: string;
  gameDate: string; // ISO date
  seasonId: string;
}

// GET /api/league/:leagueId/games
// List games

// GET /api/game/:gameId
// Get game details

// POST /api/game/:gameId/start
// Start game (activates live scoring)

// PATCH /api/game/:gameId/score
// Update live score
{
  homeScore: number;
  awayScore: number;
  quarter: number;
  timeRemaining: string;
}

// POST /api/game/:gameId/finish
// End game and sync to Data Connect
```

### 5.4 Analytics Endpoints

```typescript
// GET /api/league/:leagueId/reports/top-scorers
// Get top scorers
?seasonId=xxx&limit=20

// GET /api/league/:leagueId/reports/team-performance
// Get team stats
?teamId=xxx&seasonId=xxx

// GET /api/league/:leagueId/reports/analytics
// Get league analytics
```

### 5.5 Firebase Token Endpoint

```typescript
// POST /api/firebase-token
// Get Firebase custom token for client SDK
// Returns: { customToken: string }
```

---

## 6. WORKFLOWS

### Workflow 1: Join League

```yaml
1. User clicks "Join League"
2. System checks league settings (open vs approval_required)
3a. If OPEN:
   - Add user to Better Auth members directly
   - User becomes "player" role
   - Redirect to league dashboard
3b. If APPROVAL_REQUIRED:
   - Create join request in Firestore
   - Notify admins
   - Wait for admin approval
   - On approval: Add to Better Auth members
4. User can now see teams and join them
```

### Workflow 2: Create Team

```yaml
1. Player clicks "Create Team"
2. System checks teamCreationPolicy
3a. If ANY_PLAYER:
   - Create team immediately
   - Player becomes team_admin
3b. If PLAYER_REQUEST or ADMIN_ONLY:
   - Create team creation request
   - Notify league admins
   - Wait for approval
   - On approval: Create team, player becomes team_admin
4. Team admin can now manage roster
```

### Workflow 3: Join Team

```ini
1. Player clicks "Join Team"
2. System checks if player is league member
3. Create team join request
4. Notify team admin
5. Team admin reviews and approves
6. Player redirected to join wizard
7. Player fills jersey number, position, etc.
8. System validates jersey number availability
9. Create team member record
10. Player added to team roster
```

### Workflow 4: Live Game Scoring

```ini
1. Game Master starts game
2. Game status → "live"
3. Live game data synced to Realtime DB
4. Followers connect to Realtime DB
5. Game Master updates score
6. Score synced to Realtime DB instantly
7. Followers receive real-time updates
8. Notification sent based on preferences
9. Game Master finishes game
10. Game status → "completed"
11. Sync game data to Data Connect (PostgreSQL)
12. Update player/team stats in Data Connect
```

### Workflow 5: Follow League \& Get Notifications

```yaml
1. User clicks "Follow League"
2. Add to league followers collection
3. Set default notification preferences
4. When game starts: Check preferences
5. If enabled: Send push notification
6. During game: Send live score updates (based on tier)
7. When game ends: Send final score notification
```

---

## 7. FRONTEND COMPONENTS

### 7.1 Authentication Components

```typescript
// expo-web/components/GoogleSignInButton.tsx
- Google OAuth button
- Handles sign-in flow
- Redirects after success

// expo-web/components/UserProfile.tsx
- Display user info
- Sign out button
- Profile picture from Google
```

### 7.2 League Components

```typescript
// expo-web/components/LeagueCard.tsx
- League name, logo
- Member count, team count
- Follow/Unfollow button
- Join League button

// expo-web/components/JoinLeagueModal.tsx
- Join league form
- Optional message input
- Submit request

// client/src/components/LeagueJoinRequests.tsx
- Admin view of pending requests
- Approve/Reject buttons
- User info display
```

### 7.3 Team Components

```typescript
// expo-web/components/TeamCard.tsx
- Team name, logo, colors
- Win/loss record
- Player count
- Join Team button

// expo-web/components/CreateTeamForm.tsx
- Team name input
- Logo upload
- Color picker
- Submit request

// expo-web/components/TeamRoster.tsx
- List of team members
- Jersey numbers, positions
- Role badges (coach, staff, player)
- Stats preview

// expo-web/components/JoinTeamWizard.tsx
- Step 1: Jersey number & position (required)
- Step 2: Additional info (optional)
- Jersey validation
- Submit button
```

### 7.4 Game Components

```typescript
// expo-web/components/LiveScoreWidget.tsx
- Real-time score display
- Quarter indicator
- Time remaining
- Recent plays feed
- Viewer count

// expo-web/components/GameScoreBoard.tsx
- Team names & logos
- Current scores
- Game status badge
- View details button

// client/src/components/GameMasterControls.tsx
- Start/Stop game buttons
- Score input fields
- Quarter selector
- Time input
- Recent plays recorder
```

### 7.5 Analytics Components

```typescript
// client/src/components/TopScorersTable.tsx
- Rank, player name, jersey
- PPG, APG, RPG columns
- Sortable columns
- Pagination

// client/src/components/TeamPerformanceChart.tsx
- Win/loss chart
- Points per game trend
- Season comparison

// client/src/components/LeagueAnalyticsDashboard.tsx
- Total members/teams/games cards
- Active users chart
- Games this month
- Subscription tier breakdown
```

---

## 8. DATA SYNC STRATEGY

### 8.1 Completed Game → Data Connect

```typescript
// server/api/game/:id/finish.ts
export async function finishGame(gameId: string) {
  // 1. Update game status in Firestore
  await firestore.collection('games').doc(gameId).update({
    status: 'completed'
  });
  
  // 2. Sync to Data Connect
  await syncGameToDataConnect(gameId);
  
  // 3. Update player stats
  await syncPlayerStatsToDataConnect(gameId);
  
  // 4. Update team stats
  await updateTeamStatsInDataConnect(gameId);
  
  // 5. Remove from Realtime DB
  await realtimeDB.ref(`orgs/${leagueId}/live_games/${gameId}`).remove();
}
```

### 8.2 Real-time Score → Realtime DB

```typescript
// server/api/game/:id/score.ts
export async function updateGameScore(gameId: string, scoreData: any) {
  // 1. Update Firestore (source of truth)
  await firestore.collection('games').doc(gameId).update(scoreData);
  
  // 2. Sync to Realtime DB (real-time updates)
  await realtimeDB.ref(`orgs/${leagueId}/live_games/${gameId}`).update({
    ...scoreData,
    lastUpdate: Date.now()
  });
  
  // 3. Trigger notifications
  await notifyFollowers(leagueId, gameId, scoreData);
}
```

---

## 9. IMPLEMENTATION PHASES

### Phase 1: Foundation (Week 1-2)

- [ ] Set up monorepo structure
- [ ] Configure Better Auth with Firestore adapter
- [ ] Implement Google OAuth
- [ ] Set up Firebase client SDK
- [ ] Create base schemas in Firestore
- [ ] Implement authentication flows

### Phase 2: League \& Team Management (Week 3-4)

- [ ] League join/approval system
- [ ] Team creation/approval system
- [ ] Team roster management
- [ ] Join team wizard
- [ ] Role assignment (coach, staff)
- [ ] Permission system

### Phase 3: Real-time Game Scoring (Week 5-6)

- [ ] Game creation
- [ ] Live scoring interface
- [ ] Realtime DB integration
- [ ] Follower presence tracking
- [ ] Real-time score updates

### Phase 4: Notifications (Week 7)

- [ ] Push notification setup (Expo)
- [ ] Notification preferences
- [ ] Game start/end notifications
- [ ] Live score notifications
- [ ] Notification queue system

### Phase 5: Analytics \& Reporting (Week 8-9)

- [ ] Set up Firebase Data Connect
- [ ] Define GraphQL schema
- [ ] Implement data sync functions
- [ ] Create analytics queries
- [ ] Build reports dashboard
- [ ] Top scorers leaderboard
- [ ] Team performance reports

### Phase 6: Subscription \& Billing (Week 10)

- [ ] Implement subscription tiers
- [ ] Add limit enforcement
- [ ] Subscription upgrade/downgrade
- [ ] Billing integration
- [ ] Usage tracking

### Phase 7: Polish \& Launch (Week 11-12)

- [ ] UI/UX refinements
- [ ] Error handling
- [ ] Loading states
- [ ] Security rules testing
- [ ] Performance optimization
- [ ] Documentation
- [ ] Deploy to production

---

## 10. LLM IMPLEMENTATION PROMPTS

### 10.1 Better Auth Setup Prompt

```yaml
Create a Better Auth configuration for a basketball league management app with the following requirements:

1. Use @yultyyev/better-auth-firestore adapter
2. Google OAuth provider with offline access
3. Organization plugin enabled with these roles:
   - owner: full permissions
   - admin: league management, member approval, team approval
   - player: join teams, view games
   - follower: read-only access
4. Subscription limit enforcement in beforeAddMember hook
5. Custom invitation email template

Tech stack:
- Better Auth
- Firebase Admin SDK
- Firestore
- TypeScript

Environment variables:
- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET

Provide complete server/auth.ts file with all configurations.
```

### 10.2 Team Join Wizard Prompt

```hs
Create a team join wizard component for a basketball app with these requirements:

Step 1 (Required):
- Jersey number input (validate uniqueness)
- Position selector (Point Guard, Shooting Guard, Small Forward, Power Forward, Center)

Step 2 (Optional):
- Height input (text, e.g., "6'2"")
- Weight input (text, e.g., "185 lbs")
- Year of birth (number)
- Preferred hand (Left/Right/Both)

Features:
- Multi-step form with navigation
- Real-time validation
- Error messages
- Submit to Firestore
- Success confirmation

Tech stack:
- React Native (Expo)
- TypeScript
- Firestore Client SDK

Provide complete component with all logic and styling.
```

### 10.3 Live Score Widget Prompt

```yaml
Create a real-time live score widget component with these features:

1. Connect to Firebase Realtime Database
2. Display:
   - Home team name & score
   - Away team name & score
   - Current quarter
   - Time remaining
   - Live indicator (red dot)
   - Viewer count
   - Recent plays (last 3)
3. Auto-update when data changes
4. Handle connection/disconnection
5. Update follower presence

Data structure:
/orgs/{orgId}/live_games/{gameId}
{
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
  quarter: number,
  timeRemaining: string,
  followerCount: number,
  recentPlays: Array<{playerName, type, value}>
}

Tech stack:
- React Native (Expo)
- Firebase Realtime Database
- TypeScript

Provide complete component with hooks and styling.
```

### 10.4 Analytics Query Prompt

```yaml
Create Firebase Data Connect queries for basketball analytics:

1. Top Scorers Query:
   - Input: leagueId, seasonId, limit
   - Output: playerName, jerseyNumber, teamId, position, gamesPlayed, points, pointsPerGame, assists, rebounds
   - Sort by pointsPerGame DESC
   - Filter: minimum 5 games played

2. Team Performance Report Query:
   - Input: teamId, seasonId
   - Output:
     a. Team stats (wins, losses, winPercentage, pointsPerGame, pointsAllowedPerGame)
     b. Recent games (last 10) with scores and winner
     c. Top 5 players by pointsPerGame

3. League Analytics Query:
   - Input: leagueId
   - Output:
     a. League overview (totalMembers, totalTeams, totalGames, totalFollowers, activeUsers30d, gamesThisMonth)
     b. Top 10 teams by winPercentage (minimum 3 games)

Tech stack:
- Firebase Data Connect
- GraphQL
- PostgreSQL

Provide complete .gql files for schema and queries.
```

### 10.5 Approval System Prompt

```yaml
Create a complete approval workflow system for league join requests with these features:

1. Request Creation:
   - User submits join request
   - Store in Firestore: organizations/{leagueId}/join_requests/{requestId}
   - Fields: userId, userName, userEmail, userImage, status (pending), message, requestedAt

2. Admin Review Interface:
   - List pending requests
   - Show user info with avatar
   - Approve/Reject buttons
   - Add rejection reason (optional)

3. Approval Logic:
   - Update request status
   - Add user to Better Auth organization members with "player" role
   - Send notification to user
   - Record reviewedBy and reviewedAt

4. Auto-approve for "open" leagues:
   - Check league settings.joinType
   - If "open": add directly to members
   - If "approval_required": create request

Tech stack:
- Hono API
- Better Auth
- Firestore
- TypeScript

Provide:
- API endpoints (POST /league/join, POST /league/join-requests/:id/approve)
- React component for admin review
- Complete logic with error handling
```

### 10.6 Data Sync Function Prompt

```yaml
Create a cloud function that syncs completed game data from Firestore to Firebase Data Connect:

When game status changes to "completed":

1. Read game data from Firestore (games/{gameId})
2. Insert into Data Connect game_results table:
   - gameId, leagueId, seasonId
   - homeTeamId, homeTeamName, homeScore
   - awayTeamId, awayTeamName, awayScore
   - winnerId, gameDate, status

3. Aggregate and update player_season_stats:
   - Sum up stats for each player
   - Update gamesPlayed, points, assists, rebounds, etc.
   - Calculate percentages (fieldGoalPercentage, etc.)
   - Calculate per-game averages (pointsPerGame, etc.)

4. Update team_season_stats:
   - Increment wins/losses
   - Update pointsScored/pointsAllowed
   - Recalculate winPercentage, pointsPerGame

Tech stack:
- Firebase Data Connect
- GraphQL mutations
- Cloud Functions
- TypeScript

Provide:
- Complete cloud function code
- GraphQL mutation definitions
- Error handling and retries
```

### 10.7 Security Rules Prompt

```yaml
Create comprehensive Firestore security rules for a multi-tenant basketball league app:

Collections to protect:
1. Better Auth collections (users, sessions, accounts, organizations, members, invitations):
   - Deny all client access (Admin SDK only)

2. Application collections:
   - organizations/{leagueId}/teams/{teamId}:
     - Read: any league member
     - Write: team_admin only
   
   - organizations/{leagueId}/teams/{teamId}/members/{memberId}:
     - Read: any league member
     - Write: team_admin only
   
   - organizations/{leagueId}/join_requests/{requestId}:
     - Create: authenticated users
     - Read: league admins only
     - Update: league admins only
   
   - games/{gameId}:
     - Read: authenticated users
     - Write: game creator or league admin
   
   - organizations/{leagueId}/followers/{userId}:
     - Read: own document only
     - Write: own document only

Helper functions needed:
- isLeagueMember(leagueId)
- isLeagueAdmin(leagueId)
- isTeamAdmin(leagueId, teamId)
- hasLeaguePermission(leagueId, permission)

Provide complete rules_version = '2' security rules.
```

### 10.8 Complete File Structure Prompt

```md
Generate a complete file structure for a basketball league management monorepo with:

Root:
- Bun workspaces configuration
- TypeScript config (shared)
- Environment variables template

Workspaces:
1. server/ (Hono API):
   - auth.ts (Better Auth config)
   - routes/ (all API endpoints)
   - lib/ (business logic functions)
   - middleware/ (auth, CORS, error handling)

2. expo-web/ (Expo Router app):
   - app/ (file-based routing)
     - (auth)/ (login screens)
     - (app)/ (protected routes)
     - league/ (league pages)
     - team/ (team pages)
     - game/ (game pages)
   - components/ (reusable components)
   - lib/ (Firebase client, auth client, utilities)
   - hooks/ (custom hooks)

3. client/ (Vite + React admin portal):
   - src/routes/ (React Router)
   - src/components/
   - src/lib/

4. shared/ (shared code):
   - types/ (TypeScript interfaces)
   - utils/ (shared utilities)
   - constants/ (subscription limits, etc.)

5. dataconnect/ (Firebase Data Connect):
   - schema/ (GraphQL schema)
   - queries/ (GraphQL queries)
   - mutations/ (GraphQL mutations)

Provide complete directory tree with all files.
```

