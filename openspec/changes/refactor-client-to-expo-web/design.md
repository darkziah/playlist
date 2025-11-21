## Context
The existing web client in `client/` is a Vite + TanStack Router React app that directly integrates with Firebase (Auth, Firestore, Storage). A separate `expo-web/` app uses Expo Router and NativeWind but is not yet the full primary client and does not integrate with Firebase.

The goal of this change is to converge on a single web client shell (`expo-web/`) while preserving the behaviour encoded in existing specs (e.g. `player-profile`) and in the current Vite implementation.

## Goals / Non-Goals
- Goals:
  - Migrate Firebase-backed client functionality (games, rosters, identity, profiles) into the Expo Router app.
  - Preserve Firestore data model, security assumptions, and user-facing behaviour.
  - Keep shared types in `shared/` as the source of truth for domain and API shapes.
- Non-Goals:
  - Changing Firestore collection names or rules.
  - Redesigning core flows (game creation, roster management) beyond what is needed for Expo Router.
  - Immediately deleting or archiving the Vite `client/` app (can be a follow-up change).

## Decisions
- **Primary client shell:** Use `expo-web/` as the primary web client, with Expo Router handling navigation instead of TanStack Router.
- **Firebase client location:** Implement Firebase client helpers (`firebase.ts`, `games.ts`, `gameMasterAuth.ts`, `playerProfile.ts`, `usePlayerIdentityProfile`) inside `expo-web/` mirroring the semantics of the existing `client` helpers.
- **Environment configuration:** Use Expo-friendly public env vars (e.g. `EXPO_PUBLIC_FIREBASE_*`) and map them 1:1 to the existing Firebase project values used by `VITE_FIREBASE_*` in the Vite client.
- **Shared types:** Continue to import domain types from `shared/` for games, rosters, and profiles to keep the server, client, and rules aligned.

## Risks / Trade-offs
- **Risk:** Subtle behavioural differences between the Vite and Expo implementations (e.g. auth state timing, hook lifecycle) could cause regressions.
  - Mitigation: Reuse as much of the existing helper logic as possible and add targeted tests where needed; manually exercise critical flows.
- **Risk:** File upload APIs differ between browser and native contexts.
  - Mitigation: For this change, focus on Expo web behaviour first; keep the implementation web-friendly and design the API so that native support can be added incrementally.
- **Risk:** Environment configuration drift between `client` and `expo-web`.
  - Mitigation: Document the mapping between `VITE_FIREBASE_*` and `EXPO_PUBLIC_FIREBASE_*` and centralise Firebase initialisation in a single module per app.

## Migration Plan
1. Introduce Firebase client helpers into `expo-web` based on the existing `client` implementations, using Expo env vars.
2. Port games, roster, game-master auth, and player profile helpers to `expo-web/lib` and `expo-web/hooks`.
3. Implement Expo Router screens for games, profile, identity setup, and roster flows using the new helpers.
4. Manually validate flows against the Vite client and fix any discrepancies.
5. Once parity is acceptable, prefer `expo-web` as the primary web entry point and plan a follow-up change to deprecate the Vite client.

## Open Questions
- Should the Expo app also support native (iOS/Android) for these flows as part of this change, or is this migration strictly for web parity for now?
- Are there any planned changes to the Firebase project (e.g. new rules, collections) that should be coordinated with this migration?
