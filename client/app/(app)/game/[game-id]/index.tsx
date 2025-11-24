import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { Label } from "@/components/ui/label";
import { auth } from "@/lib/firebase";
import {
  fetchGameById,
  fetchRoster,
  joinGame,
  leaveGame,
  watchGame,
  watchRoster,
} from "@/lib/games";
import { useActiveMatch, useMatchHistory } from '@/lib/match-state';
import { useGameMasterAuth } from "@/lib/gameMasterAuth";
import { usePlayerIdentityProfile } from "@/hooks/usePlayerIdentityProfile";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useLocalSearchParams, useRouter } from "expo-router";
import Head from "expo-router/head";

import * as Linking from "expo-linking";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircleIcon,
  PlusCircleIcon,
  MapPinIcon,
  CalendarIcon,
  ClockIcon,
  Edit2Icon,
  TrashIcon,
  XCircleIcon,
  MoreVerticalIcon,
  EditIcon,
  ClipboardListIcon,
} from "lucide-react-native";
import { ActivityIndicator, Platform, Pressable, ScrollView, Share, TextInput, View } from "react-native";
import type { Game, NewPlayerEntryPayload, PlayerEntry } from "shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, type Option } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Stack } from "expo-router";
import { formatGameDate, formatGameTime } from "@/lib/time";
import { LucideShare, Share2 } from "lucide-react-native";

