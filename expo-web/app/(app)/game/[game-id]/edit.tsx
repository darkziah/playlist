import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, View, Platform } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useForm } from "@tanstack/react-form";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import {
  fetchGameById,
  fetchRoster,
  watchGame,
  watchRoster,
  updateGame,
  updateRosterOrder,
  deleteRosterEntry,
  updateRosterPayment,
} from "@/lib/games";
import type { Game, PaymentMethod, PaymentStatus, PlayerEntry, GameStatus } from "shared";
import { useGameMasterAuth, loginGameMaster } from "@/lib/gameMasterAuth";
import Loading from "@/components/loading";

type GameFormValues = {
  title: string;
  description: string;
  dateTime: string;
  maxPlayers: string;
  price: string;
  status: GameStatus;
  location: string;
  hours: string;
};

type GameDetailsFormProps = {
  game: Game;
  saving: boolean;
  onSave: (values: GameFormValues) => Promise<void>;
};

function mapGameToFormValues(game: Game): GameFormValues {
  return {
    title: game.title ?? "",
    description: game.description ?? "",
    dateTime: game.dateTime ?? "",
    maxPlayers: String(game.maxPlayers ?? ""),
    price: String(game.price ?? ""),
    status: game.status ?? "scheduled",
    location: game.location ?? "",
    hours: game.hours != null ? String(game.hours) : "",
  };
}

