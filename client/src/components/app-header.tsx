import { Link } from "@tanstack/react-router";
import { MenuIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  loginGameMaster,
  logoutGameMaster,
  useGameMasterAuth,
} from "@/lib/gameMasterAuth";

export function AppHeader() {
  const { user, isGameMaster, loading } = useGameMasterAuth();

  const navLinks = [
    { label: "Home", to: "/", show: true },
    { label: "Dashboard", to: "/dashboard", show: isGameMaster },
  ];

  const visibleLinks = navLinks.filter((link) => link.show);

  const authAction = loading ? (
    <span className="text-xs text-muted-foreground">Checking access…</span>
  ) : user ? (
    <div className="flex items-center gap-2 text-xs text-[#3e3636]">
      {isGameMaster ? (
        <span className="rounded-full bg-[#000000]/10 px-2 py-0.5 text-[11px] font-semibold text-[#000000]">
          Game master
        </span>
      ) : null}
      <span className="hidden sm:inline">{user.email ?? "Signed in"}</span>
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
  ) : (
    <Button
      variant="outline"
      size="sm"
      className="border-border"
      onClick={() => {
        void loginGameMaster({ redirectToDashboard: true });
      }}
    >
      Sign in
    </Button>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur supports-backdrop-filter:bg-card/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="rounded-sm bg-[#000000] px-2 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#f5eded]">
            Playlist
          </span>
          <span className="hidden text-sm font-semibold text-[#3e3636] sm:inline">
            Upcoming games
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-4 text-sm font-medium text-[#3e3636] sm:flex">
            {visibleLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to as "/" | "/dashboard"}
                className="transition-colors hover:text-[#000000]"
                activeProps={{ className: "text-[#d72323]" }}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="hidden sm:flex items-center gap-3">{authAction}</div>
          <div className="flex items-center gap-2 sm:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="border-border text-[#3e3636] hover:bg-[#000000]/5 hover:text-[#000000]"
                  aria-label="Open navigation"
                >
                  <MenuIcon className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="flex flex-col gap-4">
                <SheetHeader className="pb-1">
                  <SheetTitle className="text-[#000000]">
                    Navigation
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 px-4 text-sm font-medium">
                  {visibleLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to as "/" | "/dashboard"}
                      className="rounded-md px-3 py-2 text-[#3e3636] hover:bg-[#000000]/5 hover:text-[#000000]"
                      activeProps={{ className: "bg-[#000000] text-[#f5eded]" }}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
                <div className="border-t border-border pt-3">{authAction}</div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
