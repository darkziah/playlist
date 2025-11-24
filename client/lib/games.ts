import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import type {
  Game,
  NewGamePayload,
  NewPlayerEntryPayload,
  PaymentMethod,
  PaymentStatus,
  PlayerEntry,
} from "shared";

import { db } from "@/lib/firebase";

const gamesCollection = collection(db, "games");

const toIso = (value: unknown): string => {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  return "";
};

export async function createGame(payload: NewGamePayload): Promise<Game> {
  const now = new Date().toISOString();

  const status: Game["status"] = payload.status ?? "scheduled";

  const docRef = await addDoc(gamesCollection, {
    ...payload,
    filledSlots: 0,
    status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    id: docRef.id,
    ...payload,
    filledSlots: 0,
    status,
    createdAt: now,
    updatedAt: now,
  };
}

export async function fetchGames(): Promise<Game[]> {
  const snap = await getDocs(query(gamesCollection, orderBy("dateTime", "asc")));

  return snap.docs.map((docSnap) => {
    const data = docSnap.data() as any;
    return {
      id: docSnap.id,
      title: data.title,
      description: data.description ?? "",
      dateTime: data.dateTime,
      maxPlayers: data.maxPlayers,
      price: data.price,
      status: (data.status as Game["status"] | undefined) ?? "scheduled",
      filledSlots: data.filledSlots ?? 0,
      location: data.location,
      hours: data.hours,
      createdAt: toIso(data.createdAt),
      updatedAt: toIso(data.updatedAt),
    };
  });
}

export async function leaveGame(gameId: string, userId: string): Promise<void> {
  if (!userId) {
    throw new Error("You must be signed in to leave this game");
  }

  await runTransaction(db, async (tx) => {
    const gameRef = doc(gamesCollection, gameId);
    const rosterRef = doc(rosterCollectionForGame(gameId), userId);

    const gameSnap = await tx.get(gameRef);
    if (!gameSnap.exists()) {
      throw new Error("Game not found");
    }

    const rosterSnap = await tx.get(rosterRef);
    if (!rosterSnap.exists()) {
      return;
    }

    const gameData = gameSnap.data() as any;
    const rawDateTime = gameData.dateTime;
    const gameStart = rawDateTime instanceof Timestamp
      ? rawDateTime.toDate()
      : new Date(rawDateTime);
    const now = new Date();
    const msUntilGame = gameStart.getTime() - now.getTime();

    if (Number.isFinite(msUntilGame) && msUntilGame <= 12 * 60 * 60 * 1000) {
      throw new Error(
        "You can no longer leave this game less than 12 hours before it starts.",
      );
    }

    const filledSlots = (gameData.filledSlots as number | undefined) ?? 0;
    const newFilledSlots = Math.max(filledSlots - 1, 0);
    const updatedAt = new Date().toISOString();

    tx.delete(rosterRef);
    tx.update(gameRef, {
      filledSlots: newFilledSlots,
      updatedAt,
    });
  });
}

export async function fetchGameById(gameId: string): Promise<Game | null> {
  const ref = doc(gamesCollection, gameId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as any;
  return {
    id: snap.id,
    title: data.title,
    description: data.description ?? "",
    dateTime: data.dateTime,
    maxPlayers: data.maxPlayers,
    price: data.price,
    status: (data.status as Game["status"] | undefined) ?? "scheduled",
    filledSlots: data.filledSlots ?? 0,
    location: data.location,
    hours: data.hours,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

const rosterCollectionForGame = (gameId: string) =>
  collection(doc(gamesCollection, gameId), "gameRosters");

export async function fetchRoster(gameId: string): Promise<PlayerEntry[]> {
  const snap = await getDocs(
    query(rosterCollectionForGame(gameId), orderBy("queueNumber", "asc")),
  );

  return snap.docs.map((docSnap) => {
    const data = docSnap.data() as any;
    return {
      id: docSnap.id,
      gameId,
      name: data.name,
      userId: data.userId ?? "",
      notes: data.notes ?? "",
      queueNumber: data.queueNumber,
      createdAt: toIso(data.createdAt),
      identityProfile: data.identityProfile,
      paymentMethod: data.paymentMethod,
      paymentStatus: data.paymentStatus,
    };
  });
}

export async function joinGame(
  gameId: string,
  payload: NewPlayerEntryPayload,
): Promise<PlayerEntry> {
  if (!payload.userId) {
    throw new Error("You must be signed in to join this game");
  }

  return runTransaction(db, async (tx) => {
    const gameRef = doc(gamesCollection, gameId);
    const gameSnap = await tx.get(gameRef);

    if (!gameSnap.exists()) {
      throw new Error("Game not found");
    }

    const gameData = gameSnap.data() as any;
    const maxPlayers = gameData.maxPlayers as number;
    const filledSlots = (gameData.filledSlots as number | undefined) ?? 0;

    if (filledSlots >= maxPlayers) {
      throw new Error("Game is full");
    }

    const queueNumber = payload.queueNumber;

    if (!Number.isInteger(queueNumber) || queueNumber < 1 || queueNumber > maxPlayers) {
      throw new Error("Invalid slot selection");
    }

    const rosterRef = doc(rosterCollectionForGame(gameId), payload.userId);
    const existingRosterSnap = await tx.get(rosterRef);

    if (existingRosterSnap.exists()) {
      throw new Error("You have already joined this game");
    }

    const createdAt = new Date().toISOString();

    tx.set(rosterRef, {
      gameId,
      name: payload.name,
      userId: payload.userId,
      notes: payload.notes ?? "",
      identityProfile: payload.identityProfile,
      queueNumber,
      createdAt,
      paymentStatus: "unpaid",
    });

    tx.update(gameRef, {
      filledSlots: filledSlots + 1,
      updatedAt: createdAt,
    });

    return {
      id: rosterRef.id,
      gameId,
      name: payload.name,
      userId: payload.userId,
      notes: payload.notes ?? "",
      queueNumber,
      createdAt,
      identityProfile: payload.identityProfile,
      paymentStatus: "unpaid",
    };
  });
}

export function watchGames(onChange: (games: Game[]) => void): () => void {
  const q = query(gamesCollection, orderBy("dateTime", "asc"), limit(20));
  return onSnapshot(q, (snap) => {
    const games = snap.docs.map((docSnap) => {
      const data = docSnap.data() as any;
      return {
        id: docSnap.id,
        title: data.title,
        description: data.description ?? "",
        dateTime: data.dateTime,
        maxPlayers: data.maxPlayers,
        price: data.price,
        status: (data.status as Game["status"] | undefined) ?? "scheduled",
        filledSlots: data.filledSlots ?? 0,
        location: data.location,
        hours: data.hours,
        createdAt: toIso(data.createdAt),
        updatedAt: toIso(data.updatedAt),
      };
    });
    onChange(games);
  });
}

export function watchGame(
  gameId: string,
  onChange: (game: Game | null) => void,
): () => void {
  const ref = doc(gamesCollection, gameId);
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      onChange(null);
      return;
    }
    const data = snap.data() as any;
    onChange({
      id: snap.id,
      title: data.title,
      description: data.description ?? "",
      dateTime: data.dateTime,
      maxPlayers: data.maxPlayers,
      price: data.price,
      status: (data.status as Game["status"] | undefined) ?? "scheduled",
      filledSlots: data.filledSlots ?? 0,
      location: data.location,
      hours: data.hours,
      createdAt: toIso(data.createdAt),
      updatedAt: toIso(data.updatedAt),
    });
  });
}

export function watchRoster(
  gameId: string,
  onChange: (entries: PlayerEntry[]) => void,
): () => void {
  const q = query(
    rosterCollectionForGame(gameId),
    orderBy("queueNumber", "asc"),
  );
  return onSnapshot(q, (snap) => {
    const entries = snap.docs.map((docSnap) => {
      const data = docSnap.data() as any;
      return {
        id: docSnap.id,
        gameId,
        name: data.name,
        userId: data.userId ?? "",
        notes: data.notes ?? "",
        queueNumber: data.queueNumber,
        createdAt: toIso(data.createdAt),
        identityProfile: data.identityProfile,
        paymentMethod: data.paymentMethod,
        paymentStatus: data.paymentStatus,
      };
    });
    onChange(entries);
  });
}

export async function updateGameFilledSlots(
  gameId: string,
  filledSlots: number,
): Promise<void> {
  const safeFilledSlots = Math.max(0, filledSlots);
  const gameRef = doc(gamesCollection, gameId);
  await updateDoc(gameRef, {
    filledSlots: safeFilledSlots,
    updatedAt: new Date().toISOString(),
  });
}

export type UpdateGamePayload = Partial<
  Omit<Game, "id" | "createdAt" | "updatedAt" | "filledSlots">
>;

export async function updateGame(
  gameId: string,
  updates: UpdateGamePayload,
): Promise<void> {
  const gameRef = doc(gamesCollection, gameId);

  const payload: Record<string, unknown> = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await updateDoc(gameRef, payload);
}

export async function updateRosterOrder(
  gameId: string,
  entries: {
    id: string;
    queueNumber: number;
    paymentMethod?: PaymentMethod;
    paymentStatus?: PaymentStatus;
  }[],
): Promise<void> {
  if (!entries.length) return;

  await runTransaction(db, async (tx) => {
    const gameRef = doc(gamesCollection, gameId);
    const gameSnap = await tx.get(gameRef);

    if (!gameSnap.exists()) {
      throw new Error("Game not found");
    }

    for (const entry of entries) {
      const rosterRef = doc(rosterCollectionForGame(gameId), entry.id);
      const update: Record<string, unknown> = {
        queueNumber: entry.queueNumber,
      };
      if (entry.paymentMethod !== undefined) {
        update.paymentMethod = entry.paymentMethod;
      }
      if (entry.paymentStatus !== undefined) {
        update.paymentStatus = entry.paymentStatus;
      }
      tx.update(rosterRef, update);
    }

    tx.update(gameRef, {
      updatedAt: new Date().toISOString(),
    });
  });
}

export async function deleteRosterEntry(
  gameId: string,
  entryId: string,
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const gameRef = doc(gamesCollection, gameId);
    const rosterRef = doc(rosterCollectionForGame(gameId), entryId);

    const gameSnap = await tx.get(gameRef);
    if (!gameSnap.exists()) {
      throw new Error("Game not found");
    }

    const rosterSnap = await tx.get(rosterRef);
    if (!rosterSnap.exists()) {
      return;
    }

    const gameData = gameSnap.data() as any;
    const filledSlots = (gameData.filledSlots as number | undefined) ?? 0;
    const newFilledSlots = Math.max(filledSlots - 1, 0);

    tx.delete(rosterRef);
    tx.update(gameRef, {
      filledSlots: newFilledSlots,
      updatedAt: new Date().toISOString(),
    });
  });
}

export async function updateRosterPayment(
  gameId: string,
  entryId: string,
  payment: { paymentMethod?: PaymentMethod; paymentStatus?: PaymentStatus },
): Promise<void> {
  const rosterRef = doc(rosterCollectionForGame(gameId), entryId);

  const update: Record<string, unknown> = {};

  if (payment.paymentMethod !== undefined) {
    update.paymentMethod = payment.paymentMethod;
  }

  if (payment.paymentStatus !== undefined) {
    update.paymentStatus = payment.paymentStatus;
  }

  // Nothing to do
  if (Object.keys(update).length === 0) {
    return;
  }

  await updateDoc(rosterRef, update);
}