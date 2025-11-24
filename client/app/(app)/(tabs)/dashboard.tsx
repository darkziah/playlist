import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Stack, useRouter } from 'expo-router';
import { useForm } from '@tanstack/react-form';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Platform, ScrollView, TextInput, View } from 'react-native';
import type { NewGamePayload } from 'shared';

import {
  createGame,
} from '@/lib/games';
import {
  promoteToGameMaster,
  loginGameMaster,
  logoutGameMaster,
  useGameMasterAuth,
  type GameMasterRole,
} from '@/lib/gameMasterAuth';

const SCREEN_OPTIONS = {
  title: 'Dashboard',
  headerTransparent: false,
};

type DateTimeInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  editable: boolean;
};

function DateTimeInputField({ value, onChangeText, editable }: DateTimeInputProps) {
  return (
    <input
      type="datetime-local"
      value={value}
      onChange={(event) => onChangeText(event.target.value)}
      className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground w-full"
      disabled={!editable}
    />
  );

  return (
    <TextInput
      className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
      value={value}
      onChangeText={onChangeText}
      placeholder="YYYY-MM-DDTHH:mm"
      placeholderTextColor="rgba(148, 163, 184, 1)"
      editable={editable}
    />
  );
}

export default function Screen() {
  const { user, isGameMaster, role, loading } = useGameMasterAuth();
  const router = useRouter();

  const form = useForm({
    defaultValues: {
      title: '',
      description: '',
      dateTime: (() => {
        const d = new Date();
        d.setHours(18, 0, 0, 0);
        const pad = (n: number) => String(n).padStart(2, '0');
        const year = d.getFullYear();
        const month = pad(d.getMonth() + 1);
        const day = pad(d.getDate());
        const hours = pad(d.getHours());
        const minutes = pad(d.getMinutes());
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      })(),
      maxPlayers: '30',
      price: '30',
      location: '',
      hours: '2',
      status: 'scheduled',
    },
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [createPending, setCreatePending] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const [promoteUid, setPromoteUid] = useState('');
  const [promoteRole, setPromoteRole] = useState<GameMasterRole>('scorer');
  const [promoteError, setPromoteError] = useState<string | null>(null);
  const [promoteSuccess, setPromoteSuccess] = useState<string | null>(null);
  const [promotePending, setPromotePending] = useState(false);

  const handleCreateGame = async () => {
    const values = form.state.values as {
      title: string;
      description: string;
      dateTime: string;
      maxPlayers: string;
      price: string;
      location: string;
      hours: string;
      status: NewGamePayload['status'];
    };
    const {
      title,
      description,
      dateTime,
      maxPlayers,
      price,
      location,
      hours,
      status,
    } = values;

    setFormError(null);
    setCreateSuccess(null);

    if (!isGameMaster) {
      setFormError('You must be a game master to schedule games.');
      return;
    }
    if (!title.trim() || !dateTime) {
      setFormError('Title and date/time are required.');
      return;
    }

    const maxPlayersNumber = Number.parseInt(maxPlayers, 10);
    const priceNumber = Number.parseFloat(price);
    if (!Number.isFinite(maxPlayersNumber) || maxPlayersNumber <= 0) {
      setFormError('Max players must be greater than 0.');
      return;
    }
    if (!Number.isFinite(priceNumber) || priceNumber < 0) {
      setFormError('Price cannot be negative.');
      return;
    }

    const baseDescription = description.trim();
    const locationLine = location.trim()
      ? `Location: ${location.trim()}`
      : '';
    const hoursNumber = hours.trim() ? Number.parseFloat(hours) : 0;
    const hoursLine = hoursNumber > 0
      ? `Duration: ${hoursNumber} hour${hoursNumber === 1 ? '' : 's'}`
      : '';
    const composedDescription = [
      baseDescription,
      locationLine,
      hoursLine,
    ]
      .filter(Boolean)
      .join('\n');

    const payload: NewGamePayload = {
      title: title.trim(),
      description: composedDescription,
      dateTime,
      maxPlayers: maxPlayersNumber,
      price: priceNumber,
      status,
      location: location.trim(),
      hours: hoursNumber,
    };

    setCreatePending(true);
    try {
      await createGame(payload);
      form.reset();
      setCreateSuccess('Game created successfully.');
    } catch (e: any) {
      setCreateSuccess(null);
      setFormError(
        e?.message ?? 'Unable to create game. Please check your input.',
      );
    } finally {
      setCreatePending(false);
    }
  };

  const handlePromoteUser = async () => {
    if (!promoteUid.trim()) return;
    setPromotePending(true);
    setPromoteError(null);
    setPromoteSuccess(null);
    try {
      await promoteToGameMaster(promoteUid.trim(), promoteRole);
      setPromoteSuccess('User promoted successfully.');
      setPromoteUid('');
    } catch (e: any) {
      setPromoteError(e?.message ?? 'Unable to promote user.');
    } finally {
      setPromotePending(false);
    }
  };

  let body: ReactNode;
  if (loading) {
    body = (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
        <Text variant="small" className="mt-2 text-muted-foreground">
          Checking access
        </Text>
      </View>
    );
  } else if (!isGameMaster) {
    body = (
      <View className="flex-1 items-center justify-center px-4">
        <View className="w-full max-w-xl gap-4 rounded-2xl border border-border bg-card/90 p-6">
          <Text className="text-2xl font-bold text-foreground">
            Game master access required
          </Text>
          <Text variant="small" className="text-muted-foreground">
            Sign in with your game master account to manage schedules and invites.
          </Text>
          <Button
            className="mt-2 self-start"
            onPress={() => {
              void loginGameMaster({ redirectToDashboard: true });
            }}
          >
            <Text>Sign in as game master</Text>
          </Button>
        </View>
      </View>
    );
  } else {
    body = (
      <ScrollView className="flex-1">
        <View className="mx-auto w-full max-w-5xl gap-8">
          <View className="mt-2 flex flex-row items-center justify-between gap-4">
            <View className="gap-1">
              <Text variant="small" className="uppercase tracking-[0.2em] text-destructive">
                Game master dashboard
              </Text>
              <Text className="text-2xl font-black text-foreground">
                Schedule and manage games
              </Text>
            </View>
            <View className="items-end gap-2">
              <Text variant="small" className="text-muted-foreground">
                {user?.email ?? 'Signed in'}
              </Text>
              <Button
                variant="outline"
                onPress={() => {
                  void logoutGameMaster();
                }}
              >
                <Text variant="small">Sign out</Text>
              </Button>
            </View>
          </View>

        </View>

        {
          (role === 'admin' || role === 'super_admin') && (
            <View className="mt-6 flex flex-col gap-8 lg:flex-row">
              <View className="flex-1 gap-4 rounded-2xl border border-border bg-card/95 p-5">
                <Text variant="small" className="uppercase tracking-[0.2em] text-destructive">
                  New game
                </Text>
                <Text className="text-lg font-semibold text-foreground">
                  Create upcoming game
                </Text>
                <Text variant="small" className="text-muted-foreground">
                  Publish a new session with schedule, price, and player limits.
                </Text>
                <View className="mt-4 gap-3">
                  <form.Field
                    name="title"
                    children={(field) => (
                      <View className="gap-1">
                        <Text variant="small">Title</Text>
                        <TextInput
                          className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                          value={field.state.value}
                          onChangeText={field.handleChange}
                          placeholder="e.g. Friday Night Match"
                          placeholderTextColor="rgba(148, 163, 184, 1)"
                          editable={!createPending}
                        />
                      </View>
                    )}
                  />
                  <form.Field
                    name="description"
                    children={(field) => (
                      <View className="gap-1">
                        <Text variant="small">Description</Text>
                        <TextInput
                          className="min-h-[80px] rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                          multiline
                          value={field.state.value}
                          onChangeText={field.handleChange}
                          placeholder="Share format, rules, or anything players should know"
                          placeholderTextColor="rgba(148, 163, 184, 1)"
                          editable={!createPending}
                        />
                      </View>
                    )}
                  />
                  <View className="flex-row flex-wrap gap-3">
                    <View className="flex-1 min-w-[220px]">
                      <form.Field
                        name="dateTime"
                        children={(field) => (
                          <View className="gap-1">
                            <Text variant="small">Date & time</Text>
                            <DateTimeInputField
                              value={field.state.value}
                              onChangeText={field.handleChange}
                              editable={!createPending}
                            />
                          </View>
                        )}
                      />
                    </View>
                    <View className="flex-1 min-w-[220px]">
                      <form.Field
                        name="location"
                        children={(field) => (
                          <View className="gap-1">
                            <Text variant="small">Location</Text>
                            <TextInput
                              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                              value={field.state.value}
                              onChangeText={field.handleChange}
                              placeholder="Court or venue name"
                              placeholderTextColor="rgba(148, 163, 184, 1)"
                              editable={!createPending}
                            />
                          </View>
                        )}
                      />
                    </View>
                  </View>
                  <View className="flex-row flex-wrap gap-3">
                    <View className="w-32">
                      <form.Field
                        name="maxPlayers"
                        children={(field) => (
                          <View className="gap-1">
                            <Text variant="small">Max players</Text>
                            <TextInput
                              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                              keyboardType="numeric"
                              value={field.state.value}
                              onChangeText={field.handleChange}
                              editable={!createPending}
                            />
                          </View>
                        )}
                      />
                    </View>
                    <View className="w-32">
                      <form.Field
                        name="hours"
                        children={(field) => (
                          <View className="gap-1">
                            <Text variant="small">Duration (hours)</Text>
                            <TextInput
                              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                              keyboardType="numeric"
                              value={field.state.value}
                              onChangeText={field.handleChange}
                              editable={!createPending}
                            />
                          </View>
                        )}
                      />
                    </View>
                    <View className="w-40">
                      <form.Field
                        name="price"
                        children={(field) => (
                          <View className="gap-1">
                            <Text variant="small">Price per player</Text>
                            <TextInput
                              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                              keyboardType="decimal-pad"
                              value={field.state.value}
                              onChangeText={field.handleChange}
                              editable={!createPending}
                            />
                          </View>
                        )}
                      />
                    </View>
                    <View className="w-40">
                      <form.Field
                        name="status"
                        children={(field) => (
                          <View className="gap-1">
                            <Text variant="small">Status</Text>
                            {Platform.OS === 'web' ? (
                              <select
                                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground w-full"
                                value={field.state.value}
                                onChange={(event) =>
                                  field.handleChange(
                                    event.target.value as NewGamePayload['status'],
                                  )
                                }
                                disabled={createPending}
                              >
                                <option value="draft">Draft</option>
                                <option value="scheduled">Scheduled</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            ) : (
                              <TextInput
                                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                                value={field.state.value}
                                onChangeText={field.handleChange}
                                editable={!createPending}
                                placeholder="draft | scheduled | completed | cancelled"
                                placeholderTextColor="rgba(148, 163, 184, 1)"
                              />
                            )}
                          </View>
                        )}
                      />
                    </View>
                  </View>
                  {formError ? (
                    <Text variant="small" className="text-destructive">
                      {formError}
                    </Text>
                  ) : null}
                  {createSuccess ? (
                    <Text variant="small" className="text-emerald-500">
                      {createSuccess}
                    </Text>
                  ) : null}
                  <Button
                    className="mt-2 w-full"
                    disabled={createPending}
                    onPress={() => {
                      void handleCreateGame();
                    }}
                  >
                    <Text>{createPending ? 'Creating game' : 'Create game'}</Text>
                  </Button>
                </View>

                {role === 'super_admin' && (
                  <View className="mt-6 flex-1 gap-4 rounded-2xl border border-border bg-card/95 p-5">
                    <Text variant="small" className="uppercase tracking-[0.2em] text-destructive">
                      Promote User
                    </Text>
                    <Text className="text-lg font-semibold text-foreground">
                      Add new game master
                    </Text>
                    <Text variant="small" className="text-muted-foreground">
                      Enter the User ID (UID) to promote them to a game master role.
                    </Text>
                    <View className="mt-4 gap-3">
                      <Text variant="small">User ID & Role</Text>
                      <View className="flex-row gap-2">
                        <TextInput
                          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                          value={promoteUid}
                          onChangeText={(value) => {
                            setPromoteUid(value);
                            setPromoteError(null);
                            setPromoteSuccess(null);
                          }}
                          editable={!promotePending}
                          placeholder="User UID"
                          placeholderTextColor="rgba(148, 163, 184, 1)"
                        />
                        <View className="w-32">
                          {Platform.OS === 'web' ? (
                            <select
                              className="h-full w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                              value={promoteRole}
                              onChange={(e) => setPromoteRole(e.target.value as GameMasterRole)}
                              disabled={promotePending}
                            >
                              <option value="scorer">Scorer</option>
                              <option value="admin">Admin</option>
                            </select>
                          ) : (
                            <View className="h-full justify-center rounded-md border border-border bg-background px-3">
                              <Text>{promoteRole}</Text>
                            </View>
                          )}
                        </View>
                        <Button
                          variant="outline"
                          disabled={promotePending || !promoteUid.trim()}
                          onPress={() => {
                            void handlePromoteUser();
                          }}
                        >
                          <Text>{promotePending ? 'Promoting' : 'Promote'}</Text>
                        </Button>
                      </View>
                      {promoteError ? (
                        <Text variant="small" className="text-destructive">
                          {promoteError}
                        </Text>
                      ) : null}
                      {promoteSuccess ? (
                        <Text variant="small" className="text-emerald-500">
                          {promoteSuccess}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                )}
              </View>
            </View>
          )
        }

      </ScrollView >
    );
  }


  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <View className="flex-1 bg-background px-4 py-6">{body}</View>
    </>
  );
}
