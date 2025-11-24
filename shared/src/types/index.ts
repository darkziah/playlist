import type { GameStatus } from "./schema";

export * from "./schema";

export type ApiResponse = {
  message: string;
  success: true;
};

// GameStatus is now imported from schema.ts

export type TimestampString = string;

export type Game = {
  id: string;
  title: string;
  description: string;
  dateTime: TimestampString;
  maxPlayers: number;
  price: number;
  status: GameStatus;
  filledSlots: number;
  location?: string;
  hours?: number;
  createdAt: TimestampString;
  updatedAt: TimestampString;
};

export type NewGamePayload = Omit<
  Game,
  "id" | "filledSlots" | "createdAt" | "updatedAt"
>;

export type PlayerIdentityProfile = {
  username?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: TimestampString;
  barangay?: string;
  photoUrl?: string;
};

export type CompletedPlayerIdentityProfile = Required<
  Pick<PlayerIdentityProfile, "username" | "firstName" | "lastName" | "dateOfBirth">
> & {
  barangay?: string;
  photoUrl?: string;
};

export type PaymentMethod = "cash" | "gcash";

export type PaymentStatus = "unpaid" | "paid";

export type PlayerEntry = {
  id: string;
  gameId: string;
  name: string;
  userId: string;
  notes?: string;
  queueNumber: number;
  createdAt: TimestampString;
  identityProfile?: CompletedPlayerIdentityProfile;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
};

export type NewPlayerEntryPayload = {
  name: string;
  userId: string;
  notes?: string;
  identityProfile: CompletedPlayerIdentityProfile;
  queueNumber: number;
};
