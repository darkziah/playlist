# Change: Migrate web client from Vite (TanStack Router) to Expo Router (expo-web)

## Why
The current web client lives in `client/` (Vite + TanStack Router) and talks directly to Firebase (Auth, Firestore, Storage). There is a second app in `expo-web/` that already uses Expo Router and NativeWind but does not yet host the full experience or integrate with Firebase.

To avoid maintaining two separate web clients and to align with the Expo Router stack, we want `expo-web/` to become the primary web client shell while preserving existing behaviour and routes (e.g. games, rosters, identity setup, public player profiles).

## What Changes
- Migrate the web client implementation from `client/` to `expo-web/` while preserving existing behaviour and routes.
- Introduce a Firebase client layer in `expo-web/` that mirrors the existing helpers from `client/src/lib`:
  - `firebase.ts` (app, auth, db, storage initialisation)
  - `games.ts` (games list, game detail, roster join/leave, live queries)
  - `gameMasterAuth.ts` (auth state, invites, dashboard access helpers)
  - `playerProfile.ts` and `usePlayerIdentityProfile` (profile CRUD, username checks, profile photo upload, identity completeness checks).
- Update environment configuration for Firebase so that `expo-web` uses Expo-compatible env vars (e.g. `EXPO_PUBLIC_FIREBASE_*`) instead of `VITE_FIREBASE_*`, while still pointing at the same Firebase project.
- Implement Expo Router screens that correspond to the existing client routes, including:
  - Games list and game detail with roster view/join/leave.
  - Identity setup/profile editing.
  - Public player profile view and navigation from rosters, as described in `specs/player-profile/spec.md`.
- Keep the Firestore data model and security assumptions identical (collections, document shapes, role checks), so that the server and rules do not need to change.

## Impact
- **Specs:**
  - `player-profile` – UI implementation moves to Expo Router screens, while keeping the same `/profile/{profileId}` behaviour and roster-deep-linking.
  - Future capabilities for games and roster flows should be aligned with this migration but are not yet captured as standalone specs.
- **Code:**
  - **Source / reference (existing):**
    - `client/src/lib/firebase.ts`
    - `client/src/lib/games.ts`
    - `client/src/lib/gameMasterAuth.ts`
    - `client/src/lib/playerProfile.ts`
    - `client/src/hooks/usePlayerIdentityProfile.ts`
    - `client/src/routes/*`
  - **Target (new/updated):**
    - `expo-web/lib/firebase.ts`
    - `expo-web/lib/games.ts`
    - `expo-web/lib/gameMasterAuth.ts`
    - `expo-web/lib/playerProfile.ts`
    - `expo-web/hooks/usePlayerIdentityProfile.ts`
    - `expo-web/app/**/*` (Expo Router screens for games, profile, identity, dashboard, etc.)
- **Breaking Changes:**
  - None intended at the behavioural level; this is a client-shell migration. Any breaking route/path changes must be called out explicitly in follow-up specs.
