# Project Structure & Implementation Details

This document provides a detailed breakdown of the application's structure, key feature implementations, and data flows. It serves as a companion to the main `README.md`.

## Monorepo Overview

The project is a **Bun** monorepo with the following workspaces:

- **`client/`**: The web-based administration portal for Game Masters. Built with **Vite + React** and **TanStack Router**.
- **`expo-web/`**: The player-facing mobile/web application. Built with **Expo Router**. This is where the core player experience and live scoring features live.
- **`server/`**: A lightweight **Hono** backend API for specific server-side operations.
- **`shared/`**: Contains TypeScript types and utility functions shared across all workspaces to ensure type safety.

---

## Key Features Implementation

### 1. Match Wizard (Game Master Tool)
**Location**: `expo-web/app/(app)/game/[game-id]/match-wizard.tsx`

The Match Wizard is a 4-step flow designed to help Game Masters quickly set up balanced 5v5 matches.

- **Step 1: Duration**: Select match length (Presets: 15, 20, 25... 60 mins).
- **Step 2: Player Selection**:
    - **Manual Pick**: Tap to select players from the roster.
    - **Auto-Pick Algorithm**: Automatically selects 10 players based on a "Queue Rotation" logic:
        1.  Sorts all checked-in players by their `queueNumber`.
        2.  Calculates the starting index based on the next match number (e.g., Match 1 starts at index 0, Match 2 starts at index 10).
        3.  Selects the next 10 players, wrapping around to the start if necessary.
        4.  Pre-assigns them to Team A (1-5) and Team B (6-10).
- **Step 3: Team Assignment**:
    - Drag-and-drop style interface (implemented via tap) to swap players between Team A and Team B.
    - **Custom Team Names**: GMs can rename "Team A" and "Team B" (e.g., "Red Team" vs "Blue Team").
- **Step 4: Review**: Final summary of duration, teams, and players before starting the match.

### 2. Live Scoring & Stats
**Location**: `expo-web/app/(app)/game/[game-id]/record-stats.tsx`

A real-time scoring interface used by Game Masters during a match.

- **Live Scoreboard**: Displays current score, game clock, and match status.
- **Scoring Modes**:
    - **Custom Mode** (Default): Regular Basket = 1 pt, 3-Pointer = 2 pts.
    - **NBA Mode**: Regular Basket = 2 pts, 3-Pointer = 3 pts.
- **Stat Recording**:
    - Tracks `Points`, `Rebounds` (implied), `Assists` (implied) via simple tap actions.
    - **Undo Functionality**: Allows GMs to revert the last recorded action in case of error.
- **Match History**: Displays a list of completed matches with final scores and winners.
- **Data Sync**: Uses **Firebase Realtime Database** for sub-second latency updates to all connected clients.

### 3. Player Onboarding Wizard
**Location**: `expo-web/app/wizard/`

A dedicated flow for new users to set up their profile.

- **Step 1**: User Details (Username, Name, etc.).
- **Step 2**: Profile Photo upload/selection.
- **Step 3**: Welcome screen and redirection to the main app.

---

## Detailed Directory Guide

### `expo-web/` (Mobile/Player App)

```text
expo-web/
├── app/
│   ├── (app)/                  # Protected App Routes
│   │   ├── (tabs)/             # Bottom Tab Navigation (Home, Games, Profile)
│   │   ├── game/[game-id]/     # Game Context Routes
│   │   │   ├── index.tsx       # Game Lobby / Roster View
│   │   │   ├── match-wizard.tsx# Match Setup Wizard (GM Only)
│   │   │   └── record-stats.tsx# Live Scoring Interface (GM Only)
│   │   └── ...
│   ├── wizard/                 # Onboarding Wizard Routes
│   ├── _layout.tsx             # Root Layout & Providers
│   └── +html.tsx               # HTML Entry point
├── lib/                        # Business Logic
│   ├── games.ts                # Firestore Game operations
│   ├── match-state.ts          # RealtimeDB Match hooks
│   ├── playerStats.ts          # Stat calculation logic
│   └── ...
└── components/                 # UI Components
    ├── wizard/                 # Wizard-specific components
    └── ...
```

### `client/` (Admin/GM Web Portal)

```text
client/
├── src/
│   ├── routes/                 # TanStack Router definitions
│   │   ├── dashboard.tsx       # GM Dashboard
│   │   ├── games/              # Game Management
│   │   └── ...
│   ├── components/             # Shared React components
│   └── main.tsx                # Entry point
└── ...
```

## Data Architecture

### Firestore (Core Data)
- **`games`**: Stores game schedules, metadata, and the `roster` sub-collection.
- **`users`**: Stores user profiles and identity information.
- **`gameMasters`**: Stores UIDs of users with admin privileges.

### Realtime Database (Live Data)
- **`active_matches`**: Stores the current state of a game in progress (score, timer, play-by-play log).
- **`match_history`**: Stores completed match records for a game.
- **`player_stats`**: Aggregated career stats and per-game logs.

### Authentication
- **Firebase Auth**: Handles user sign-up/sign-in.
- **Role-Based Access**:
    - **Players**: Can read games and join queues.
    - **Game Masters**: Can write to games, start matches, and record stats (enforced via Firestore Rules and client-side checks).
