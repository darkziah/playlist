# Project Context

## Purpose
Playlist is a full‑stack TypeScript app for managing a "playlist" of upcoming games and the players who join them. The primary goals are:

- Help game masters schedule games with clear capacity limits and pricing.
- Provide players with a simple way to browse upcoming games and join a roster queue.
- Keep client, server, and shared types in sync so the experience is type‑safe end‑to‑end.

## Tech Stack
- **Language:** TypeScript across all workspaces (`client`, `server`, `shared`).
- **Runtime & Package Manager:** Bun (`packageManager: bun@…`), with Turbo orchestrating workspace tasks.
- **Frontend:** React + Vite in `client/`, with:
  - TanStack Router for routing.
  - TanStack Query for data fetching and caching.
  - TanStack React Form for form state and validation.
  - Tailwind v4 for styling; Radix UI primitives; Lucide icons; Sonner for toasts.
- **Mobile / Web Shell:** Expo Router app in `expo-web/` (React Native + Web) using NativeWind/Tailwind and lucide-react-native icons.
- **Backend:** Hono server in `server/` (Bun target) exposing a JSON API and sharing types with the client.
- **Shared Package:** `shared/` for cross‑cutting TypeScript types and utilities.
- **Persistence & Auth:** Firebase (Cloud Firestore + Firebase Auth) used directly from the client.
- **Tooling:**
  - Turbo (`turbo.json`) for `build`, `dev`, `type-check`, and `test` pipelines.
  - Biome (`biome.json`) for formatting and linting.
  - Vitest for client tests.
  - OpenSpec (`openspec/`) for spec‑driven development.

## Project Conventions

### Code Style
- **TypeScript‑first:** Prefer TypeScript for all code; avoid `any` where practical, but Biome’s `noExplicitAny` is disabled to allow escape hatches.
- **Modules:** ES modules everywhere (`type: module` in the client); imports from the `shared` workspace rather than duplicating types.
- **Formatting:**
  - Managed by Biome.
  - Tabs for indentation.
  - Double quotes for JavaScript/TypeScript string literals.
  - Automatic import organization enabled via Biome assist.
- **React:**
  - Functional components with hooks.
  - Co‑locate route components under `client/src/routes` and shared UI under `client/src/components`.
  - Prefer controlled inputs and explicit form schemas when using TanStack React Form.
- **CSS/Styling:**
  - Tailwind 4 via `@tailwindcss/vite` with utility‑first classes.
  - Color palette and theme exposed via CSS variables in `client/src/index.css`.

### Architecture Patterns
- **Monorepo:**
  - Root `package.json` defines Bun workspaces: `server`, `client`, `shared`, `expo-web`.
  - Turbo pipelines keep builds, tests, and type‑checks consistent across packages.
- **Shared Types:**
  - `shared/` contains types that describe API payloads and shared domain concepts.
  - Server responses and client fetch layers should import from `shared` instead of redefining types.
- **Backend:**
  - Hono app in `server/src/index.ts` (and related files) defines HTTP routes.
  - Server is intended to be deployable to Bun, Node, or edge runtimes with minimal changes.
- **Frontend:**
  - TanStack Router is the source of truth for routing.
  - TanStack Query handles server state; mutations and queries should be defined in a central place (e.g. hooks) and reused by components.
  - Firestore is accessed through a small set of well‑defined helpers/hooks to keep usage consistent.
- **Specs as Source of Truth:**
  - `openspec/` governs capabilities and change proposals.
  - Specs describe behavior for game scheduling, game‑master flows, and UI shell; implementation should follow the approved specs.

### Testing Strategy
- **Unit & Integration Tests (Client):**
  - Use Vitest for React components, hooks, and Firestore integration logic.
  - Store tests alongside the code (`*.test.ts(x)`/`*.spec.ts(x)`) or in `__tests__` folders; Turbo’s `test` task is already configured to pick these up.
- **Type Safety:**
  - `bun run type-check` runs Turbo’s `type-check` pipeline across workspaces.
  - Changes that modify shared types or contracts should pass type‑checking in all packages.
