import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/profile/$profileId")({
  component: ProfileRouteComponent,
  validateSearch: (search) => {
    return {
      username: (search.username || "") as string,
      firstName: (search.firstName || "") as string,
      lastName: (search.lastName || "") as string,
      barangay: (search.barangay || "") as string,
      photoUrl: (search.photoUrl || "") as string,
      fromGameId: (search.fromGameId || "") as string,
    };
  },
});

function ProfileRouteComponent() {
  const { profileId } = Route.useParams();
  const search = Route.useSearch();

  const hasPublicProfileData =
    !!search.username || !!search.firstName || !!search.lastName;

  if (!hasPublicProfileData) {
    return (
      <div className="min-h-screen bg-background text-foreground px-4 py-8">
        <div className="mx-auto flex max-w-xl flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile not available</CardTitle>
              <CardDescription>
                This player profile could not be loaded. It may not exist or may be
                protected.
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-between gap-3">
              <Button asChild variant="outline" className="border-border">
                <Link to={search.fromGameId ? "/games/$gameId" : "/"} params={
                  search.fromGameId ? { gameId: search.fromGameId } : undefined
                }>
                  {search.fromGameId ? "Back to game" : "Back to games"}
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  const displayName = `${search.firstName ?? ""} ${search.lastName ?? ""}`.trim();

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Player profile</CardTitle>
            <CardDescription>
              Public roster identity for this player. Details here are limited to
              what other players and staff can safely see.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            {search.photoUrl && (
              <img
                src={search.photoUrl}
                alt={search.username ?? "Player profile"}
                className="h-16 w-16 rounded-full object-cover border border-border sm:h-20 sm:w-20"
              />
            )}
            <div className="space-y-1 text-sm text-center sm:text-left">
              {search.username && (
                <p className="font-semibold text-foreground">
                  @{search.username}
                </p>
              )}
              {displayName && (
                <p className="text-muted-foreground">{displayName}</p>
              )}
              {search.barangay && (
                <p className="text-xs text-muted-foreground">
                  Barangay: {search.barangay}
                </p>
              )}
              <p className="text-[0.7rem] text-muted-foreground">
                Sensitive details like exact birth date are only visible in internal
                staff views, not on this public profile.
              </p>
            </div>
          </CardContent>
          <CardFooter className="justify-between gap-3">
            <Button asChild variant="outline" className="border-border">
              <Link to={search.fromGameId ? "/games/$gameId" : "/"} params={
                search.fromGameId ? { gameId: search.fromGameId } : undefined
              }>
                {search.fromGameId ? "Back to game" : "Back to games"}
              </Link>
            </Button>
          </CardFooter>
        </Card>
        <p className="text-[0.7rem] text-muted-foreground text-center">
          Profile ID: <span className="font-mono">{profileId}</span>
        </p>
      </div>
    </div>
  );
}
