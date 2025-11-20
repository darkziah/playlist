# PlayList

A full-stack TypeScript app for managing a "playlist" of upcoming games and the players who join them. Built on the **bhvr** stack using Bun, Hono, Vite, React, and Expo.

## Purpose

- Help **Game Masters** schedule games with clear capacity limits and pricing.
- Provide **Players** with a simple way to browse upcoming games and join a roster queue.
- Keep client, server, and shared types in sync so the experience is type-safe end-to-end.

## Domain Model

### Games

The core entity of the application. Game Masters schedule games which players can join.

- **Metadata**: Title, description, date/time, location, price, duration (hours).
- **Status**: `draft`, `scheduled`, `completed`, `cancelled`.
- **Capacity**: `maxPlayers` determines the limit. `filledSlots` tracks current occupancy.

### Users & Players

- **Players**: Authenticated users who browse and join games.
- **Identity Profile**: Captures `username`, `firstName`, `lastName`, `dateOfBirth`, `barangay`, and `photoUrl`.
- **Roster Entries**: When a player joins a game, a `PlayerEntry` is created in the game's roster. It includes:
   - `queueNumber`: Their position in the list.
   - `paymentStatus`: `unpaid` or `paid`.
   - `paymentMethod`: `cash` or `gcash`.
   - `identityProfile`: Snapshot of their profile at time of joining.

### Game Masters

- **Role**: Privileged users who can create, update, and delete games.
- **Permissions**: Managed via `gameMasters` collection in Firestore. Only users with a document in this collection can perform administrative actions.

## System Architecture

```mermaid
graph TD
    subgraph Clients
        Web[Client Web (Vite/React)]
        Mobile[Mobile/Expo Web (Expo Router)]
    end

    subgraph Backend Services
        Hono[Hono Server (Bun)]
        FirebaseAuth[Firebase Auth]
    end

    subgraph Data Storage
        Firestore[(Firestore)]
        RealtimeDB[(Realtime Database)]
    end

    Web --> FirebaseAuth
    Mobile --> FirebaseAuth
    
    Web --> Hono
    Mobile --> Hono

    Web --> Firestore
    Mobile --> Firestore
    
    Mobile --> RealtimeDB
    
    Hono --> Firestore
    
    Firestore -->|Games & Rosters| Clients
    Firestore -->|User Profiles| Clients
    RealtimeDB -->|Player Stats| Mobile
```

## Route Structure

### Web Client (`client/`)

Built with TanStack Router.

- **`/`**: Landing page.
- **`/dashboard`**: Main hub for authenticated users to view upcoming games.
- **`/identity-setup`**: Onboarding flow for new users to create their Player Identity.
- **`/games/$gameId`**: Detailed view of a specific game.
   - View roster status.
   - Join/Leave queue.
   - Game Masters can manage the game here.

- **`/profile`**: View and edit own user profile.
- **`/invite/$token`**: Route for processing Game Master invites.

### Mobile / Expo Web (`expo-web/`)

Built with Expo Router (file-based routing).

- **`(app)/`**: Protected application routes.
   - **`(tabs)/`**: Main navigation tabs (Home, Games, Profile).
   - **`game/[game-id]/`**: Game details and interaction.
      - **`index.tsx`**: Roster view and queue management.
      - **`match-wizard.tsx`**: GM tool for setting up 5v5 matches with auto-pick.
      - **`record-stats.tsx`**: Live scoring interface for active matches.
   - **`game-masters/`**: Admin tools for Game Masters.
   - **`profile/[profile-id]`**: Public profile view of other players.

- **`wizard/`**: Specialized flows for complex tasks (User Onboarding).

> **Note**: For a more detailed breakdown of the project structure and feature implementations, see [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md).

## Game Master Roles

Game Masters (GMs) are privileged users who manage the game schedule.

- **Authorization**: A user is a GM if their User UID exists as a document in the `gameMasters` collection in Firestore.
- **Capabilities**:
   - **Create Games**: Schedule new games with capacity, price, and location.
   - **Manage Games**: Update details, cancel games, or mark them as completed.
   - **Invites**: Generate tokens to invite other users to become Game Masters (`gameMasterInvites`).

- **Security**: Firestore Security Rules (`firestore.rules`) strictly enforce that only authenticated users with a matching `gameMasters` document can write to the `games` collection.

## Game Matches & Statistics

While **Firestore** handles game scheduling and rosters, **Realtime Database** is used for high-frequency player statistics and match records.

### Stats Data Model

Located in `expo-web/lib/playerStats.ts`.

- __Career Stats__ (`player_stats/{userId}/career`):
   - Aggregated totals: `gamesPlayed`, `wins`, `losses`.
   - Performance totals: `totalPoints`, `totalRebounds`, `totalAssists`, etc.
   - Shooting: `fieldGoalsMade/Attempted`, `threePointersMade/Attempted`.

- __Game Logs__ (`player_stats/{userId}/games/{gameId}`):
   - Individual match performance records.
   - Linked to specific `gameId` and timestamp.

### Recording Logic

1. **Match Completion**: When a game is finished, stats are recorded.
2. **Batch Update**: The system updates both the individual game log and the player's career totals in a single operation.
3. **Validation**: Input stats are validated (e.g., made shots cannot exceed attempted) before write.

## Project Structure

The project is organized as a monorepo using Bun workspaces:

```text
.
├── client/               # React frontend (Vite + TanStack Router/Query/Form)
│   ├── src/routes/       # Application routes
│   └── src/components/   # UI components
├── server/               # Hono backend API
├── expo-web/             # Expo Router app (Mobile/Web shell)
│   ├── app/              # Expo Router file-based routes
│   └── lib/              # Business logic (e.g. playerStats.ts)
├── shared/               # Shared TypeScript definitions
│   └── src/types/        # Domain types (Game, PlayerEntry, etc.)
├── openspec/             # Project specifications and change management
├── package.json          # Root package.json
└── turbo.json            # Build orchestration
```

## Getting Started

### Installation

```bash
# Install dependencies for all workspaces
bun install
```

### Development

```bash
# Run all workspaces in development mode with Turbo
bun run dev

# Or run individual workspaces directly
bun run dev:client    # Run the Vite dev server for React
bun run dev:server    # Run the Hono backend
bun run dev:expo      # Run the Expo app
```

### Building

```bash
# Build all workspaces with Turbo
bun run build
```

## Tech Stack Details

- **Runtime**: [Bun](https://bun.sh)
- **Backend Framework**: [Hono](https://hono.dev)
- **Frontend Framework**: [React](https://react.dev) + [Vite](https://vitejs.dev)
- **Mobile/Web Shell**: [Expo](https://expo.dev)
- **Routing**: [TanStack Router](https://tanstack.com/router)
- **State/Data**: [TanStack Query](https://tanstack.com/query)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com)
