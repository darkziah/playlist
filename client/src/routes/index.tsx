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
		<div className="px-4 py-6 sm:py-8">
			<div className="mx-auto flex max-w-6xl flex-col gap-8">
				{/* <section className="space-y-4 rounded-2xl border border-border bg-card/95 px-4 py-5 shadow-sm sm:px-6 sm:py-6">
					<p className="text-xs font-semibold uppercase tracking-[0.25em] text-destructive">
						Upcoming games
					</p>
					<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
						<div className="space-y-1">
							<h1 className="text-3xl font-black text-foreground sm:text-4xl">
								Build a consistent roster
							</h1>
							<p className="text-sm text-muted-foreground sm:text-base">
								Browse upcoming sessions, reserve your spot, and keep the same squad showing up to every match.
							</p>
						</div>
					</div>
				</section> */}

				<div className="grid gap-6 sm:gap-8">
					<section className="space-y-4">
						<div className="flex items-center justify-between gap-2">
							<h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-secondary-foreground">
								Available sessions
							</h2>
							<span className="text-xs text-muted-foreground">
								{hasGames && !isLoading ? `${games.length} upcoming game${games.length === 1 ? "" : "s"}` : ""}
							</span>
						</div>
						{isLoading ? (
							<p className="text-sm text-muted-foreground">Loading games…</p>
						) : !hasGames ? (
							<div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border bg-card/60 p-6 text-sm text-muted-foreground">
								<p className="font-medium text-secondary-foreground">No future games scheduled yet.</p>
								<p>
									Game masters can open the dashboard to publish the first session and start building a roster.
								</p>
								{!authLoading && isGameMaster ? (
									<Button asChild size="sm" className="mt-1">
										<Link to="/dashboard">Open dashboard</Link>
									</Button>
								) : null}
							</div>
						) : (
							<div className="grid gap-4 sm:grid-cols-2">
								{games.map((game) => {
									const slotsRemaining = Math.max(
										game.maxPlayers - game.filledSlots,
										0,
									);
									const isFull = slotsRemaining <= 0;
									return (
										<article
											key={game.id}
											className="flex h-full flex-col justify-between rounded-2xl border border-border bg-card/95 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
										>
											<div className="space-y-3">
												<div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
													<span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-medium text-[11px] text-secondary-foreground">
														Schedule
													</span>
													<time className="font-medium text-secondary-foreground">
														{new Date(game.dateTime).toLocaleString()}
													</time>
												</div>
												<h3 className="text-base font-semibold text-foreground">
													{game.title}
												</h3>
												<p className="line-clamp-2 text-xs text-muted-foreground">
													{game.description}
												</p>
												<dl className="mt-3 grid grid-cols-2 gap-3 text-[11px] sm:text-xs">
													<div className="space-y-0.5">
														<dt className="font-semibold text-secondary-foreground">Price</dt>
														<dd>PHP {game.price.toFixed(2)} / player</dd>
													</div>
													<div className="space-y-0.5">
														<dt className="font-semibold text-secondary-foreground">Slots</dt>
														<dd>
															{game.filledSlots} / {game.maxPlayers} ({slotsRemaining} left)
														</dd>
													</div>
												</dl>
											</div>
											<div className="mt-4 flex items-center justify-between gap-3">
												<span
													className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium ${isFull
														? "bg-muted text-secondary-foreground"
														: "bg-accent text-foreground"
														}`}
													aria-label={
														isFull
															? "Game is full"
															: `${slotsRemaining} slots remaining`
													}
												>
													{isFull ? "Game is full" : `${slotsRemaining} slots remaining`}
												</span>
												<Button
													asChild
													size="sm"
													disabled={isFull}
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
				</div>
			</div>
		</div>
	);
}

export default Index;
