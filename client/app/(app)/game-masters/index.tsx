import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  View,
  Platform,
} from "react-native";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  useGameMasterAuth,
  type GameMasterRole,
  canUserManageGameMasters,
} from "@/lib/gameMasterAuth";
import { Icon } from "@/components/ui/icon";
import { TrashIcon, ShieldIcon } from "lucide-react-native";

type GameMaster = {
  id: string;
  email?: string;
  role: GameMasterRole;
  createdAt: any;
};

export default function GameMastersScreen() {
  const router = useRouter();
  const { user, role, loading: authLoading } = useGameMasterAuth();
  const [gameMasters, setGameMasters] = useState<GameMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!canUserManageGameMasters(role)) {
      router.replace("/dashboard");
      return;
    }

    fetchGameMasters();
  }, [authLoading, role]);

  const fetchGameMasters = async () => {
    try {
      const q = query(collection(db, "gameMasters"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as GameMaster[];
      console.log(data)
      setGameMasters(data);
    } catch (error) {
      console.error("Error fetching game masters:", error);
      Alert.alert("Error", "Failed to fetch game masters.");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (id: string, newRole: GameMasterRole) => {
    setActionPending(id);
    try {
      await updateDoc(doc(db, "gameMasters", id), { role: newRole });
      setGameMasters((prev) =>
        prev.map((gm) => (gm.id === id ? { ...gm, role: newRole } : gm)),
      );
    } catch (error) {
      console.error("Error updating role:", error);
      Alert.alert("Error", "Failed to update role.");
    } finally {
      setActionPending(null);
    }
  };

  const handleRemove = async (id: string) => {
    if (Platform.OS === "web") {
      if (!window.confirm("Are you sure you want to remove this Game Master?")) {
        return;
      }
    } else {
      // Native alert not implemented for simplicity in this example
    }

    setActionPending(id);
    try {
      await deleteDoc(doc(db, "gameMasters", id));
      setGameMasters((prev) => prev.filter((gm) => gm.id !== id));
    } catch (error) {
      console.error("Error removing game master:", error);
      Alert.alert("Error", "Failed to remove game master.");
    } finally {
      setActionPending(null);
    }
  };

  if (authLoading || loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Game Masters",
          headerBackTitle: "Dashboard",
        }}
      />
      <ScrollView className="flex-1 bg-background px-4 py-6">
        <View className="mx-auto w-full max-w-4xl gap-6">
          <View className="gap-1">
            <Text className="text-2xl font-bold text-foreground">
              Manage Game Masters
            </Text>
            <Text variant="small" className="text-muted-foreground">
              View and manage permissions for all game masters.
            </Text>
          </View>

          <View className="gap-4">
            {gameMasters.map((gm) => (
              <View
                key={gm.id}
                className="flex-col gap-4 rounded-xl border border-border bg-card p-4 md:flex-row md:items-center md:justify-between"
              >
                <View className="gap-1">
                  <Text className="font-semibold text-foreground">
                    {gm.email || `UID: ${gm.id}`}
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <Icon as={ShieldIcon} size={14} className="text-muted-foreground" />
                    <Text variant="small" className="text-muted-foreground capitalize">
                      {gm.role || "admin"}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center gap-2">
                  {gm.id === user?.uid ? (
                    <Text variant="small" className="text-muted-foreground italic px-3">
                      (You)
                    </Text>
                  ) : (
                    <>
                      <View className="flex-row rounded-md border border-border bg-background overflow-hidden">
                        {(["scorer", "admin", "super_admin"] as const).map((r) => (
                          <Button
                            key={r}
                            variant={gm.role === r ? "secondary" : "ghost"}
                            className={`h-8 px-3 rounded-none ${gm.role === r ? "bg-primary/10" : ""}`}
                            disabled={!!actionPending}
                            onPress={() => handleRoleChange(gm.id, r)}
                          >
                            <Text
                              variant="small"
                              className={gm.role === r ? "text-primary font-bold" : "text-muted-foreground"}
                            >
                              {r === "super_admin" ? "Super" : r.charAt(0).toUpperCase() + r.slice(1)}
                            </Text>
                          </Button>
                        ))}
                      </View>

                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        disabled={!!actionPending}
                        onPress={() => handleRemove(gm.id)}
                      >
                        <Icon as={TrashIcon} size={16} />
                      </Button>
                    </>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </>
  );
}
