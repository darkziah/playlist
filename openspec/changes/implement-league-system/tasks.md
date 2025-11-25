# Implementation Tasks

## 1. Foundation & Auth

- [x] 1.1 Verify/Setup Monorepo structure and shared types for new schemas.
- [x] 1.2 Configure Better Auth with Firestore adapter and Organization plugin in `server/`.
- [x] 1.3 Create base Firestore collections (`organizations`, `members`, `invitations`) via Better Auth or scripts.
- [x] 1.4 Implement Google OAuth flow in `client/` and `expo-web/`.

## 2. League & Team Management

- [x] 2.1 Implement League creation/settings UI (Expo Web & Client Admin).
- [x] 2.2 Implement League Join workflow (Open vs Approval).
- [x] 2.3 Create `teams` collection and Team creation UI (Request vs Direct).
- [x] 2.4 Implement Team Roster management (add/remove/role).
- [x] 2.5 Implement Player Join Wizard (Jersey, Position, Bio).
- [x] 2.6 Implement Role-based access control helpers in `shared/`.

## 3. Game Management & Scoring

- [x] 3.1 Create `games` collection and Game scheduling UI.
- [x] 3.2 Implement Game Master controls (Start, Stop, Update Score).
- [x] 3.3 Integrate Realtime Database for live game state (`live_games`).
- [x] 3.4 Build Live Score Widget and Game Board UI.
- [x] 3.5 Implement game finish logic (sync to Firestore/Data Connect).

## 4. Notifications & Followers

- [x] 4.1 Implement `followers` collection and Follow League UI.
- [x] 4.2 Create notification preference settings.
- [ ] 4.3 Implement Push Notification logic (Expo) for game events.

## 5. Analytics & Subscriptions

- [ ] 5.1 Set up Firebase Data Connect and GraphQL schema.
- [ ] 5.2 Implement data sync functions (Firestore -> Data Connect).
- [ ] 5.3 Build Analytics Dashboard (Top Scorers, Team Stats).
- [x] 5.4 Implement Subscription Tiers (limits enforcement) and Settings UI.
