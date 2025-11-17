import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("./firebase", () => {
  const auth = { currentUser: null as any };
  const db = {};
  return { auth, db };
});

vi.mock("firebase/auth", () => {
  const GoogleAuthProvider = vi.fn(function Provider() { });
  return {
    GoogleAuthProvider,
    signInWithPopup: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChanged: vi.fn(),
  };
});

vi.mock("firebase/firestore", () => {
  const store = new Map<string, any>();

  const collection = vi.fn((_db: any, path: string) => ({
    __type: "collection",
    path,
  }));

  const doc = vi.fn((parent: any, id: string) => {
    if (parent && parent.__type === "collection") {
      return { __type: "doc", path: `${parent.path}/${id}` };
    }
    throw new Error("Unsupported doc parent in mock");
  });

  const getDoc = vi.fn(async (ref: any) => {
    const data = store.get(ref.path);
    return {
      exists: () => data !== undefined,
      data: () => data,
    };
  });

  const setDoc = vi.fn(
    async (
      ref: any,
      data: any,
      options?: {
        merge?: boolean;
      },
    ) => {
      const existing = store.get(ref.path);
      if (options?.merge && existing) {
        store.set(ref.path, { ...existing, ...data });
      } else {
        store.set(ref.path, data);
      }
    },
  );

  const serverTimestamp = vi.fn(() => "server-timestamp");

  let nowMillis = 0;
  const Timestamp = {
    fromDate(date: Date) {
      return { toMillis: () => date.getTime() };
    },
    now() {
      return { toMillis: () => nowMillis };
    },
    __setNow(value: number) {
      nowMillis = value;
    },
  } as const;

  return {
    collection,
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
    Timestamp,
    __store: store,
  };
});

import * as firestore from "firebase/firestore";
import { auth } from "./firebase";
import {
  acceptGameMasterInvite,
  canUserCreateGame,
  loginGameMaster,
  logoutGameMaster,
} from "./gameMasterAuth";

describe("gameMasterAuth helpers", () => {
  const store = (firestore as any).__store as Map<string, any>;
  const Timestamp = firestore.Timestamp as any;

  beforeEach(() => {
    store.clear();
    Timestamp.__setNow(1_000_000);
    (auth as any).currentUser = null;
  });

  it("loginGameMaster resolves without error", async () => {
    await expect(loginGameMaster()).resolves.toBeUndefined();
  });

  it("logoutGameMaster resolves without error", async () => {
    await expect(logoutGameMaster()).resolves.toBeUndefined();
  });

  it("rejects invite when no user is signed in", async () => {
    (auth as any).currentUser = null;

    const result = await acceptGameMasterInvite("token-no-user");

    if (result.kind !== "invalid") {
      throw new Error("Expected invite to be invalid for unsigned user");
    }

    expect(result.reason).toMatch(/must be logged in/i);
  });

  it("accepts a valid invite and marks user as game master", async () => {
    (auth as any).currentUser = {
      uid: "user-1",
      email: "gm@example.com",
    } as any;

    store.set("gameMasterInvites/valid-token", {
      email: "gm@example.com",
      createdAt: "created-at",
      createdBy: "seed-user",
      expiresAt: { toMillis: () => 2_000_000 },
      used: false,
    });

    const result = await acceptGameMasterInvite("valid-token");

    expect(result).toEqual({ kind: "accepted" });

    const gmDoc = store.get("gameMasters/user-1");
    expect(gmDoc).toBeDefined();
    expect(gmDoc.email).toBe("gm@example.com");

    const inviteDoc = store.get("gameMasterInvites/valid-token");
    expect(inviteDoc.used).toBe(true);
    expect(inviteDoc.usedBy).toBe("user-1");
  });

  it("rejects invite when email does not match", async () => {
    (auth as any).currentUser = {
      uid: "user-2",
      email: "other@example.com",
    } as any;

    store.set("gameMasterInvites/mismatch-token", {
      email: "gm@example.com",
      expiresAt: { toMillis: () => 2_000_000 },
      used: false,
    });

    const result = await acceptGameMasterInvite("mismatch-token");

    if (result.kind !== "invalid") {
      throw new Error("Expected invite to be invalid for mismatched email");
    }

    expect(result.reason).toMatch(/different email/i);
    expect(store.get("gameMasters/user-2")).toBeUndefined();
  });

  it("indicates that non-game masters cannot create games", () => {
    expect(canUserCreateGame(false)).toBe(false);
    expect(canUserCreateGame(true)).toBe(true);
  });
});
