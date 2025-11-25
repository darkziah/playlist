import { Hono } from "hono";
import { auth, db } from "../auth";
import { FieldValue } from "firebase-admin/firestore";
import type { League, LeagueJoinRequest } from "shared";

const app = new Hono();

app.post("/join", async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
        return c.json({ error: "Unauthorized" }, 401);
    }

    const { leagueId } = await c.req.json();
    if (!leagueId) {
        return c.json({ error: "League ID is required" }, 400);
    }

    const leagueRef = db.collection("organizations").doc(leagueId);
    const leagueSnap = await leagueRef.get();

    if (!leagueSnap.exists) {
        return c.json({ error: "League not found" }, 404);
    }

    const leagueData = leagueSnap.data() as League;
    const joinType = leagueData.metadata?.settings?.joinType || "open";

    if (joinType === "open") {
        // Direct join
        await auth.api.addMember({
            body: {
                userId: session.user.id,
                organizationId: leagueId,
                role: "member" // Default role (Better Auth standard)
            }
        });
        return c.json({ success: true, status: "joined" });
    } else if (joinType === "approval_required") {
        // Create join request
        const requestRef = leagueRef.collection("join_requests");

        // Check if already requested
        const existingQuery = await requestRef
            .where("userId", "==", session.user.id)
            .where("status", "==", "pending")
            .get();

        if (!existingQuery.empty) {
            return c.json({ error: "Request already pending" }, 409);
        }

        const request: Omit<LeagueJoinRequest, "id"> = {
            userId: session.user.id,
            userName: session.user.name || "Unknown",
            userEmail: session.user.email,
            userImage: session.user.image || undefined,
            status: "pending",
            requestedAt: FieldValue.serverTimestamp() as any,
        };

        await requestRef.add(request);
        return c.json({ success: true, status: "pending" });
    } else {
        return c.json({ error: "Join type not supported or invite only" }, 403);
    }
});

app.post("/team", async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
        return c.json({ error: "Unauthorized" }, 401);
    }

    const { leagueId, name, logo, colors } = await c.req.json();
    if (!leagueId || !name) {
        return c.json({ error: "League ID and Name are required" }, 400);
    }

    const leagueRef = db.collection("organizations").doc(leagueId);
    const leagueSnap = await leagueRef.get();

    if (!leagueSnap.exists) {
        return c.json({ error: "League not found" }, 404);
    }

    const leagueData = leagueSnap.data() as League;
    const policy = leagueData.metadata?.settings?.teamCreationPolicy || "any_player";
    const memberRef = leagueRef.collection("members").where("userId", "==", session.user.id);
    const memberSnap = await memberRef.get();
    const isMember = !memberSnap.empty;
    const role = isMember && memberSnap.docs[0] ? (memberSnap.docs[0].data().role as string) : null;
    const isAdmin = role === "owner" || role === "admin";

    if (!isMember && !isAdmin) {
        return c.json({ error: "Must be a league member to create a team" }, 403);
    }

    if (policy === "admin_only" && !isAdmin) {
        return c.json({ error: "Only admins can create teams" }, 403);
    }

    if (policy === "player_request" && !isAdmin) {
        // Create Request
        const requestRef = leagueRef.collection("team_requests");
        await requestRef.add({
            userId: session.user.id,
            userName: session.user.name,
            proposedTeamName: name,
            proposedTeamLogo: logo,
            status: "pending",
            requestedAt: FieldValue.serverTimestamp(),
        });
        return c.json({ success: true, status: "pending" });
    }

    // Create Team directly
    const teamRef = leagueRef.collection("teams");
    const newTeamRef = await teamRef.add({
        leagueId,
        name,
        logo,
        colors: colors || { primary: "#000000", secondary: "#ffffff" },
        status: "active",
        teamAdmin: session.user.id,
        coaches: [],
        staff: [],
        stats: { wins: 0, losses: 0, totalGames: 0 },
        settings: { joinType: "open", maxPlayers: 15 },
        createdAt: FieldValue.serverTimestamp(),
        createdBy: session.user.id,
        updatedAt: FieldValue.serverTimestamp(),
    });

    // Add creator as team admin/member
    await newTeamRef.collection("members").doc(session.user.id).set({
        userId: session.user.id,
        teamId: newTeamRef.id,
        leagueId,
        role: "team_admin",
        stats: { gamesPlayed: 0, points: 0, assists: 0, rebounds: 0, steals: 0, blocks: 0 },
        status: "active",
        joinedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    });

    return c.json({ success: true, status: "created", teamId: newTeamRef.id });
});

