import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Game } from "shared";

import { Button } from "@/components/ui/button";
import { fetchGames, watchGames } from "@/lib/games";
import {
	useGameMasterAuth,
	loginGameMaster,
	logoutGameMaster,
} from "@/lib/gameMasterAuth";

export const Route = createFileRoute("/")({
	component: Index,
});

function Index() {
	const queryClient = useQueryClient();
	const { user, isGameMaster, loading: authLoading } = useGameMasterAuth();

	const { data: games = [], isLoading } = useQuery<Game[]>({
		queryKey: ["games"],
		queryFn: fetchGames,
	});

	useEffect(() => {
		const stop = watchGames((updated) => {
			queryClient.setQueryData(["games"], updated);
		});
		return () => stop();
	}, [queryClient]);

	const hasGames = games.length > 0;

	return (
		<div className="min-h-screen bg-background text-foreground px-4 py-8">
			<div className="mx-auto flex max-w-6xl flex-col gap-8">
				<header className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
					<div>
						<h1 className="text-3xl font-black tracking-tight text-[#000000]">
							Upcoming games
						</h1>
						<p className="text-sm text-muted-foreground">
							Schedule matches and let players join a deterministic roster.
						</p>
					</div>
					<div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground sm:mt-0">
						{authLoading ? (
							<span>Checking access…</span>
						) : user && isGameMaster ? (
							<>
								<span>
									Signed in as {user.email ?? "game master"}
								</span>
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
							</>
						) : (
							<>
								<span>Sign in as a game master to schedule games.</span>
								<Button
									variant="outline"
									size="sm"
									className="border-border"
									onClick={() => {
										void loginGameMaster();
									}}
								>
									Sign in
								</Button>
							</>
						)}
					</div>
				</header>

				<div className="grid gap-8">
					<section className="space-y-4">
						<h2 className="text-lg font-semibold text-[#000000]">
							Joinable games
						</h2>
						{isLoading ? (
							<p className="text-sm text-muted-foreground">Loading games…</p>
						) : !hasGames ? (
							<div className="rounded-xl border border-dashed border-border bg-card/40 p-6 text-sm text-muted-foreground">
								<p className="mb-1 font-medium">No future games scheduled.</p>
								<p>Game masters can open the dashboard to schedule the first game.</p>
							</div>
						) : (
							<div className="grid gap-4 sm:grid-cols-2">
								{games.map((game) => {
									const slotsRemaining = Math.max(
										game.maxPlayers - game.filledSlots,
										0,
									);
									return (
										<article
											key={game.id}
											className="flex h-full flex-col justify-between rounded-xl border border-border bg-card/90 p-5 shadow-sm"
										>
											<div className="space-y-2">
												<h3 className="text-base font-semibold text-[#000000]">
													{game.title}
												</h3>
												<p className="line-clamp-2 text-xs text-muted-foreground">
													{game.description}
												</p>
												<dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
													<div className="space-y-0.5">
														<dt className="font-semibold text-[#3e3636]">
															Schedule
														</dt>
														<dd>
															{new Date(game.dateTime).toLocaleString()}
														</dd>
													</div>
													<div className="space-y-0.5">
														<dt className="font-semibold text-[#3e3636]">
															Price
														</dt>
														<dd>${game.price.toFixed(2)} / player</dd>
													</div>
													<div className="space-y-0.5">
														<dt className="font-semibold text-[#3e3636]">
															Slots left
														</dt>
														<dd>
															{game.filledSlots} / {game.maxPlayers} (
															{slotsRemaining} left)
														</dd>
													</div>
												</dl>
											</div>
											<div className="mt-4 flex items-center justify-between gap-3">
												<span
													className="inline-flex items-center rounded-full bg-[#000000]/5 px-3 py-1 text-xs font-medium text-[#3e3636]"
													aria-label={
														slotsRemaining > 0
															? `${slotsRemaining} slots remaining`
															: "Game is full"
													}
												>
													{slotsRemaining > 0
														? `${slotsRemaining} slots remaining`
														: "Game is full"}
												</span>
												<Button
													asChild
													size="sm"
													className=" text-[#f5eded]	"
													disabled={slotsRemaining <= 0}
												>
													<Link to="/games/$gameId" params={{ gameId: game.id }}>
														View details
													</Link>
												</Button>
											</div>
										</article>
									);
								})}
							</div>
						)}
					</section>
					<section className="rounded-xl border border-border bg-card/95 p-6 shadow-sm">
						<h2 className="mb-2 text-lg font-semibold text-[#000000]">
							Game master controls
						</h2>
						<p className="text-sm text-muted-foreground">
							Create and manage games from the dedicated dashboard.
						</p>
						<div className="mt-4">
							{authLoading ? (
								<p className="text-sm text-muted-foreground">Checking access…</p>
							) : isGameMaster ? (
								<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
									<Button asChild className="bg-[#000000] text-[#f5eded] hover:bg-[#3e3636]">
										<Link to="/dashboard">Open dashboard</Link>
									</Button>
									<Button
										variant="ghost"
										size="sm"
										className="text-[#3e3636]"
										onClick={() => {
											void logoutGameMaster();
										}}
									>
										Sign out
									</Button>
								</div>
							) : (
								<Button
									className="bg-[#000000] text-[#f5eded] hover:bg-[#3e3636]"
									onClick={() => {
										void loginGameMaster({ redirectToDashboard: true });
									}}
								>
									Sign in as game master
								</Button>
							)}
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}

export default Index;

