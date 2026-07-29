import { useAuth } from "@/hooks/auth-context";
import { Redirect } from "expo-router";

const hasSubscriptionAccess = (user: ReturnType<typeof useAuth>["user"]) => {
  const subscriptionStatus = String(user?.subscriptionStatus ?? "").toLowerCase();

  return Boolean(
    user?.isSubscribed ||
      subscriptionStatus === "active" ||
      subscriptionStatus === "premium",
  );
};

export default function IndexRoute() {
  const { user, isInitialized } = useAuth();

  if (!isInitialized) {
    return null;
  }

  if (!user) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (hasSubscriptionAccess(user)) {
    return <Redirect href="/(tabs)/home" />;
  }

  return null;
}
