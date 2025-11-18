import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type UserRole = "player" | "game-master" | "admin";

/**
 * Get user's roles from Firestore
 */
export async function getUserRoles(userId: string): Promise<UserRole[]> {
  try {
    const userDoc = await getDoc(doc(db, "playerProfiles", userId));

    if (!userDoc.exists()) {
      return ["player"]; // Default role
    }

    const userData = userDoc.data();
    return (userData?.roles as UserRole[]) ?? ["player"];
  } catch (error) {
    console.error("Error fetching user roles:", error);
    return ["player"];
  }
}

/**
 * Check if user has game-master role
 */
export async function canUpdateStats(userId: string): Promise<boolean> {
  const roles = await getUserRoles(userId);
  return roles.includes("game-master") || roles.includes("admin");
}

/**
 * Check if user has a specific role
 */
export async function hasRole(
  userId: string,
  role: UserRole,
): Promise<boolean> {
  const roles = await getUserRoles(userId);
  return roles.includes(role);
}
