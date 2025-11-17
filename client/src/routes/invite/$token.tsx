import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { acceptGameMasterInvite, loginGameMaster, useGameMasterAuth } from "@/lib/gameMasterAuth";

export const Route = createFileRoute("/invite/$token")({
  component: InviteRoute,
});

function InviteRoute() {
  const { token } = Route.useParams();
  const { user, loading } = useGameMasterAuth();

  const [hasAttempted, setHasAttempted] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "auth-required" | "accepting" | "accepted" | "error"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing invite token.");
      return;
    }

    if (loading) return;

    if (!user) {
      setStatus("auth-required");
      return;
    }

    if (hasAttempted) return;

    setHasAttempted(true);
    setStatus("accepting");

    void (async () => {
      const result = await acceptGameMasterInvite(token);
      if (result.kind === "accepted") {
        setStatus("accepted");
        setMessage(
          "Invite accepted. You are now a game master and can schedule games.",
        );
      } else {
        setStatus("error");
        setMessage(result.reason);
      }
    })();
  }, [token, loading, user, hasAttempted]);

  if (status === "auth-required") {
    return (
      <div className="min-h-screen bg-background text-foreground px-4 py-8">
        <div className="mx-auto max-w-xl space-y-4 rounded-xl border border-border bg-card/95 p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-[#000000]">
            Game master invite
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in with the email address that received this invite, then well
            automatically apply it.
          </p>
          <Button
            className="bg-[#000000] text-[#f5eded] hover:bg-[#3e3636]"
            onClick={() => {
              void loginGameMaster();
            }}
          >
            Sign in as game master
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="mx-auto max-w-xl space-y-4 rounded-xl border border-border bg-card/95 p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-[#000000]">
          Game master invite
        </h1>
        {loading || status === "accepting" ? (
          <p className="text-sm text-muted-foreground">
            Processing your invite
          </p>
        ) : status === "accepted" ? (
          <>
            <p className="text-sm text-muted-foreground">
              {message ?? "Invite accepted."}
            </p>
            <Button
              asChild
              className="bg-[#000000] text-[#f5eded] hover:bg-[#3e3636]"
            >
              <Link to="/">Go to home</Link>
            </Button>
          </>
        ) : status === "error" ? (
          <p className="text-sm text-[#d72323]">
            {message ?? "Unable to accept invite."}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Follow this page to accept your game master invite.
          </p>
        )}
      </div>
    </div>
  );
}

export default InviteRoute;
