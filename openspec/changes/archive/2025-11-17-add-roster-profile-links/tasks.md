## 1. Implementation
- [x] 1.1 Add a `player-profile` capability delta spec for this change under `openspec/changes/add-roster-profile-links/specs/player-profile/spec.md`.
- [x] 1.2 Implement a TanStack Router route `client/src/routes/profile/$profileId.tsx` that:
  - [x] Fetches the referenced player's profile context using public-safe data passed from the roster entry.
  - [x] Renders a read-only profile card with username, avatar (if present), and basic identity fields that are safe to show to other players.
  - [x] Handles loading and "not available" states gracefully.
- [x] 1.3 Update `client/src/routes/games/$gameId.tsx` so each joined player's display name in the roster is rendered as a link or button that navigates to `/profile/$profileId` for that player using TanStack Router navigation.
- [x] 1.4 Ensure data used for other players' profiles respects `firestore.rules` and security constraints by relying on the public-safe identity snapshot embedded in roster entries instead of direct cross-user `playerProfiles` reads.
- [x] 1.5 Apply basic UI/UX polish (responsive layout, typography) so the profile view visually fits alongside the existing game detail styles.

## 2. Validation
- [x] 2.1 Manually verify: from `/games/$gameId`, clicking a player's name opens `/profile/$profileId` with the correct data for that player.
- [ ] 2.2 Run `bun run type-check` and `bun run lint` and ensure they pass. *(Note: `bun run type-check` passes; `bun run lint` currently fails due to existing lint issues in other routes like `dashboard.tsx` and `profile.tsx`, unrelated to this change.)*
- [x] 2.3 Run `bunx openspec validate add-roster-profile-links --strict` and ensure the change passes.
