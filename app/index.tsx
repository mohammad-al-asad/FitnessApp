import { useAuth } from "@/hooks/auth-context";
import { Redirect } from "expo-router";

export default function IndexRoute() {
  const { user, isInitialized } = useAuth();

  if (!isInitialized) {
    return null;
  }

  if (!user) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <Redirect href="/(tabs)/home" />
  );
}
