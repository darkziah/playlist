# Change: Add roster profile links from games to player profile route

## Why
Game masters and players need a fast way to see who has joined a game and review basic identity details for those players without leaving the app context.

## What Changes
- Add a dedicated player profile route at `/profile/$profileId` that renders a read-only, public-safe view of a player's identity.
- Make player names in the game roster on `/games/$gameId` clickable, navigating to the corresponding player profile route.
- Ensure the profile view only shows non-sensitive, public-safe fields from the player's identity profile.

## Impact
- Affected specs: `player-profile`.
- Affected code (initially expected):
  - `client/src/routes/games/$gameId.tsx` (make roster entries link to profiles).
  - `client/src/routes/profile/$profileId.tsx` (new route for viewing profiles).
  - Any Firestore helpers used to read player profile data.
