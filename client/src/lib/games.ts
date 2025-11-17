import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import type {
  Game,
  NewGamePayload,
  NewPlayerEntryPayload,
  PlayerEntry,
} from "shared";

import { db } from "./firebase";

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

  const docRef = await addDoc(gamesCollection, {
    ...payload,
    filledSlots: 0,
    status: "scheduled",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    id: docRef.id,
    ...payload,
    filledSlots: 0,
    status: "scheduled",
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
      status: data.status ?? "scheduled",
      filledSlots: data.filledSlots ?? 0,
      createdAt: toIso(data.createdAt),
      updatedAt: toIso(data.updatedAt),
    };
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
    status: data.status ?? "scheduled",
    filledSlots: data.filledSlots ?? 0,
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

    const queueNumber = filledSlots + 1;
    const rosterRef = doc(rosterCollectionForGame(gameId));
    const createdAt = new Date().toISOString();

    tx.set(rosterRef, {
      gameId,
      name: payload.name,
      userId: payload.userId,
      notes: payload.notes ?? "",
      identityProfile: payload.identityProfile,
      queueNumber,
      createdAt,
    });

    tx.update(gameRef, {
      filledSlots: queueNumber,
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
    };
  });
}

export function watchGames(onChange: (games: Game[]) => void): () => void {
  const q = query(gamesCollection, orderBy("dateTime", "asc"));
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
        status: data.status ?? "scheduled",
        filledSlots: data.filledSlots ?? 0,
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
      status: data.status ?? "scheduled",
      filledSlots: data.filledSlots ?? 0,
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
      };
    });
    onChange(entries);
  });
}
