import { createRootRoute, Outlet, useRouter } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useEffect } from "react";
import { AppHeader } from "@/components/app-header";
import {
	consumeDashboardRedirectPreference,
	useGameMasterAuth,
} from "@/lib/gameMasterAuth";

function DashboardRedirectHandler() {
	const router = useRouter();
	const { isGameMaster, loading } = useGameMasterAuth();

	useEffect(() => {
		if (loading) return;
		if (!isGameMaster) return;
		if (!consumeDashboardRedirectPreference()) return;
		void router.navigate({ to: "/dashboard" });
	}, [isGameMaster, loading, router]);

	return null;
}

export const Route = createRootRoute({
	component: () => (
		<>
			<div className="min-h-screen bg-background text-foreground">
				<AppHeader />
				<DashboardRedirectHandler />
				<main className="pt-4 sm:pt-6">
					<Outlet />
				</main>
			</div>
			<TanStackRouterDevtools />
		</>
	),
});
