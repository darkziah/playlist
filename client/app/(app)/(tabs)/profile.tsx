import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Stack } from 'expo-router';
import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, TextInput, View } from 'react-native';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { StarIcon } from 'lucide-react-native';

import { auth } from '@/lib/firebase';
import { usePlayerIdentityProfile } from '@/hooks/usePlayerIdentityProfile';
import {
  isUsernameAvailable,
  savePlayerIdentityProfile,
  type PlayerIdentityProfileDoc,
} from '@/lib/playerProfile';

const SCREEN_OPTIONS = {
  title: 'Profile',
  headerTransparent: false,
};

type EditableProfileFormProps = {
  userId: string;
  profile: PlayerIdentityProfileDoc | null;
};

function EditableProfileForm({ userId, profile }: EditableProfileFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
  }>({});

  const form = useForm({
    defaultValues: {
      username: profile?.username ?? '',
      firstName: profile?.firstName ?? '',
      lastName: profile?.lastName ?? '',
      dateOfBirth: profile?.dateOfBirth ?? '',
      barangay: profile?.barangay ?? '',
    },
  });

  const handleSubmit = async () => {
    setGlobalError(null);
    setFieldErrors({});
    const values = form.state.values;

    const username = (values.username ?? '').trim();
    const firstName = (values.firstName ?? '').trim();
    const lastName = (values.lastName ?? '').trim();
    const dateOfBirth = (values.dateOfBirth ?? '').trim();
    const barangay = (values.barangay ?? '').trim();

    const nextErrors: typeof fieldErrors = {};
    if (!username) nextErrors.username = 'Username is required';
    if (!firstName) nextErrors.firstName = 'First name is required';
    if (!lastName) nextErrors.lastName = 'Last name is required';
    if (!dateOfBirth) nextErrors.dateOfBirth = 'Date of birth is required';

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      if (!profile || username !== (profile.username ?? '')) {
        const available = await isUsernameAvailable(username, {
          excludeUserId: userId,
        });
        if (!available) {
          setFieldErrors({
            ...nextErrors,
            username: 'That username is already taken. Try another.',
          });
          return;
        }
      }

      await savePlayerIdentityProfile({
        userId,
        username,
        firstName,
        lastName,
        dateOfBirth,
        ...(barangay ? { barangay } : {}),
      });
    } catch (e: any) {
      setGlobalError(
        e?.message ?? 'Unable to save your profile. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="mt-4 gap-3">
      {globalError ? (
        <Text variant="small" className="text-destructive">
          {globalError}
        </Text>
      ) : null}

      <View className="gap-3">
        <form.Field
          name="username"
          children={(field) => (
            <View className="gap-1">
              <Text variant="small">Roster username</Text>
              <TextInput
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                value={field.state.value ?? ''}
                onChangeText={field.handleChange}
                placeholder="e.g. dragonRider07"
                autoCapitalize="none"
              />
              {fieldErrors.username ? (
                <Text variant="small" className="text-destructive">
                  {fieldErrors.username}
                </Text>
              ) : null}
            </View>
          )}
        />
        <form.Field
          name="firstName"
          children={(field) => (
            <View className="gap-1">
              <Text variant="small">First name</Text>
              <TextInput
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                value={field.state.value ?? ''}
                onChangeText={field.handleChange}
                autoCapitalize="words"
              />
              {fieldErrors.firstName ? (
                <Text variant="small" className="text-destructive">
                  {fieldErrors.firstName}
                </Text>
              ) : null}
            </View>
          )}
        />
        <form.Field
          name="lastName"
          children={(field) => (
            <View className="gap-1">
              <Text variant="small">Last name</Text>
              <TextInput
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                value={field.state.value ?? ''}
                onChangeText={field.handleChange}
                autoCapitalize="words"
              />
              {fieldErrors.lastName ? (
                <Text variant="small" className="text-destructive">
                  {fieldErrors.lastName}
                </Text>
              ) : null}
            </View>
          )}
        />
        <form.Field
          name="dateOfBirth"
          children={(field) => (
            <View className="gap-1">
              <Text variant="small">Date of birth</Text>
              <TextInput
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                value={field.state.value ?? ''}
                onChangeText={field.handleChange}
                placeholder="YYYY-MM-DD"
                autoCapitalize="none"
              />
              {fieldErrors.dateOfBirth ? (
                <Text variant="small" className="text-destructive">
                  {fieldErrors.dateOfBirth}
                </Text>
              ) : null}
            </View>
          )}
        />
        <form.Field
          name="barangay"
          children={(field) => (
            <View className="gap-1">
              <Text variant="small">Location (optional)</Text>
              <TextInput
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                value={field.state.value ?? ''}
                onChangeText={field.handleChange}
                placeholder="Your Location (optional)"
              />
            </View>
          )}
        />
      </View>

      <Button
        className="mt-1 self-end"
        variant="destructive"
        disabled={submitting}
        onPress={() => {
          void handleSubmit();
        }}
      >
        <Text>{submitting ? 'Saving...' : 'Save profile'}</Text>
      </Button>
    </View>
  );
}

