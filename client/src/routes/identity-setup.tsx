import { createFileRoute, useRouter } from "@tanstack/react-router";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePlayerIdentityProfile } from "@/hooks/usePlayerIdentityProfile";
import { auth } from "@/lib/firebase";

import { IdentityWizard } from "./profile";

export const Route = createFileRoute("/identity-setup")({
  component: IdentitySetupRoute,
});

function IdentitySetupRoute() {
  const router = useRouter();
  const search = Route.useSearch() as { returnTo?: string };
  const returnTo = typeof search.returnTo === "string" ? search.returnTo : undefined;

  const { user, profile, loading, profileComplete } = usePlayerIdentityProfile();

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (!profileComplete) return;

    void router.navigate({ to: returnTo ?? "/" });
  }, [loading, user, profileComplete, returnTo, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-foreground">
        Loading your identity setup...
      </div>
    );
  }

  if (!user) {
    return <UnauthedIdentitySetupScreen />;
  }

  if (profileComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center text-foreground">
        Redirecting...
      </div>
    );
  }

  return <IdentityWizard userId={user.uid} profile={profile} returnTo={returnTo} />;
}

function UnauthedIdentitySetupScreen() {
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
            <CardTitle>Finish your game identity</CardTitle>
            <CardDescription>
              Sign in to complete the multi-step wizard so you can join game
              rosters.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              We&apos;ll guide you through adding a profile picture, roster username,
              and personal details so staff can recognize you.
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
          <CardFooter className="justify-end gap-3">
            <Button
              type="button"
              variant="destructive"
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