export default function GameEditScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const gameIdParam = params["game-id"];
  const gameId = typeof gameIdParam === "string" ? gameIdParam : "";

  const { isGameMaster, loading: gmLoading } = useGameMasterAuth();

  const [game, setGame] = useState<Game | null>(null);
  const [roster, setRoster] = useState<PlayerEntry[]>([]);
  const [editingRoster, setEditingRoster] = useState<PlayerEntry[]>([]);
  const [gameLoading, setGameLoading] = useState(true);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [savingGame, setSavingGame] = useState(false);
  const [savingRoster, setSavingRoster] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      setEditingRoster(entries);
      setRosterLoading(false);
    });

    const stopGame = watchGame(gameId, (next) => {
      if (!active) return;
      setGame(next);
    });
    const stopRoster = watchRoster(gameId, (entries) => {
      if (!active) return;
      setRoster(entries);
      setEditingRoster((prev) => {
        if (prev.length === 0) {
          return entries;
        }

        if (prev.length !== entries.length) {
          return entries;
        }

        const prevById = new Map<string, number>();
        for (const entry of prev) {
          prevById.set(entry.id, entry.queueNumber);
        }

        let changed = false;
        for (const entry of entries) {
          if (!prevById.has(entry.id)) {
            changed = true;
            break;
          }
          if (prevById.get(entry.id) !== entry.queueNumber) {
            changed = true;
            break;
          }
        }

        if (!changed) {
          return entries;
        }

        return prev;
      });
    });

    return () => {
      active = false;
      stopGame();
      stopRoster();
    };
  }, [gameId]);

  const isLoading = gameLoading || rosterLoading || gmLoading;

  const hasRosterChanges = useMemo(() => {
    if (editingRoster.length !== roster.length) return true;

    const originalById = new Map<string, number>();
    for (const entry of roster) {
      originalById.set(entry.id, entry.queueNumber);
    }

    for (const entry of editingRoster) {
      if (!originalById.has(entry.id)) return true;
      if (originalById.get(entry.id) !== entry.queueNumber) return true;
    }

    return false;
  }, [editingRoster, roster]);

  const handleSaveGame = async (values: GameFormValues) => {
    if (!gameId) return;
    setError(null);
    setSuccess(null);

    const maxPlayers = Number.parseInt(values.maxPlayers, 10);
    const price = Number.parseFloat(values.price);
    const hours = values.hours.trim() ? Number.parseFloat(values.hours) : NaN;

    if (!values.title.trim() || !values.dateTime.trim()) {
      setError("Title and date/time are required.");
      return;
    }
    if (!Number.isFinite(maxPlayers) || maxPlayers <= 0) {
      setError("Max players must be greater than 0.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setError("Price cannot be negative.");
      return;
    }

    const updates: Parameters<typeof updateGame>[1] = {
      title: values.title.trim(),
      description: values.description,
      dateTime: values.dateTime.trim(),
      maxPlayers,
      price,
      status: values.status,
      ...(values.location.trim() ? { location: values.location.trim() } : { location: "" }),
      ...(values.hours.trim() && Number.isFinite(hours)
        ? { hours }
        : { hours: undefined }),
    };

    setSavingGame(true);
    try {
      await updateGame(gameId, updates);
      setSuccess("Game details saved.");
    } catch (e: any) {
      setError(e?.message ?? "Unable to save game details.");
    } finally {
      setSavingGame(false);
    }
  };

  const movePlayerToSlot = (playerId: string, slot: number) => {
    setEditingRoster((prev) => {
      const moving = prev.find((e) => e.id === playerId);
      if (!moving) return prev;

      const existingAtSlot = prev.find((e) => e.queueNumber === slot);
      const previousSlot = moving.queueNumber;

      return prev.map((entry) => {
        if (entry.id === moving.id) {
          return { ...entry, queueNumber: slot };
        }
        if (existingAtSlot && entry.id === existingAtSlot.id) {
          return { ...entry, queueNumber: previousSlot };
        }
        return entry;
      });
    });
    setSelectedPlayerId(null);
  };

  const handleSlotDrop = (slot: number) => {
    if (!draggingId) return;
    movePlayerToSlot(draggingId, slot);
  };

  const handleSaveRosterOrder = async () => {
    if (!gameId || !editingRoster.length || !hasRosterChanges) return;
    setSavingRoster(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = editingRoster.map((entry) => ({
        id: entry.id,
        queueNumber: entry.queueNumber,
      }));
      await updateRosterOrder(gameId, payload);
      setSuccess("Roster order saved.");
    } catch (e: any) {
      setError(e?.message ?? "Unable to save roster order.");
    } finally {
      setSavingRoster(false);
    }
  };

  const handleDeleteEntry = async (entry: PlayerEntry) => {
    if (!gameId) return;
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        `Remove ${entry.name} from this game? This cannot be undone.`,
      );
      if (!confirmed) return;
    }

    setDeletingEntryId(entry.id);
    setError(null);
    setSuccess(null);
    try {
      await deleteRosterEntry(gameId, entry.id);
      setEditingRoster((prev) => prev.filter((player) => player.id !== entry.id));
      setRoster((prev) => prev.filter((player) => player.id !== entry.id));
      if (selectedPlayerId === entry.id) {
        setSelectedPlayerId(null);
      }
      if (draggingId === entry.id) {
        setDraggingId(null);
      }
      setSuccess("Player removed from roster.");
    } catch (e: any) {
      setError(e?.message ?? "Unable to remove player.");
    } finally {
      setDeletingEntryId(null);
    }
  };

  if (!gameId) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-4">
        <Text variant="h3" className="mb-4 text-center text-foreground">
          Game not found
        </Text>
        <Text variant="muted" className="mb-6 text-center">
          Missing game id.
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

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Loading />
      </View>
    );
  }

  if (!isGameMaster) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-4">
        <Text variant="h3" className="mb-4 text-center text-foreground">
          Game master access only
        </Text>
        <Text variant="muted" className="mb-6 text-center">
          You must be signed in as a game master to edit games and manage the roster.
        </Text>
        <Button
          variant="outline"
          onPress={() => {
            void loginGameMaster();
          }}
        >
          <Text>Sign in as game master</Text>
        </Button>
      </View>
    );
  }

  if (!game) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-4">
        <Text variant="h3" className="mb-4 text-center text-foreground">
          Game not found
        </Text>
        <Text variant="muted" className="mb-6 text-center">
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
      <Stack.Screen options={{ headerTitle: `Edit: ${game.title}` }} />
      <ScrollView className="flex-1 bg-background px-4 py-8">
        <View className="mx-auto w-full max-w-3xl gap-6">
          <View className="mb-2 gap-2">
            <Text className="text-2xl font-bold text-foreground">Edit game</Text>
            <Text variant="muted" className="text-sm">
              This page is intended for web usage. All form fields and roster controls use HTML-compatible inputs.
            </Text>
          </View>

          {error ? (
            <View className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2">
              <Text variant="small" className="text-destructive">
                {error}
              </Text>
            </View>
          ) : null}
          {success ? (
            <View className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
              <Text variant="small" className="text-emerald-500">
                {success}
              </Text>
            </View>
          ) : null}

          <View className="gap-4 rounded-2xl border border-border bg-card/90 p-4">
            <Text className="text-lg font-semibold text-foreground">Game details</Text>
            <GameDetailsForm
              game={game}
              saving={savingGame}
              onSave={handleSaveGame}
            />
          </View>

          <View className="gap-4 rounded-2xl border border-border bg-card/90 p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-foreground">
                Roster (draggable)
              </Text>
              <Button
                variant="outline"
                disabled={!hasRosterChanges || savingRoster}
                onPress={() => {
                  void handleSaveRosterOrder();
                }}
              >
                <Text>{savingRoster ? "Saving..." : "Save order"}</Text>
              </Button>
            </View>

            {game.maxPlayers <= 0 ? (
              <Text variant="muted">Set max players to manage the roster.</Text>
            ) : (
              <View className="gap-2">
                {Array.from({ length: game.maxPlayers }, (_, i) => {
                  const slot = i + 1;
                  const entry = editingRoster.find(
                    (player) => player.queueNumber === slot,
                  );
                  const isSelected = !!entry && entry.id === selectedPlayerId;

                  return (
                    <div
                      key={slot}
                      draggable={Platform.OS === "web" && !!entry}
                      onDragStart={() => {
                        if (entry) {
                          setDraggingId(entry.id);
                        }
                      }}
                      onDragOver={(event) => {
                        if (Platform.OS === "web") {
                          event.preventDefault();
                        }
                      }}
                      onDrop={() => handleSlotDrop(slot)}
                      onClick={() => {
                        if (entry) {
                          if (selectedPlayerId && selectedPlayerId !== entry.id) {
                            movePlayerToSlot(selectedPlayerId, slot);
                          } else {
                            setSelectedPlayerId((prev) =>
                              prev === entry.id ? null : entry.id,
                            );
                          }
                        } else if (selectedPlayerId) {
                          movePlayerToSlot(selectedPlayerId, slot);
                        }
                      }}
                      className={`flex flex-row items-center justify-between rounded-xl border bg-background px-4 py-3 shadow-sm shadow-black/5 ${isSelected ? "border-destructive" : "border-border"
                        }`}
                    >
                      <View className="flex-row items-center gap-3 flex-1">
                        <View className="h-8 w-8 items-center justify-center rounded-full border border-border bg-card">
                          <Text className="text-sm font-semibold text-foreground">
                            {slot}
                          </Text>
                        </View>
                        <View className="gap-1 flex-1">
                          {entry ? (
                            <>
                              <Text className="font-medium text-foreground">
                                {entry.name}
                              </Text>
                              {entry.notes ? (
                                <Text
                                  variant="small"
                                  className="text-muted-foreground"
                                >
                                  {entry.notes}
                                </Text>
                              ) : null}
                            </>
                          ) : (
                            <Text
                              variant="small"
                              className="text-muted-foreground"
                            >
                              Empty slot
                            </Text>
                          )}
                        </View>
                      </View>
                      <View className="flex-row items-center gap-2">
                        {entry ? (
                          <>
                            <select
                              value={(() => {
                                if (entry.paymentStatus !== "paid") {
                                  return "unpaid";
                                }
                                if (entry.paymentMethod === "cash") {
                                  return "paid-cash";
                                }
                                if (entry.paymentMethod === "gcash") {
                                  return "paid-gcash";
                                }
                                return "unpaid";
                              })()}
                              onChange={(event) => {
                                const value = event.target.value as
                                  | "unpaid"
                                  | "paid-cash"
                                  | "paid-gcash";

                                let nextStatus: PaymentStatus;
                                let nextMethod: PaymentMethod | undefined;

                                if (value === "unpaid") {
                                  nextStatus = "unpaid";
                                  nextMethod = undefined;
                                } else {
                                  nextStatus = "paid";
                                  nextMethod = value === "paid-cash" ? "cash" : "gcash";
                                }

                                setEditingRoster((prev) =>
                                  prev.map((player) =>
                                    player.id === entry.id
                                      ? {
                                        ...player,
                                        paymentStatus: nextStatus,
                                        paymentMethod: nextMethod,
                                      }
                                      : player,
                                  ),
                                );

                                void updateRosterPayment(game.id, entry.id, {
                                  paymentStatus: nextStatus,
                                  paymentMethod: nextMethod,
                                });
                              }}
                              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                            >
                              <option value="unpaid">Unpaid</option>
                              <option value="paid-cash">Paid (Cash)</option>
                              <option value="paid-gcash">Paid (GCash)</option>
                            </select>
                            <Button
                              variant="destructive"
                              disabled={deletingEntryId === entry.id}
                              onPress={() => {
                                void handleDeleteEntry(entry);
                              }}
                            >
                              <Text>
                                {deletingEntryId === entry.id
                                  ? "Removing..."
                                  : "Remove"}
                              </Text>
                            </Button>
                          </>
                        ) : null}
                      </View>
                    </div>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </>
  );
}

function GameDetailsForm({
  game,
  saving,
  onSave,
}: GameDetailsFormProps) {
  const form = useForm({
    defaultValues: mapGameToFormValues(game),
  });

  const handleSubmit = async () => {
    const values = form.state.values as GameFormValues;
    await onSave(values);
  };

  return (
    <>
      <form.Field
        name="title"
        children={(field) => (
          <View className="gap-2">
            <Text variant="small" className="text-muted-foreground">
              Title
            </Text>
            <input
              type="text"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm shadow-black/5"
              disabled={saving}
            />
          </View>
        )}
      />

      <form.Field
        name="description"
        children={(field) => (
          <View className="gap-2">
            <Text variant="small" className="text-muted-foreground">
              Description
            </Text>
            <textarea
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm shadow-black/5"
              disabled={saving}
            />
          </View>
        )}
      />

      <form.Field
        name="dateTime"
        children={(field) => (
          <View className="gap-2">
            <Text variant="small" className="text-muted-foreground">
              Date & time
            </Text>
            <input
              type="datetime-local"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm shadow-black/5"
              disabled={saving}
            />
          </View>
        )}
      />

      <View className="flex-row gap-4 web:flex-row">
        <form.Field
          name="maxPlayers"
          children={(field) => (
            <View className="flex-1 gap-2">
              <Text variant="small" className="text-muted-foreground">
                Max players
              </Text>
              <input
                type="number"
                min={1}
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm shadow-black/5"
                disabled={saving}
              />
            </View>
          )}
        />
        <form.Field
          name="price"
          children={(field) => (
            <View className="flex-1 gap-2">
              <Text variant="small" className="text-muted-foreground">
                Price (PHP)
              </Text>
              <input
                type="number"
                min={0}
                step={0.01}
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm shadow-black/5"
                disabled={saving}
              />
            </View>
          )}
        />
      </View>

      <View className="flex-row gap-4 web:flex-row">
        <form.Field
          name="location"
          children={(field) => (
            <View className="flex-1 gap-2">
              <Text variant="small" className="text-muted-foreground">
                Location
              </Text>
              <input
                type="text"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm shadow-black/5"
                disabled={saving}
              />
            </View>
          )}
        />
        <form.Field
          name="hours"
          children={(field) => (
            <View className="flex-1 gap-2">
              <Text variant="small" className="text-muted-foreground">
                Duration (hours)
              </Text>
              <input
                type="number"
                min={0}
                step={0.5}
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm shadow-black/5"
                disabled={saving}
              />
            </View>
          )}
        />
      </View>

      <form.Field
        name="status"
        children={(field) => (
          <View className="gap-2">
            <Text variant="small" className="text-muted-foreground">
              Status
            </Text>
            <select
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value as GameStatus)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm shadow-black/5"
              disabled={saving}
            >
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </View>
        )}
      />

      <View className="mt-2 flex-row justify-end gap-2">
        <Button
          variant="outline"
          onPress={() => {
            form.reset(mapGameToFormValues(game));
          }}
          disabled={saving}
        >
          <Text>Reset</Text>
        </Button>
        <Button
          variant="default"
          disabled={saving}
          onPress={() => {
            void handleSubmit();
          }}
        >
          <Text>{saving ? "Saving..." : "Save game"}</Text>
        </Button>
      </View>
    </>
  );
}