// Join Team
app.post("/team/join", async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
        return c.json({ error: "Unauthorized" }, 401);
    }

    const { leagueId, teamId } = await c.req.json();
    if (!leagueId || !teamId) {
        return c.json({ error: "League ID and Team ID are required" }, 400);
    }

    const teamRef = db.collection("organizations").doc(leagueId).collection("teams").doc(teamId);
    const teamSnap = await teamRef.get();

    if (!teamSnap.exists) {
        return c.json({ error: "Team not found" }, 404);
    }

    const teamData = teamSnap.data();
    const joinType = teamData?.settings?.joinType || "open";

    // Check if already a member
    const existingMember = await teamRef.collection("members").doc(session.user.id).get();
    if (existingMember.exists) {
        return c.json({ error: "Already a team member" }, 409);
    }

    if (joinType === "open") {
        // Add directly as player
        await teamRef.collection("members").doc(session.user.id).set({
            userId: session.user.id,
            teamId,
            leagueId,
            role: "player",
            stats: { gamesPlayed: 0, points: 0, assists: 0, rebounds: 0, steals: 0, blocks: 0 },
            status: "active",
            joinedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        return c.json({ success: true, status: "joined" });
    } else if (joinType === "approval_required") {
        // Create join request
        const requestRef = teamRef.collection("join_requests");
        const existingQuery = await requestRef
            .where("userId", "==", session.user.id)
            .where("status", "==", "pending")
            .get();

        if (!existingQuery.empty) {
            return c.json({ error: "Request already pending" }, 409);
        }

        await requestRef.add({
            userId: session.user.id,
            userName: session.user.name,
            userEmail: session.user.email,
            teamId,
            leagueId,
            status: "pending",
            requestedAt: FieldValue.serverTimestamp(),
        });
        return c.json({ success: true, status: "pending" });
    } else {
        return c.json({ error: "Team is invite only" }, 403);
    }
});

// Update Team Member Profile (Join Wizard)
app.post("/team/profile", async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
        return c.json({ error: "Unauthorized" }, 401);
    }

    const { leagueId, teamId, jerseyNumber, position, height, weight, yearOfBirth, preferredHand } = await c.req.json();
    if (!leagueId || !teamId || !jerseyNumber || !position) {
        return c.json({ error: "League ID, Team ID, Jersey Number, and Position are required" }, 400);
    }

    const teamRef = db.collection("organizations").doc(leagueId).collection("teams").doc(teamId);
    const memberRef = teamRef.collection("members").doc(session.user.id);
    const memberSnap = await memberRef.get();

    if (!memberSnap.exists) {
        return c.json({ error: "Not a team member" }, 403);
    }

    // Check jersey number uniqueness
    const existingJersey = await teamRef.collection("members")
        .where("playerData.jerseyNumber", "==", jerseyNumber)
        .get();

    if (!existingJersey.empty && existingJersey.docs[0] && existingJersey.docs[0].id !== session.user.id) {
        return c.json({ error: "Jersey number already taken" }, 409);
    }

    await memberRef.update({
        playerData: {
            jerseyNumber,
            position,
            height: height || null,
            weight: weight || null,
            yearOfBirth: yearOfBirth || null,
            preferredHand: preferredHand || null,
        },
        updatedAt: FieldValue.serverTimestamp(),
    });

    return c.json({ success: true });
});

export default app;
