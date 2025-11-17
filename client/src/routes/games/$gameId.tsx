import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import type { Game, NewPlayerEntryPayload, PlayerEntry } from "shared";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { auth } from "@/lib/firebase";
import {
  fetchGameById,
  fetchRoster,
  joinGame,
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
  const isFull =
    !!game &&
    typeof game.maxPlayers === "number" &&
    typeof game.filledSlots === "number" &&
    game.filledSlots >= game.maxPlayers;
  const joinDisabled =
    !user || !profileComplete || isFull || joinMutation.isPending;
  const joinButtonLabel = !user
    ? "Sign in to join"
    : !profileComplete
      ? "Finish signup to join"
      : isFull
        ? "Game is full"
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

  const slotsRemaining = Math.max(game.maxPlayers - game.filledSlots, 0);

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="max-w-5xl mx-auto grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="space-y-4">
          <div className="rounded-xl border border-border bg-card/90 p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-[#000000] mb-2">
              {game.title}
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
              {game.description}
            </p>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="space-y-1">
                <dt className="font-semibold text-[#3e3636]">
                  Schedule
                </dt>
                <dd>
                  {new Date(game.dateTime).toLocaleString()}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="font-semibold text-[#3e3636]">Price</dt>
                <dd>${game.price.toFixed(2)} / player</dd>
              </div>
              <div className="space-y-1">
                <dt className="font-semibold text-[#3e3636]">
                  Slots
                </dt>
                <dd>
                  {game.filledSlots} / {game.maxPlayers} (
                  {slotsRemaining} left)
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-border bg-card/90 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-3 text-[#000000]">
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
                      <p className="font-medium text-[#000000]">
                        #{entry.queueNumber} {entry.name}
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

        <section className="rounded-xl border border-border bg-card/95 p-6 shadow-sm flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-[#000000]">
            Join this game
          </h2>
          {isFull && (
            <p className="text-sm font-medium text-[#d72323]">
              Game is full. You can still view the locked roster.
            </p>
          )}
          {!identityLoading && !user && (
            <div className="rounded-lg border border-dashed border-[#d72323]/40 bg-[#f5eded] p-4 text-sm text-[#3e3636]">
              <p className="mb-3 font-semibold text-[#000000]">Sign in to join this game.</p>
              <Button
                type="button"
                variant="outline"
                className="border-[#d72323] text-[#d72323] hover:bg-[#d72323]/10"
                onClick={() => {
                  void handleSignIn();
                }}
              >
                Sign in to join
              </Button>
            </div>
          )}
          {user && !identityLoading && !profileComplete && (
            <div className="rounded-lg border border-dashed border-[#d72323]/40 bg-[#f5eded] p-4 text-sm text-[#3e3636]">
              <p className="mb-2 font-semibold text-[#000000]">
                Finish your signup to join this game.
              </p>
              <p className="mb-3 text-xs text-muted-foreground">
                Complete your profile picture, username, and details so staff can
                recognize you on the roster.
              </p>
              <Button
                type="button"
                className="bg-[#d72323] hover:bg-[#b71d1d] text-[#f5eded]"
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
              };

              joinMutation.mutate(payload);
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="player-notes">Notes (optional)</Label>
              <Textarea
                id="player-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything players should know"
                disabled={joinDisabled}
                className="bg-white/80 text-sm text-[#1f1b1b]"
              />
            </div>
            {error && (
              <p className="text-sm text-[#d72323]">{error}</p>
            )}
            <Button
              type="submit"
              disabled={joinDisabled}
              className="w-full bg-[#d72323] hover:bg-[#b71d1d] text-[#f5eded]"
            >
              {joinButtonLabel}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