export default function GameDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const gameIdParam = params["game-id"];
  const gameId = typeof gameIdParam === "string" ? gameIdParam : "";

  const {
    user,
    profile,
    loading: identityLoading,
    profileComplete,
  } = usePlayerIdentityProfile();

  const { isGameMaster, loading: gmLoading, role } = useGameMasterAuth();
  const { activeMatch } = useActiveMatch(gameId);
  const { matches } = useMatchHistory(gameId);

  const latestMatch = matches.length > 0 ? matches[matches.length - 1] : null;

  const [game, setGame] = useState<Game | null>(null);
  const [roster, setRoster] = useState<PlayerEntry[]>([]);
  const [gameLoading, setGameLoading] = useState(true);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [joinPending, setJoinPending] = useState(false);
  const [leavePending, setLeavePending] = useState(false);

  useEffect(() => {
    if (!gameId) {
      setGame(null);
      setRoster([]);
      setGameLoading(false);
      setRosterLoading(false);
      return;
    }

    let active = true;
    setGameLoading(true);
    setRosterLoading(true);

    void fetchGameById(gameId).then((result) => {
      if (!active) return;
      setGame(result);
      setGameLoading(false);
    });

    void fetchRoster(gameId).then((entries) => {
      if (!active) return;
      setRoster(entries);
      setRosterLoading(false);
    });

    const stopGame = watchGame(gameId, (next) => {
      if (!active) return;
      setGame(next);
    });
    const stopRoster = watchRoster(gameId, (entries) => {
      if (!active) return;
      setRoster(entries);
    });

    return () => {
      active = false;
      stopGame();
      stopRoster();
    };
  }, [gameId]);

  const isLoading = gameLoading || rosterLoading;

  const occupiedSlots = useMemo(() => {
    if (!game || roster.length === 0) return new Set<number>();
    return new Set(roster.map((entry) => entry.queueNumber));
  }, [game, roster]);

  const maxPlayers = game?.maxPlayers ?? 0;
  const allSlots = maxPlayers > 0
    ? Array.from({ length: maxPlayers }, (_, i) => i + 1)
    : [];
  const availableSlots = allSlots.filter((slot) => !occupiedSlots.has(slot));
  const paidPlayersCount = roster.filter((entry) => entry.paymentStatus === "paid").length;

  const currentUserEntry = user
    ? roster.find((entry) => entry.userId === user.uid)
    : undefined;
  const isJoined = !!currentUserEntry;
  const isFull = !!game && availableSlots.length === 0;

  const canJoinBase =
    !!user &&
    profileComplete &&
    !isFull &&
    !isJoined &&
    !!game;

  const joinDisabled =
    !canJoinBase || joinPending || selectedSlot == null || isLoading;
  const notesDisabled = !canJoinBase || joinPending || isLoading;

  const slotsRemaining = availableSlots.length;

  const isLeaveLocked = (() => {
    if (!game) return false;
    const gameStart = new Date(game.dateTime);
    const now = new Date();
    const msUntilGame = gameStart.getTime() - now.getTime();
    return Number.isFinite(msUntilGame) && msUntilGame <= 12 * 60 * 60 * 1000;
  })();

  const handleSignIn = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      setError(e?.message ?? "Unable to sign in. Please try again.");
    }
  };

  const handleShare = async () => {
    if (!game) return;
    setError(null);
    try {
      const gameUrl = Linking.createURL(`/game/${game.id}`);
      await Share.share({
        message: `Check out this game: ${game.title}`,
        title: game.title,
        url: gameUrl,
      }, {
        dialogTitle: game.title
      });
    } catch (e: any) {
      setError(e?.message ?? "Unable to share game.");
    }
  };

  const handleLeave = async () => {
    if (!user) {
      setError("You must be signed in to leave this game.");
      return;
    }
    if (isLeaveLocked) {
      setError("You can no longer leave this game less than 12 hours before it starts.");
      return;
    }
    setError(null);
    setLeavePending(true);
    try {
      await leaveGame(gameId, user.uid);
      setSelectedSlot(null);
    } catch (e: any) {
      setError(e?.message ?? "Unable to leave game");
    } finally {
      setLeavePending(false);
    }
  };

  const handleJoin = async () => {
    if (!user) {
      setError("Please sign in before joining this game.");
      return;
    }
    if (!profile || !profileComplete) {
      setError("Finish your game signup before joining.");
      return;
    }
    if (selectedSlot == null) {
      setError("Please pick an available slot before joining.");
      return;
    }
    if (!game) {
      setError("Game is not loaded yet.");
      return;
    }

    const displayName =
      profile.username?.trim() ||
      `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim();

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

    setError(null);
    setJoinPending(true);
    try {
      await joinGame(gameId, payload);
      setNotes("");
      setSelectedSlot(null);
    } catch (e: any) {
      setError(e?.message ?? "Unable to join game");
    } finally {
      setJoinPending(false);
    }
  };

  const handleFillRoster = async () => {
    if (!game || !isGameMaster) return;

    // Confirm before filling
    if (Platform.OS === 'web') {
      if (!window.confirm("Are you sure you want to fill the roster with dummy players? This is for testing only.")) {
        return;
      }
    }

    setGameLoading(true);
    try {
      // Fill up to 15 players or maxPlayers, whichever is smaller, to avoid too many writes if max is huge
      // But user said "fill up", so let's fill available slots.
      // Limit to 12 for a full basketball game roster (5v5 + subs) if max is large, 
      // but usually maxPlayers is set to something like 15-20.
      // Let's just fill all available slots.

      const slotsToFill = availableSlots;

      for (const slot of slotsToFill) {
        const dummyId = `dummy_${Date.now()}_${slot}`;
        const payload: NewPlayerEntryPayload = {
          name: `Player ${slot}`,
          userId: dummyId,
          queueNumber: slot,
          identityProfile: {
            username: `player${slot}`,
            firstName: "Test",
            lastName: `Player ${slot}`,
            dateOfBirth: "2000-01-01",
          }
        };
        await joinGame(gameId, payload);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to fill roster");
    } finally {
      setGameLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  if (!game) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-4">
        <Text
          variant="h3"
          className="mb-4 text-center text-foreground"
        >
          Game not found
        </Text>
        <Text
          variant="muted"
          className="mb-6 text-center"
        >
          The requested game could not be found.
        </Text>
        <Button
          variant="outline"
          onPress={() => {
            router.back();
          }}
        >
          <Text>Go back</Text>
        </Button>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{
        headerTitle: game.title, headerRight: () => <Button variant="ghost" className="mr-2" onPress={handleShare}>
          <LucideShare />
        </Button>
      }} />
      <Head>
        <meta property="og:title" content={game.title} />
        <meta property="og:description" content={game.description || `Join ${game.title} on Playlist`} />
        <meta property="og:url" content={Linking.createURL(`/game/${game.id}`)} />
      </Head>
      <ScrollView className="flex-1 bg-background px-4 py-8">
        <View className="mx-auto w-full max-w-3xl gap-6">
          <View className="mb-2 rounded-2xl border border-border bg-card px-4 py-4 shadow-sm shadow-black/5">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Game overview
                </Text>
                <Text className="mt-1 text-2xl font-bold text-foreground">
                  {game.title}
                </Text>
                {game.description ? (
                  <Text variant="muted" className="mt-1">
                    {game.description}
                  </Text>
                ) : null}
              </View>
              <View>

                <View className="mt-3 flex justify-end gap-2">
                  {!gmLoading && isGameMaster ? (
                    <>
                      {role === 'super_admin' || role === 'admin' && <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onPress={() => {
                          router.push({
                            pathname: "/game/[game-id]/edit",
                            params: { "game-id": gameId },
                          });
                        }}
                      >
                        <Icon as={EditIcon} size={18} />
                      </Button>}

                    </>
                  ) : null}
                </View>


              </View>
            </View>
            <View className="mt-4 border-t border-border/60 pt-4 gap-3">
              <View className="flex-row gap-4">
                <View className="flex-1 gap-1">
                  <Text variant="small" className="text-muted-foreground">
                    Schedule
                  </Text>
                  <Text className="text-sm text-foreground">
                    {new Date(game.dateTime).toLocaleDateString()}
                  </Text>
                </View>
                <View className="flex-1 gap-1">
                  <Text variant="small" className="text-muted-foreground">
                    Time
                  </Text>
                  <Text className="text-sm text-foreground">
                    {formatGameTime(game.dateTime, Number(game.hours))}
                  </Text>
                </View>
              </View>
              <View className="flex-row gap-4">
                <View className="flex-1 gap-1">
                  <Text variant="small" className="text-muted-foreground">
                    Duration
                  </Text>
                  <Text className="text-sm text-foreground">
                    {game.hours} {game.hours === 1 ? "hour" : "hours"}
                  </Text>
                </View>
                <View className="flex-1 gap-1">
                  <Text variant="small" className="text-muted-foreground">
                    Location
                  </Text>
                  <Text className="text-sm text-foreground">
                    {game?.location}
                  </Text>
                </View>
              </View>
              <View className="flex-row gap-4">
                <View className="flex-1 gap-1">
                  <Text variant="small" className="text-muted-foreground">
                    Price
                  </Text>
                  <Text className="text-sm text-foreground">
                    PHP {game.price.toFixed(2)} / player
                  </Text>
                </View>
                <View className="flex-1 gap-1">
                  <Text variant="small" className="text-muted-foreground">
                    Slots
                  </Text>
                  <Text className="text-sm text-foreground">
                    {game.maxPlayers - slotsRemaining} / {game.maxPlayers} ({slotsRemaining} left)
                  </Text>
                  <Text variant="small" className="text-xs text-muted-foreground">
                    Paid: {paidPlayersCount}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View>
            {activeMatch && (
              <Pressable
                onPress={() => {
                  if (isGameMaster) {
                    router.push({
                      pathname: '/game/[game-id]/record-stats',
                      params: { 'game-id': gameId },
                    });
                  }
                }}
                disabled={!isGameMaster}
              >
                <View className="mb-2 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-4">
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                        Live Match
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        Match #{activeMatch.matchNumber} • {activeMatch.timer.remainingSeconds > 0 ? Math.floor(activeMatch.timer.remainingSeconds / 60) + ':' + (activeMatch.timer.remainingSeconds % 60).toString().padStart(2, '0') : 'Ended'}
                      </Text>
                    </View>
                    {isGameMaster && (
                      <View className="rounded-full bg-primary px-2 py-1">
                        <Text className="text-[10px] font-bold text-primary-foreground">
                          Manage
                        </Text>
                      </View>
                    )}
                  </View>

                  <View className="mt-4 flex-row items-center justify-between px-4">
                    <View className="items-center">
                      <Text className="text-3xl font-bold text-foreground">
                        {activeMatch.teamA.score}
                      </Text>
                      <Text className="text-xs font-medium text-muted-foreground">
                        Team A
                      </Text>
                    </View>
                    <Text className="text-xl font-bold text-muted-foreground/50">-</Text>
                    <View className="items-center">
                      <Text className="text-3xl font-bold text-foreground">
                        {activeMatch.teamB.score}
                      </Text>
                      <Text className="text-xs font-medium text-muted-foreground">
                        Team B
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            )}
          </View>

          <View>
            {!activeMatch && latestMatch && (
              <View className="mb-2 rounded-2xl border border-border bg-card px-4 py-4 shadow-sm shadow-black/5">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Latest Match
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      Match #{latestMatch.matchNumber} • Ended
                    </Text>
                  </View>
                </View>

                <View className="mt-4 flex-row items-center justify-between px-4">
                  <View className="items-center">
                    <Text className="text-3xl font-bold text-foreground">
                      {latestMatch.teamAScore}
                    </Text>
                    <Text className="text-xs font-medium text-muted-foreground">
                      Team A
                    </Text>
                  </View>
                  <Text className="text-xl font-bold text-muted-foreground/50">-</Text>
                  <View className="items-center">
                    <Text className="text-3xl font-bold text-foreground">
                      {latestMatch.teamBScore}
                    </Text>
                    <Text className="text-xs font-medium text-muted-foreground">
                      Team B
                    </Text>
                  </View>
                </View>

                {latestMatch.winner && (
                  <View className="mt-4 items-center">
                    <Text className="text-xs font-medium text-primary">
                      Team {latestMatch.winner} Won
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <View className="mb-6">
            {isGameMaster && <Button
              className="text-white dark:text-primary-foreground"
              onPress={() => {
                router.push({
                  pathname: "/game/[game-id]/record-stats",
                  params: { "game-id": gameId },
                });
              }}
            >
              Live Scoring
            </Button>}

            {isGameMaster && (
              <Button
                variant="outline"
                className="mt-2"
                onPress={handleFillRoster}
              >
                Simulate: Fill Roster (Test)
              </Button>
            )}
          </View>

          <View className="mb-6 gap-3">
            <Text className="text-lg font-semibold text-foreground">
              Current roster
            </Text>
            {roster.length === 0 ? (
              <Text variant="muted">
                No players have joined yet.
              </Text>
            ) : (
              <View className="gap-2">
                {roster.map((entry) => (
                  <View
                    key={entry.id}
                    className="flex-row items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <View className="flex-row items-center gap-3 flex-1">
                      <Avatar
                        alt={`@${entry.name}`}
                        className="border-background web:border-0 web:ring-2 web:ring-background border-2">
                        <AvatarImage source={{ uri: entry.identityProfile?.photoUrl }} />
                        <AvatarFallback>
                          <Text>{entry.name.toUpperCase().slice(0, 1)}</Text>
                        </AvatarFallback>
                      </Avatar>
                      <View className="gap-1 flex-1">
                        <Text className="font-medium text-foreground">
                          #{entry.queueNumber}{" "}
                          {entry.userId ? (
                            <Text
                              className="underline"
                              onPress={() => {
                                router.push({
                                  pathname: "/profile/[profile-id]",
                                  params: {
                                    "profile-id": entry.userId,
                                  },
                                });
                              }}
                            >
                              {entry.name}
                            </Text>
                          ) : (
                            <Text>{entry.name}</Text>
                          )}
                        </Text>
                        {entry.notes ? (
                          <Text variant="small" className="text-muted-foreground">
                            {entry.notes}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <View className="items-end gap-1">
                      <Text variant="small" className="text-muted-foreground">
                        Joined {new Date(entry.createdAt).toLocaleTimeString()}
                      </Text>
                      <Text variant="small" className="text-muted-foreground">
                        {entry.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                        {entry.paymentMethod
                          ? ` via ${entry.paymentMethod === "cash" ? "Cash" : "GCash"
                          }`
                          : ""}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {game && game.status === "scheduled" && <View className="mt-4 gap-3">
            {!(user && currentUserEntry) && <Text className="text-lg font-semibold text-foreground">
              Join this game
            </Text>}
            {isFull && (
              <Text variant="small" className="text-destructive">
                Game is full. You can still view the roster.
              </Text>
            )}

            {!identityLoading && !user && (
              <View className="gap-2">
                <Text variant="small" className="text-foreground">
                  Sign in to join this game.
                </Text>
                <Button
                  variant="outline"
                  onPress={() => {
                    void handleSignIn();
                  }}
                >
                  <Text>Sign in with Google</Text>
                </Button>
              </View>
            )}

            {user && !identityLoading && !profileComplete && (
              <Text variant="small" className="text-destructive">
                Finish your game signup in your profile before joining.
              </Text>
            )}

            {user && currentUserEntry ? (
              <View className="mt-2 gap-2">
                <Text variant="small" className="text-muted-foreground">
                  {isLeaveLocked
                    ? "You are already on the roster. You can no longer leave less than 12 hours before the game starts."
                    : "You are already on the roster. If you can no longer attend, you can leave your slot."}
                </Text>
                <Button
                  variant="outline"
                  disabled={leavePending || isLeaveLocked}
                  onPress={() => {
                    void handleLeave();
                  }}
                >
                  <Text>
                    {isLeaveLocked
                      ? "Cannot leave within 12 hours of game"
                      : leavePending
                        ? "Leaving..."
                        : "Leave game"}
                  </Text>
                </Button>
              </View>
            ) : (
              <View className="mt-3 gap-3">
                <View className="flex-row items-center gap-2">
                  <Text variant="small" className="w-32 text-muted-foreground">
                    Choose slot:
                  </Text>
                  {Platform.OS === "web" ? (
                    <View className="flex-1">
                      {/* Web-only HTML select for better support on mobile browsers like Safari */}
                      <select
                        className="h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm shadow-black/5 disabled:cursor-not-allowed"
                        value={selectedSlot ?? ""}
                        disabled={!canJoinBase || joinPending || isLoading || allSlots.length === 0}
                        onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
                          const value = event.target.value;
                          if (!value) {
                            setSelectedSlot(null);
                            return;
                          }
                          const numeric = Number(value);
                          if (!Number.isNaN(numeric)) {
                            setSelectedSlot(numeric);
                          }
                        }}
                      >
                        <option value="" disabled>
                          Select a slot
                        </option>
                        {allSlots.map((slot) => {
                          const occupied = occupiedSlots.has(slot);
                          return (
                            <option key={slot} value={slot} disabled={occupied}>
                              {`Slot ${slot}${occupied ? " (taken)" : ""}`}
                            </option>
                          );
                        })}
                      </select>
                    </View>
                  ) : (
                    <Select
                      onValueChange={(option?: Option) => {
                        if (!option) {
                          setSelectedSlot(null);
                          return;
                        }
                        const numeric = Number(option.value);
                        if (!Number.isNaN(numeric)) {
                          setSelectedSlot(numeric);
                        }
                      }}
                      disabled={!canJoinBase || joinPending || isLoading || allSlots.length === 0}
                      className="flex-1 w-full text-sm text-foreground"
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a slot" />
                      </SelectTrigger>
                      <SelectContent>
                        {allSlots.map((slot) => {
                          const occupied = occupiedSlots.has(slot);
                          return (
                            <SelectItem
                              key={slot}
                              label={`Slot ${slot}${occupied ? " (taken)" : ""}`}
                              value={String(slot)}
                              disabled={occupied}
                            />
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}
                </View>
                <View className="flex-row items-start gap-2">
                  <Text variant="small" className="w-32 text-muted-foreground mt-2">
                    Notes:
                  </Text>
                  <TextInput
                    className="flex-1 min-h-[80px] border border-border bg-card px-3 py-2 text-sm text-foreground"
                    multiline
                    editable={!notesDisabled}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Anything players should know"
                    placeholderTextColor="rgba(148, 163, 184, 1)"
                  />
                </View>
                {error ? (
                  <Text variant="small" className="text-destructive">
                    {error}
                  </Text>
                ) : null}
                <Button
                  variant="destructive"
                  disabled={joinDisabled}
                  onPress={() => {
                    void handleJoin();
                  }}
                >
                  <Text>{joinPending ? "Joining..." : "Join game"}</Text>
                </Button>
              </View>
            )}
          </View>
          }
        </View>
      </ScrollView>
    </>
  );
}
