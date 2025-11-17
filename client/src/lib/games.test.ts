import { describe, expect, it, vi } from "vitest";

vi.mock("./firebase", () => ({
  db: {},
}));

vi.mock("firebase/firestore", () => {
  const gameState = { maxPlayers: 2, filledSlots: 2 };

  const noop = () => undefined;

  return {
    addDoc: vi.fn(),
    collection: vi.fn((...args) => ({ __type: "collection", args })),
    doc: vi.fn((...args) => ({ __type: "doc", args })),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    onSnapshot: vi.fn(),
    orderBy: vi.fn(),
    query: vi.fn(),
    runTransaction: vi.fn(async (_db, updateFn: any) =>
      updateFn({
        get: async () => ({
          exists: () => true,
          data: () => gameState,
        }),
        set: noop,
        update: noop,
      }),
    ),
    serverTimestamp: vi.fn(),
    Timestamp: class Timestamp { },
  };
});

import { joinGame } from "./games";

describe("joinGame", () => {
  it("throws when the game is full", async () => {
    await expect(
      joinGame("game-1", {
        name: "Alice",
      }),
    ).rejects.toThrow("Game is full");
  });
});
