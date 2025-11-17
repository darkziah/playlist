import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth } from "@/lib/firebase";
import {
  isUsernameAvailable,
  savePlayerIdentityProfile,
  uploadPlayerProfilePhoto,
  type PlayerIdentityProfileDoc,
} from "@/lib/playerProfile";
import { usePlayerIdentityProfile } from "@/hooks/usePlayerIdentityProfile";

type WizardValues = {
  username: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  barangay: string;
};

export const Route = createFileRoute("/profile")({
  component: RouteComponent,
});

function RouteComponent() {
  const { user, profile, loading, profileComplete } = usePlayerIdentityProfile();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-foreground">
        Loading your profile...
      </div>
    );
  }

  if (!user) {
    return <UnauthedProfileScreen />;
  }

  if (profileComplete && profile) {
    return <CompletedProfileScreen profile={profile} />;
  }

  return <IdentityWizard userId={user.uid} profile={profile} />;
}

function UnauthedProfileScreen() {
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Sign-in failed", err);
      setError("Unable to sign in. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Set up your game identity</CardTitle>
            <CardDescription>
              Sign in to create a roster-ready profile with your picture and username.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You&apos;ll use this identity when joining game rosters so staff can quickly
              recognize you.
            </p>
            {error && <p className="text-sm text-[#d72323]">{error}</p>}
          </CardContent>
          <CardFooter className="justify-end gap-3">
            <Button
              type="button"
              className="bg-[#d72323] hover:bg-[#b71d1d] text-[#f5eded]"
              onClick={() => {
                void handleSignIn();
              }}
            >
              Sign in with Google
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

function CompletedProfileScreen({
  profile,
}: {
  profile: PlayerIdentityProfileDoc;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Your roster identity is ready</CardTitle>
            <CardDescription>
              You can now join game rosters with your saved picture and username.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            {profile.photoUrl && (
              <img
                src={profile.photoUrl}
                alt={profile.username ?? "Profile"}
                className="h-16 w-16 rounded-full object-cover border border-border sm:h-20 sm:w-20"
              />
            )}
            <div className="space-y-1 text-sm text-center sm:text-left">
              <p className="font-semibold text-[#000000]">
                @{profile.username}
              </p>
              <p className="text-muted-foreground">
                {profile.firstName} {profile.lastName}
              </p>
              <p className="text-xs text-muted-foreground">
                Date of birth: {profile.dateOfBirth}
              </p>
              {profile.barangay && (
                <p className="text-xs text-muted-foreground">
                  Barangay: {profile.barangay}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="justify-between gap-3">
            <Button asChild variant="outline" className="border-border">
              <Link to="/">Back to games</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export function IdentityWizard({
  userId,
  profile,
  returnTo,
}: {
  userId: string;
  profile: PlayerIdentityProfileDoc | null;
  returnTo?: string;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(() => {
    if (!profile?.photoUrl) return 1;
    if (!profile?.username) return 2;
    if (!profile?.firstName || !profile?.lastName || !profile?.dateOfBirth)
      return 3;
    return 4;
  });

  const [globalError, setGlobalError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      username: profile?.username ?? "",
      firstName: profile?.firstName ?? "",
      lastName: profile?.lastName ?? "",
      dateOfBirth: profile?.dateOfBirth ?? "",
      barangay: profile?.barangay ?? "",
    },
  });

  const stepLabel = useMemo(() => {
    switch (step) {
      case 1:
        return "Step 1 of 4: Profile picture";
      case 2:
        return "Step 2 of 4: Username";
      case 3:
        return "Step 3 of 4: Personal details";
      case 4:
        return "Step 4 of 4: Ready to play";
    }
  }, [step]);

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Game signup wizard</CardTitle>
            <CardDescription>{stepLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            {globalError && (
              <p className="mb-3 text-sm text-[#d72323]">{globalError}</p>
            )}
            {step === 1 && (
              <WizardStepPhoto
                userId={userId}
                profile={profile}
                onNext={() => {
                  setGlobalError(null);
                  setStep(2);
                }}
                setGlobalError={setGlobalError}
              />
            )}
            {step === 2 && (
              <WizardStepUsername
                userId={userId}
                form={form}
                onNext={() => {
                  setGlobalError(null);
                  setStep(3);
                }}
                setGlobalError={setGlobalError}
              />
            )}
            {step === 3 && (
              <WizardStepDetails
                userId={userId}
                form={form}
                onNext={() => {
                  setGlobalError(null);
                  setStep(4);
                }}
                setGlobalError={setGlobalError}
              />
            )}
            {step === 4 && <WizardStepWelcome returnTo={returnTo} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function WizardStepPhoto({
  userId,
  profile,
  onNext,
  setGlobalError,
}: {
  userId: string;
  profile: PlayerIdentityProfileDoc | null;
  onNext: () => void;
  setGlobalError: (value: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const hasPhoto = !!profile?.photoUrl;

  const form = useForm({
    defaultValues: { acknowledged: false },
  });

  const handleFileChange = async (file: File | null) => {
    if (!file) return;
    setLocalError(null);
    setGlobalError(null);
    setUploading(true);
    try {
      const url = await uploadPlayerProfilePhoto(userId, file);
      await savePlayerIdentityProfile({ userId, photoUrl: url });
    } catch (err) {
      console.error("Photo upload failed", err);
      setLocalError("Unable to upload photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setLocalError(null);
        setGlobalError(null);
        const acknowledged = !!form.state.values.acknowledged;
        if (!profile?.photoUrl && !acknowledged) {
          setLocalError(
            "Upload a profile picture or confirm you'll add one later before continuing.",
          );
          return;
        }
        onNext();
      }}
    >
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Upload a clear photo so staff can quickly recognize you on the roster.
          This picture will appear next to your username when you join games.
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="h-24 w-24 sm:h-28 sm:w-28 overflow-hidden rounded-full border border-dashed border-border bg-muted">
            {profile?.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt={profile.username ?? "Profile"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                No photo
              </div>
            )}
          </div>
          <div className="space-y-2 text-sm">
            <Label htmlFor="profile-photo">Profile picture</Label>
            <Input
              id="profile-photo"
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                void handleFileChange(file);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Choose a recent photo where your face is visible. JPEG or PNG
              recommended.
            </p>
          </div>
        </div>
      </div>

      <form.Field
        name="acknowledged"
        children={(field: any) => (
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={!!field.state.value}
              onChange={(e) => field.handleChange(e.target.checked)}
              onBlur={field.handleBlur}
            />
            <span>
              Ill add a profile picture later. I understand staff will use my
              username and details to recognize me on the roster.
            </span>
          </label>
        )}
      />

      {localError && <p className="text-sm text-[#d72323]">{localError}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="submit"
          disabled={uploading}
          className="bg-[#d72323] hover:bg-[#b71d1d] text-[#f5eded]"
        >
          {uploading ? "Uploading..." : "Continue"}
        </Button>
      </div>
    </form>
  );
}

function WizardStepUsername({
  userId,
  form,
  onNext,
  setGlobalError,
}: {
  userId: string;
  form: any;
  onNext: () => void;
  setGlobalError: (value: string | null) => void;
}) {
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setFieldError(null);
    setGlobalError(null);
    const rawUsername = form.state.values.username ?? "";
    const username = rawUsername.trim();

    if (!username) {
      setFieldError("Username is required");
      return;
    }

    setSubmitting(true);
    try {
      const available = await isUsernameAvailable(username, {
        excludeUserId: userId,
      });
      if (!available) {
        setFieldError("That username is already taken. Try another.");
        return;
      }

      await savePlayerIdentityProfile({ userId, username });
      onNext();
    } catch (err) {
      console.error("Saving username failed", err);
      setGlobalError("Unable to save username. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
    >
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Choose the name that will appear on game rosters. Staff and other
          players will see this when you join.
        </p>
        <form.Field
          name="username"
          children={(field: any) => (
            <div className="space-y-1">
              <Label htmlFor="username">Roster username</Label>
              <Input
                id="username"
                value={field.state.value ?? ""}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="e.g. dragonRider07"
                autoComplete="off"
              />
            </div>
          )}
        />
        <p className="text-xs text-muted-foreground">
          Usernames must be unique. Avoid real-world sensitive info.
        </p>
      </div>

      {fieldError && <p className="text-sm text-[#d72323]">{fieldError}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="submit"
          disabled={submitting}
          className="bg-[#d72323] hover:bg-[#b71d1d] text-[#f5eded]"
        >
          {submitting ? "Checking..." : "Continue"}
        </Button>
      </div>
    </form>
  );
}

function WizardStepDetails({
  userId,
  form,
  onNext,
  setGlobalError,
}: {
  userId: string;
  form: any;
  onNext: () => void;
  setGlobalError: (value: string | null) => void;
}) {
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setErrors({});
    setGlobalError(null);
    const values = form.state.values;

    const firstName = (values.firstName ?? "").trim();
    const lastName = (values.lastName ?? "").trim();
    const dateOfBirth = (values.dateOfBirth ?? "").trim();
    const barangay = (values.barangay ?? "").trim();

    const nextErrors: typeof errors = {};
    if (!firstName) nextErrors.firstName = "First name is required";
    if (!lastName) nextErrors.lastName = "Last name is required";
    if (!dateOfBirth) {
      nextErrors.dateOfBirth = "Date of birth is required";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      await savePlayerIdentityProfile({
        userId,
        firstName,
        lastName,
        dateOfBirth,
        ...(barangay ? { barangay } : {}),
      });
      onNext();
    } catch (err) {
      console.error("Saving details failed", err);
      setGlobalError("Unable to save your details. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
    >
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          These details help staff confirm who&apos;s on the roster. Only staff
          see your full name and birthday.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <form.Field
            name="firstName"
            children={(field: any) => (
              <div className="space-y-1">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={field.state.value ?? ""}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  autoComplete="given-name"
                />
                {errors.firstName && (
                  <p className="text-xs text-[#d72323]">{errors.firstName}</p>
                )}
              </div>
            )}
          />
          <form.Field
            name="lastName"
            children={(field: any) => (
              <div className="space-y-1">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={field.state.value ?? ""}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  autoComplete="family-name"
                />
                {errors.lastName && (
                  <p className="text-xs text-[#d72323]">{errors.lastName}</p>
                )}
              </div>
            )}
          />
        </div>
        <form.Field
          name="dateOfBirth"
          children={(field: any) => (
            <div className="space-y-1">
              <Label htmlFor="dob">Date of birth</Label>
              <Input
                id="dob"
                type="date"
                value={field.state.value ?? ""}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
              {errors.dateOfBirth && (
                <p className="text-xs text-[#d72323]">{errors.dateOfBirth}</p>
              )}
            </div>
          )}
        />
        <form.Field
          name="barangay"
          children={(field: any) => (
            <div className="space-y-1">
              <Label htmlFor="barangay">Barangay (optional)</Label>
              <Input
                id="barangay"
                value={field.state.value ?? ""}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="Your barangay (optional)"
              />
              <p className="text-xs text-muted-foreground">
                Helpful context for local events, but not required.
              </p>
            </div>
          )}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="submit"
          disabled={submitting}
          className="bg-[#d72323] hover:bg-[#b71d1d] text-[#f5eded]"
        >
          {submitting ? "Saving..." : "Continue"}
        </Button>
      </div>
    </form>
  );
}

function WizardStepWelcome({ returnTo }: { returnTo?: string }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-[#000000]">
          You&apos;re ready to join games!
        </p>
        <p className="text-sm text-muted-foreground">
          Your game identity now has a profile picture, roster username, and
          personal details. When you join a game, staff will see this on the
          roster.
        </p>
      </div>
      <div className="flex justify-end gap-3">
        <Button
          asChild
          className="bg-[#d72323] hover:bg-[#b71d1d] text-[#f5eded]"
        >
          <Link to={returnTo ?? "/"}>Browse games</Link>
        </Button>
      </div>
    </div>
  );
}
