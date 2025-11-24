"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runGameAutoComplete = exports.onGameWrite = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const tasks_1 = require("@google-cloud/tasks");
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();
const tasksClient = new tasks_1.CloudTasksClient();
const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
const LOCATION = process.env.FUNCTIONS_REGION || "asia-southeast1";
const REGION = LOCATION;
const QUEUE_ID = "game-auto-complete-queue";
const computeEndTimeMs = (data) => {
    const rawDateTime = data.dateTime;
    if (!rawDateTime)
        return null;
    let start;
    if (rawDateTime instanceof admin.firestore.Timestamp) {
        start = rawDateTime.toDate();
    }
    else if (typeof rawDateTime === "string") {
        const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(rawDateTime);
        const normalized = hasZone ? rawDateTime : `${rawDateTime}+08:00`;
        start = new Date(normalized);
    }
    else {
        start = new Date(rawDateTime);
    }
    const startMs = start.getTime();
    if (!Number.isFinite(startMs))
        return null;
    const hoursRaw = data.hours;
    const hours = typeof hoursRaw === "number" ? hoursRaw : Number(hoursRaw);
    if (!Number.isFinite(hours) || hours <= 0)
        return null;
    return startMs + hours * 60 * 60 * 1000;
};
exports.onGameWrite = functions.region(REGION).firestore
    .document("games/{gameId}")
    .onWrite(async (change, context) => {
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;
    if (!after) {
        return;
    }
    const afterStatus = after.status;
    if (before) {
        const beforeStatus = before.status;
        if (beforeStatus === "scheduled" && afterStatus !== "scheduled" && PROJECT_ID) {
            const taskName = tasksClient.taskPath(PROJECT_ID, LOCATION, QUEUE_ID, `game-${context.params.gameId}`);
            try {
                await tasksClient.deleteTask({ name: taskName });
            }
            catch (err) {
                if (err?.code !== 5) {
                    console.warn("Failed to delete task when game left scheduled state", err);
                }
            }
        }
    }
    if (afterStatus !== "scheduled") {
        return;
    }
    const endMs = computeEndTimeMs(after);
    if (!endMs) {
        return;
    }
    const nowMs = Date.now();
    const gameRef = change.after.ref;
    if (endMs <= nowMs) {
        await gameRef.update({
            status: "completed",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        if (PROJECT_ID) {
            const taskName = tasksClient.taskPath(PROJECT_ID, LOCATION, QUEUE_ID, `game-${context.params.gameId}`);
            try {
                await tasksClient.deleteTask({ name: taskName });
            }
            catch (err) {
                if (err?.code !== 5) {
                    console.warn("Failed to delete existing task", err);
                }
            }
        }
        return;
    }
    if (!PROJECT_ID) {
        console.warn("Missing GCLOUD_PROJECT/GCP_PROJECT; cannot schedule Cloud Task");
        return;
    }
    const parent = tasksClient.queuePath(PROJECT_ID, LOCATION, QUEUE_ID);
    const url = `https://${LOCATION}-${PROJECT_ID}.cloudfunctions.net/runGameAutoComplete`;
    const payload = {
        gameId: context.params.gameId,
    };
    const taskName = tasksClient.taskPath(PROJECT_ID, LOCATION, QUEUE_ID, `game-${context.params.gameId}`);
    try {
        await tasksClient.deleteTask({ name: taskName });
    }
    catch (err) {
        if (err?.code !== 5) {
            console.warn("Failed to delete existing task before rescheduling", err);
        }
    }
    const task = {
        name: taskName,
        httpRequest: {
            httpMethod: "POST",
            url,
            headers: {
                "Content-Type": "application/json",
            },
            body: Buffer.from(JSON.stringify(payload)).toString("base64"),
        },
        scheduleTime: {
            seconds: Math.floor(endMs / 1000),
        },
    };
    await tasksClient.createTask({ parent, task });
});
exports.runGameAutoComplete = functions.region(REGION).https.onRequest(async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).send("Method not allowed");
        return;
    }
    const { gameId } = req.body || {};
    if (!gameId) {
        res.status(400).send("Missing gameId");
        return;
    }
    try {
        const gameRef = db.collection("games").doc(gameId);
        const snap = await gameRef.get();
        if (!snap.exists) {
            res.status(404).send("Game not found");
            return;
        }
        const data = snap.data();
        const status = data.status;
        if (status !== "scheduled") {
            res.status(200).send("Game is not scheduled; nothing to do");
            return;
        }
        const endMs = computeEndTimeMs(data);
        const nowMs = Date.now();
        if (!endMs || endMs > nowMs) {
            res.status(200).send("Game has not ended yet; nothing to do");
            return;
        }
        await gameRef.update({
            status: "completed",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.status(200).send("Game marked as completed");
    }
    catch (err) {
        console.error(err);
        res.status(500).send("Internal error");
    }
});
//# sourceMappingURL=index.js.map