export default function Screen() {
  const { user, profile, loading, profileComplete } =
    usePlayerIdentityProfile();
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      setError(e?.message ?? 'Unable to sign in. Please try again.');
    }
  };

  const handleSignOut = async () => {
    setError(null);
    try {
      await signOut(auth);
    } catch (e: any) {
      setError(e?.message ?? 'Unable to sign out. Please try again.');
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={SCREEN_OPTIONS} />
        <View className="flex-1 items-center justify-center bg-background">
          <ActivityIndicator />
        </View>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Stack.Screen options={SCREEN_OPTIONS} />
        <View className="flex-1 items-center justify-center bg-background px-4">
          <View className="w-full max-w-xl gap-4 rounded-2xl border border-border bg-card/95 p-5">
            <Text className="text-xl font-semibold text-foreground">
              Set up your game identity
            </Text>
            <Text variant="small" className="text-muted-foreground">
              Sign in to create a roster-ready profile with your picture and
              username.
            </Text>
            {error ? (
              <Text variant="small" className="text-destructive">
                {error}
              </Text>
            ) : null}
            <Button
              variant="destructive"
              onPress={() => {
                void handleSignIn();
              }}
            >
              <Text>Sign in with Google</Text>
            </Button>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <ScrollView className="flex-1 bg-background">
        <View className="mx-auto w-full max-w-xl pb-8">
          <View className="relative rounded-b-3xl bg-primary px-6 pt-12 pb-8">
            <View className="items-center">
              {profile?.photoUrl ? (
                <Image
                  source={{ uri: profile.photoUrl }}
                  className="h-32 w-32 rounded-3xl bg-muted"
                  resizeMode="cover"
                />
              ) : (
                <View className="h-32 w-32 items-center justify-center rounded-3xl bg-muted">
                  <Text variant="small" className="text-foreground">
                    No photo
                  </Text>
                </View>
              )}

              <View className="mt-4 items-center gap-1">
                {`${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim() ? (
                  <Text className="text-xl font-semibold text-primary-foreground">
                    {`${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim()}
                  </Text>
                ) : null}
                {profile?.username ? (
                  <Text variant="muted" className="text-primary-foreground">
                    @{profile.username}
                  </Text>
                ) : null}
                {profile?.barangay ? (
                  <Text variant="small" className="mt-1 text-primary-foreground">
                    {profile.barangay}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          <View className="px-6 pt-6 gap-6">
            <View className="mt-2 gap-3 rounded-2xl border border-border bg-card/95 p-4">
              <Text className="text-lg font-semibold text-foreground">
                Edit profile
              </Text>
              {profileComplete ? (
                <Text variant="small" className="text-muted-foreground">
                  Update your details anytime. Changes apply the next time you
                  join a game.
                </Text>
              ) : (
                <Text variant="small" className="text-destructive">
                  Finish your profile so you can join games.
                </Text>
              )}
              <EditableProfileForm userId={user.uid} profile={profile} />
            </View>

            <View className="mt-2 gap-3 rounded-2xl border border-border bg-card/95 p-4">
              <Text className="text-lg font-semibold text-foreground">
                Account
              </Text>
              {error ? (
                <Text variant="small" className="text-destructive">
                  {error}
                </Text>
              ) : null}
              <Button
                variant="outline"
                onPress={() => {
                  void handleSignOut();
                }}
              >
                <Text>Sign out</Text>
              </Button>
            </View>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