- **Linting & Formatting:**
  - `bun run lint` (Biome) is expected to succeed before merging.
  - `bun run format` can be used to apply formatting fixes.
- **Manual Flows (for now):**
  - Critical user flows (game master identity setup, creating a game, joining/leaving rosters) should at minimum be exercised manually when behavior changes, until automated end‑to‑end tests are added.

### Git Workflow
- **Branching:**
  - Use feature branches (e.g. `feat/game-roster-filters`, `fix/firestore-rules`) off the main branch.
  - Keep branches focused on a single logical change.
- **Commits:**
  - Prefer small, descriptive commits with imperative subjects (e.g. `add game roster join flow`).
  - When a change is spec‑driven, reference the OpenSpec `change-id` in the commit message and/or PR (e.g. `add-identity-setup-route`).
- **Specs & Changes:**
  - For non‑trivial behavior changes, create or update an OpenSpec change under `openspec/changes/` and get approval before implementation.
  - After deployment, archive changes per the `openspec/AGENTS.md` workflow.

## Domain Context
- **Core Concept:** The app models a playlist of upcoming games. Each game has metadata like title, description, `dateTime`, `maxPlayers`, `price`, and `status`, plus derived fields such as `filledSlots`.
- **Roster Management:**
  - Players join a `gameRosters` subcollection for a given game.
  - Roster entries include `name`, optional `notes`, `queueNumber`, and timestamps.
  - The client enforces `filledSlots <= maxPlayers` (and Firestore rules are expected to back this up over time).
- **Roles:**
  - **Game Masters:** Authenticated users who are allowed to create, update, and delete games.
  - **Players:** Authenticated or anonymous users (depending on future rules) who can read games and create roster entries.
- **Firestore Data Model (high‑level):**
  - `games` – scheduled games (publicly readable; only game masters may create/update/delete).
  - `games/{gameId}/gameRosters` – roster entries for a specific game (publicly readable; all users may create entries).
  - `gameMasters` – per‑user documents enabling game‑master privileges.
  - `gameMasterInvites` – tokens/invites that help manage promotion to game master.
  - `playerProfiles` – per‑user profiles; each user may only read/write their own document.
- **Access Control:**
  - Firestore security rules encode role‑based access (game master vs regular player) and per‑user ownership for sensitive docs.
  - When implementing features, always assume Firestore rules are the ultimate gatekeeper and avoid relying solely on client‑side checks.

## Important Constraints
- **Runtime & Tooling:**
  - Bun is the canonical runtime and package manager; scripts are expected to run via `bun run …`.
  - Turbo tasks should stay fast and cache‑friendly; avoid introducing heavy global side effects in build/test steps.
- **Data & Security:**
  - Do not bypass Firestore rules; server or tooling that writes directly to Firestore must maintain the same invariants (game masters manage games; users only mutate their own profile documents; roster entries are append‑only for other users).
  - Roster logic must respect `maxPlayers` and should avoid race conditions that overfill games.
- **Specs Discipline:**
  - For behavior that impacts players or game masters, prefer to update OpenSpec specs and changes before large refactors.
  - Specs are treated as the source of truth for intended behavior; code changes should converge to them.
- **Monorepo:**
  - Shared types must remain backward‑compatible when possible; breaking changes should be coordinated across client and server.

## External Dependencies
- **Firebase Project:**
  - Cloud Firestore (rules in `firestore.rules`) as the primary database.
  - Firebase Auth to identify users and gate access (e.g., `request.auth.uid` in rules).
- **Hosting / Infra (flexible by design):**
  - Client is built as a Vite React app and can be deployed to static hosts (e.g. Netlify, Cloudflare Pages, etc.).
  - Server is a Hono app suitable for Bun, Node, or edge runtimes.
  - `expo-web` is an Expo Router app targeting web (and compatible with native) and is run locally with `bun run dev` inside `expo-web/`.
- **Ecosystem Libraries:**
  - TanStack (Router, Query, Form), Radix UI, Lucide, Sonner, Tailwind 4.
  - These are considered part of the standard stack; new UI or data‑flow patterns should integrate with them rather than introduce competing abstractions.
