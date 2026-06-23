import { useAuth } from "@/hooks/auth-context";
import { Redirect } from "expo-router";

export default function IndexRoute() {
  const { user, isInitialized } = useAuth();

  if (!isInitialized) {
    return null;
  }

  return (
    <Redirect href={user ? "/(tabs)/home" : "/(auth)/auth"} />
  );
}
