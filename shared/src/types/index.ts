export type ApiResponse = {
  message: string;
  success: true;
};

export type GameStatus = "draft" | "scheduled" | "completed" | "cancelled";

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

export type PlayerEntry = {
  id: string;
  gameId: string;
  name: string;
  userId: string;
  notes?: string;
  queueNumber: number;
  createdAt: TimestampString;
  identityProfile?: CompletedPlayerIdentityProfile;
};

export type NewPlayerEntryPayload = {
  name: string;
  userId: string;
  notes?: string;
  identityProfile: CompletedPlayerIdentityProfile;
};
