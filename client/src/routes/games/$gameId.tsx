import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import type { Game, NewPlayerEntryPayload, PlayerEntry } from "shared";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { auth } from "@/lib/firebase";
import {
  fetchGameById,
  fetchRoster,
  joinGame,
  leaveGame,
  watchGame,
  watchRoster,
} from "@/lib/games";
import { usePlayerIdentityProfile } from "@/hooks/usePlayerIdentityProfile";

export const Route = createFileRoute("/games/$gameId")({
  component: GameDetailRoute,
});

function GameDetailRoute() {
  const { gameId } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, profile, loading: identityLoading, profileComplete } =
    usePlayerIdentityProfile();

  const { data: game, isLoading: gameLoading } = useQuery<Game | null>({
    queryKey: ["game", gameId],
    queryFn: () => fetchGameById(gameId),
    enabled: !!gameId,
  });

  const { data: roster = [], isLoading: rosterLoading } = useQuery<
    PlayerEntry[]
  >({
    queryKey: ["roster", gameId],
    queryFn: () => fetchRoster(gameId),
    enabled: !!gameId,
  });

  const handleSignIn = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      await router.navigate({
        to: "/identity-setup",
        search: { returnTo: `/games/${gameId}` },
      });
    } catch (err) {
      console.error("Sign-in failed", err);
      setError("Unable to sign in. Please try again.");
    }
  };

  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const joinMutation = useMutation({
    mutationFn: (payload: NewPlayerEntryPayload) => joinGame(gameId, payload),
    onSuccess: (entry) => {
      queryClient.setQueryData<PlayerEntry[]>(["roster", gameId], (old) => {
        const current = old ?? [];
        return [...current, entry].sort(
          (a, b) => a.queueNumber - b.queueNumber,
        );
      });
      setNotes("");
      setError(null);
    },
    onError: (err: any) => {
      setError(err?.message ?? "Unable to join game");
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("You must be signed in to leave this game.");
      }
      await leaveGame(gameId, user.uid);
    },
    onSuccess: () => {
      queryClient.setQueryData<PlayerEntry[]>(["roster", gameId], (old) => {
        const current = old ?? [];
        if (!user) return current;
        return current.filter((entry) => entry.userId !== user.uid);
      });
      queryClient.setQueryData<Game | null>(["game", gameId], (old) => {
        if (!old) return old;
        return {
          ...old,
          filledSlots: Math.max((old.filledSlots ?? 0) - 1, 0),
        };
      });
      setSelectedSlot(null);
      setError(null);
    },
    onError: (err: any) => {
      setError(err?.message ?? "Unable to leave game");
    },
  });

  useEffect(() => {
    if (!gameId) return;

    const stopGame = watchGame(gameId, (updated) => {
      queryClient.setQueryData(["game", gameId], updated);
    });
    const stopRoster = watchRoster(gameId, (entries) => {
      queryClient.setQueryData(["roster", gameId], entries);
    });

    return () => {
      stopGame();
      stopRoster();
    };
  }, [gameId, queryClient]);

  const isLoading = gameLoading || rosterLoading;

  const occupiedSlots =
    !!game && roster.length > 0
      ? new Set(roster.map((entry) => entry.queueNumber))
      : new Set<number>();

  const maxPlayers = game?.maxPlayers ?? 0;
  const allSlots = maxPlayers > 0 ? Array.from({ length: maxPlayers }, (_, i) => i + 1) : [];
  const availableSlots = allSlots.filter((slot) => !occupiedSlots.has(slot));

  const currentUserEntry = user
    ? roster.find((entry) => entry.userId === user.uid)
    : undefined;
  const isJoined = !!currentUserEntry;

  const isFull = !!game && availableSlots.length === 0;
  const canJoinBase = !!user && profileComplete && !isFull && !isJoined;
  const selectDisabled =
    !canJoinBase || joinMutation.isPending || availableSlots.length === 0;
  const notesDisabled = !canJoinBase || joinMutation.isPending;
  const joinDisabled =
    !canJoinBase || joinMutation.isPending || selectedSlot == null;
  const joinButtonLabel = !user
    ? "Sign in to join"
    : !profileComplete
      ? "Finish signup to join"
      : isFull
        ? "Game is full"
        : isJoined
          ? "You are already joined"
          : selectedSlot == null
            ? "Pick a slot to join"
            : joinMutation.isPending
              ? "Joining..."
              : "Join game";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-foreground">
        Loading game...
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center text-foreground">
        Game not found.
      </div>
    );
  }

  const slotsRemaining = availableSlots.length;

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="max-w-5xl mx-auto grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="space-y-4">
          <div className="rounded-xl border border-border bg-card/90 p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {game.title}
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
              {game.description}
            </p>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="space-y-1">
                <dt className="font-semibold text-secondary-foreground">
                  Schedule
                </dt>
                <dd>
                  {new Date(game.dateTime).toLocaleString()}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="font-semibold text-secondary-foreground">Price</dt>
                <dd>PHP {game.price.toFixed(2)} / player</dd>
              </div>
              <div className="space-y-1">
                <dt className="font-semibold text-secondary-foreground">
                  Slots
                </dt>
                <dd>
                  {game.maxPlayers - slotsRemaining} / {game.maxPlayers} (
                  {slotsRemaining} left)
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-border bg-card/90 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-3 text-foreground">
              Current roster
            </h2>
            {roster.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No players have joined yet.
              </p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {roster.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-start justify-between gap-3 py-2"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        #{entry.queueNumber}{" "}
                        {entry.userId ? (
                          <Link
                            to="/profile/$profileId"
                            params={{ profileId: entry.userId }}
                            search={{
                              username: entry.identityProfile?.username,
                              firstName: entry.identityProfile?.firstName,
                              lastName: entry.identityProfile?.lastName,
                              barangay: entry.identityProfile?.barangay,
                              photoUrl: entry.identityProfile?.photoUrl,
                              fromGameId: game.id,
                            }}
                            className="underline-offset-2 hover:underline"
                          >
                            {entry.name}
                          </Link>
                        ) : (
                          entry.name
                        )}
                      </p>
                      {entry.notes && (
                        <p className="text-xs text-muted-foreground">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(entry.createdAt).toLocaleTimeString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card/95 p-6 shadow-sm flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Join this game
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {slotsRemaining > 0
                  ? `${slotsRemaining} slot${slotsRemaining === 1 ? "" : "s"} remaining`
                  : "No slots currently available"}
              </p>
            </div>
            {user && currentUserEntry && (
              <span className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                Joined · Slot #{currentUserEntry.queueNumber}
              </span>
            )}
          </div>

          {user && currentUserEntry ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                You are already on the roster for this game. If you can no longer attend,
                you can leave your slot.
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={leaveMutation.isPending}
                onClick={() => {
                  leaveMutation.mutate();
                }}
              >
                {leaveMutation.isPending ? "Leaving..." : "Leave game"}
              </Button>
            </div>
          ) : (
            <>
              {isFull && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  Game is full. You can still view the locked roster.
                </div>
              )}

              {!identityLoading && !user && (
                <div className="rounded-md border border-dashed border-destructive/40 bg-destructive/5 p-3 text-xs sm:text-sm text-secondary-foreground flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-semibold text-foreground">
                    Sign in to join this game.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-destructive text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      void handleSignIn();
                    }}
                  >
                    Sign in to join
                  </Button>
                </div>
              )}

              {user && !identityLoading && !profileComplete && (
                <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-xs sm:text-sm text-secondary-foreground flex flex-col gap-2">
                  <p className="font-semibold text-foreground">
                    Finish your signup to join this game.
                  </p>
                  <p className="text-[0.7rem] sm:text-xs text-muted-foreground">
                    Complete your profile picture, username, and details so staff can
                    recognize you on the roster.
                  </p>
                  <div>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        void router.navigate({
                          to: "/identity-setup",
                          search: { returnTo: `/games/${gameId}` },
                        });
                      }}
                    >
                      Open signup wizard
                    </Button>
                  </div>
                </div>
              )}

              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!user) {
                    setError("Please sign in before joining this game.");
                    return;
                  }
                  if (!profile || !profileComplete) {
                    setError("Finish your game signup before joining.");
                    void router.navigate({
                      to: "/identity-setup",
                      search: { returnTo: `/games/${gameId}` },
                    });
                    return;
                  }

                  if (selectedSlot == null) {
                    setError("Please pick an available slot before joining.");
                    return;
                  }

                  const displayName =
                    profile.username?.trim() ||
                    `${profile.firstName} ${profile.lastName}`.trim();

                  const payload: NewPlayerEntryPayload = {
                    name: displayName,
                    userId: user.uid,
                    ...(notes.trim() ? { notes: notes.trim() } : {}),
                    identityProfile: {
                      username: profile.username!,
                      firstName: profile.firstName!,
                      lastName: profile.lastName!,
                      dateOfBirth: profile.dateOfBirth!,
                      ...(profile.barangay ? { barangay: profile.barangay } : {}),
                      ...(profile.photoUrl ? { photoUrl: profile.photoUrl } : {}),
                    },
                    queueNumber: selectedSlot,
                  };

                  joinMutation.mutate(payload);
                }}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="slot-select">Choose your slot</Label>
                    <Select
                      value={selectedSlot != null ? String(selectedSlot) : ""}
                      onValueChange={(value) => {
                        setSelectedSlot(value ? Number(value) : null);
                      }}
                      disabled={selectDisabled}
                    >
                      <SelectTrigger
                        id="slot-select"
                        className="w-full bg-background text-sm text-foreground"
                      >
                        <SelectValue placeholder="Select a slot" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSlots.map((slot) => (
                          <SelectItem key={slot} value={String(slot)}>
                            Slot #{slot}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="player-notes">Notes (optional)</Label>
                    <Textarea
                      id="player-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Anything players should know"
                      disabled={notesDisabled}
                      className="text-sm"
                    />
                  </div>
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                <Button
                  type="submit"
                  disabled={joinDisabled}
                  className="w-full"
                >
                  {joinButtonLabel}
                </Button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
