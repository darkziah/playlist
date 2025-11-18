import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { NewGamePayload } from "shared";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createGame } from "@/lib/games";
import {
  createGameMasterInvite,
  loginGameMaster,
  logoutGameMaster,
  useGameMasterAuth,
} from "@/lib/gameMasterAuth";

export const Route = createFileRoute("/dashboard")({
  component: DashboardRoute,
});

function DashboardRoute() {
  const queryClient = useQueryClient();
  const { user, isGameMaster, loading } = useGameMasterAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("8");
  const [price, setPrice] = useState("0");
  const [formError, setFormError] = useState<string | null>(null);

  const createGameMutation = useMutation({
    mutationFn: (payload: NewGamePayload) => createGame(payload),
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setDateTime("");
      setMaxPlayers("8");
      setPrice("0");
      setFormError(null);
      void queryClient.invalidateQueries({ queryKey: ["games"] });
    },
    onError: (err: any) => {
      setFormError(
        err?.message ?? "Unable to create game. Please check your input.",
      );
    },
  });

  const handleCreateGame = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isGameMaster) {
      setFormError("You must be a game master to schedule games.");
      return;
    }
    if (!title.trim() || !dateTime) {
      setFormError("Title and date/time are required.");
      return;
    }

    const maxPlayersNumber = Number.parseInt(maxPlayers, 10);
    const priceNumber = Number.parseFloat(price);
    if (!Number.isFinite(maxPlayersNumber) || maxPlayersNumber <= 0) {
      setFormError("Max players must be greater than 0.");
      return;
    }
    if (!Number.isFinite(priceNumber) || priceNumber < 0) {
      setFormError("Price cannot be negative.");
      return;
    }

    const payload: NewGamePayload = {
      title: title.trim(),
      description: description.trim(),
      dateTime,
      maxPlayers: maxPlayersNumber,
      price: priceNumber,
      status: "scheduled",
    };

    createGameMutation.mutate(payload);
  };

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const token = await createGameMasterInvite(email);
      const origin =
        typeof window !== "undefined" && window.location.origin
          ? window.location.origin
          : "";
      return origin ? `${origin}/invite/${token}` : `/invite/${token}`;
    },
    onSuccess: (link) => {
      setInviteLink(link);
      setInviteError(null);
      setInviteEmail("");
    },
    onError: (err: any) => {
      setInviteError(err?.message ?? "Unable to create invite.");
    },
  });

  const inviteDisabled = inviteMutation.isPending || !inviteEmail.trim();
  const dashboardBody = useMemo(() => {
    if (loading) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
          Checking access…
        </div>
      );
    }

    if (!isGameMaster) {
      return (
        <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card/90 p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-foreground">
            Game master access required
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Sign in with your game master account to manage schedules and invites.
          </p>
          <Button
            className="mt-6"
            onClick={() => {
              void loginGameMaster({ redirectToDashboard: true });
            }}
          >
            Sign in as game master
          </Button>
        </div>
      );
    }

    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-destructive">
              Game master dashboard
            </p>
            <h1 className="text-3xl font-black text-foreground">
              Schedule and manage games
            </h1>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{user?.email ?? "Signed in"}</span>
            <Button
              variant="outline"
              size="sm"
              className="border-border"
              onClick={() => {
                void logoutGameMaster();
              }}
            >
              Sign out
            </Button>
          </div>
        </header>
        <div className="grid gap-8 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card/95 p-6 shadow-sm">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-destructive">
                New game
              </p>
              <h2 className="text-xl font-semibold text-foreground">
                Create upcoming game
              </h2>
              <p className="text-sm text-muted-foreground">
                Publish a new session with schedule, price, and player limits.
              </p>
            </div>
            <form className="mt-4 space-y-4" onSubmit={handleCreateGame}>
              <div className="space-y-1">
                <Label htmlFor="dashboard-title">Title</Label>
                <Input
                  id="dashboard-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Friday Night Match"
                  disabled={createGameMutation.isPending}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dashboard-description">Description</Label>
                <Textarea
                  id="dashboard-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Share format, rules, or anything players should know"
                  disabled={createGameMutation.isPending}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="dashboard-datetime">Date & time</Label>
                  <Input
                    id="dashboard-datetime"
                    type="datetime-local"
                    value={dateTime}
                    onChange={(e) => setDateTime(e.target.value)}
                    disabled={createGameMutation.isPending}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dashboard-maxPlayers">Max players</Label>
                  <Input
                    id="dashboard-maxPlayers"
                    type="number"
                    min={1}
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(e.target.value)}
                    disabled={createGameMutation.isPending}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="dashboard-price">Price per player</Label>
                <Input
                  id="dashboard-price"
                  type="number"
                  step="0.01"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={createGameMutation.isPending}
                />
              </div>
              {formError && (
                <p className="text-sm text-destructive">{formError}</p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={createGameMutation.isPending}
              >
                {createGameMutation.isPending ? "Creating game…" : "Create game"}
              </Button>
            </form>
          </section>
          <section className="rounded-2xl border border-border bg-card/95 p-6 shadow-sm">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-destructive">
                Invites
              </p>
              <h2 className="text-xl font-semibold text-foreground">
                Invite another game master
              </h2>
              <p className="text-sm text-muted-foreground">
                Generate a one-time invite link and share it with trusted collaborators.
              </p>
            </div>
            <div className="mt-4 space-y-3">
              <Label htmlFor="invite-email">Invite email</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="new-gamemaster@example.com"
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    setInviteError(null);
                  }}
                  disabled={inviteMutation.isPending}
                />
                <Button
                  type="button"
                  className="sm:w-auto"
                  disabled={inviteDisabled}
                  onClick={() => {
                    setInviteLink(null);
                    inviteMutation.mutate(inviteEmail.trim());
                  }}
                >
                  {inviteMutation.isPending ? "Generating…" : "Create invite"}
                </Button>
              </div>
              {inviteError && (
                <p className="text-sm text-destructive">{inviteError}</p>
              )}
              {inviteLink && (
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">
                    Share this link with the new game master:
                  </p>
                  <Input
                    type="text"
                    value={inviteLink}
                    readOnly
                    onFocus={(e) => e.target.select()}
                  />
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  }, [createGameMutation.isPending, dateTime, description, inviteDisabled, inviteEmail, inviteError, inviteLink, inviteMutation.isPending, isGameMaster, loading, maxPlayers, price, title, user]);

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      {dashboardBody}
    </div>
  );
}
