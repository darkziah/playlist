## 1. Planning & environment
- [ ] 1.1 Confirm that `expo-web/` is intended to become the primary web client for this project (with `client/` kept only as reference or retired later).
- [ ] 1.2 Decide and document the Firebase env var scheme for Expo (e.g. `EXPO_PUBLIC_FIREBASE_*`) and how it maps to the existing Firebase project.

## 2. Firebase integration in expo-web
- [ ] 2.1 Add Firebase client SDK dependencies to `expo-web` (Auth, Firestore, Storage) using Bun.
- [ ] 2.2 Implement `expo-web/lib/firebase.ts` that initialises `app`, `auth`, `db`, and `storage` using Expo-friendly env vars.
- [ ] 2.3 Port `client/src/lib/games.ts` to `expo-web/lib/games.ts`, preserving Firestore collection names, document shapes, and roster logic.
- [ ] 2.4 Port `client/src/lib/gameMasterAuth.ts` to `expo-web/lib/gameMasterAuth.ts`, adapting any browser-specific APIs to work in Expo web (and remaining compatible with native where possible).
- [ ] 2.5 Port `client/src/lib/playerProfile.ts` to `expo-web/lib/playerProfile.ts`, accounting for file upload differences between web and native where needed.
- [ ] 2.6 Port `client/src/hooks/usePlayerIdentityProfile.ts` to `expo-web/hooks/usePlayerIdentityProfile.ts` and ensure it interoperates with the new Firebase layer.

## 3. Route & UI migration
- [ ] 3.1 Inventory the key routes/components in `client/src/routes` (games list, game detail, roster, identity setup, dashboard, profile) and map them to Expo Router segments under `expo-web/app/`.
- [ ] 3.2 Implement Expo Router screens for games list and game detail that use the new `expo-web/lib/games` helpers and any shared types from `shared/`.
- [ ] 3.3 Implement identity setup/profile editing screens that use `usePlayerIdentityProfile` and `playerProfile` helpers.
- [ ] 3.4 Implement the public player profile screen at `/profile/[profile-id]` in `expo-web/app` that satisfies `specs/player-profile/spec.md`.
- [ ] 3.5 Wire roster entries in the game detail screen to navigate to the public player profile route as described in the `player-profile` spec.

## 4. Validation & parity checks
- [ ] 4.1 Verify that `expo-web` can perform all Firebase operations currently supported by `client` (auth, games, rosters, profiles, uploads) against the same Firestore project.
- [ ] 4.2 Run `bun run type-check` and `bun run lint` at the repo root to ensure the migration does not break shared types or tooling.
- [ ] 4.3 Manually exercise critical flows (game creation where applicable, joining/leaving games, viewing rosters, identity setup, player profiles) in `expo-web` and compare behaviour with the existing `client` implementation.
- [ ] 4.4 Update `expo-web/README.md` (and root docs if needed) to describe how to configure Firebase env vars and run the Expo web client.
- [ ] 4.5 (Optional / future) Plan a follow-up change to retire or freeze the Vite `client/` once parity is fully achieved.
