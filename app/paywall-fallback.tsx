import { useAuth } from "@/hooks/auth-context";
import { useSafeColors } from "@/hooks/language-context";
import {
  SUPERWALL_PAYWALL_PLACEMENT,
  getPaywallParams,
  getReferralCodeStatus,
} from "@/services/superwall-flow";
import { subscribeToRevenueCatSync } from "@/services/subscription-sync-events";
import { Ionicons } from "@expo/vector-icons";
import { usePlacement } from "expo-superwall";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Purchases from "react-native-purchases";

const firstParamValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const getErrorMessage = (value: string | string[] | undefined) => {
  const message = firstParamValue(value)?.trim();
  return (
    message ||
    "Superwall could not be configured, so the subscription paywall could not be presented."
  );
};

const isSubscribedUser = (user: ReturnType<typeof useAuth>["user"]) => {
  const status = String(user?.subscriptionStatus ?? "").toLowerCase();
  return Boolean(user?.isSubscribed || status === "active" || status === "premium");
};

export default function PaywallFallbackScreen() {
  const colors = useSafeColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ paywallError?: string }>();
  const { user, syncSubscription } = useAuth();
  const [errorMessage, setErrorMessage] = useState(
    getErrorMessage(params.paywallError),
  );
  const [isRetrying, setIsRetrying] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const { registerPlacement } = usePlacement({
    onPresent: () => {
      console.log("[Superwall] Paywall presented on fallback screen.");
    },
    onDismiss: () => {
      console.log("[Superwall] Paywall dismissed on fallback screen.");
    },
    onError: (error) => {
      console.error("[Superwall] Fallback screen paywall error:", error);
      setErrorMessage(
        String(
          (error as any)?.message ||
            error ||
            "The subscription paywall could not be presented.",
        ),
      );
    },
  });

  const title = useMemo(
    () =>
      isSubscribedUser(user)
        ? "Subscription Active"
        : "Subscription Paywall Unavailable",
    [user],
  );

  useEffect(() => {
    const nextError = firstParamValue(params.paywallError);
    if (nextError) {
      setErrorMessage(getErrorMessage(nextError));
    }
  }, [params.paywallError]);

  useEffect(() => {
    if (isSubscribedUser(user)) {
      router.replace("/(tabs)/home" as any);
    }
  }, [router, user]);

  useEffect(() => {
    const unsubscribe = subscribeToRevenueCatSync((event) => {
      if (event.type !== "completed") return;

      const isSubscribed =
        event.response.user?.isSubscribed === true ||
        event.response.normalized?.isActive === true ||
        event.response.subscription?.isActive === true;

      if (isSubscribed) {
        router.replace("/(tabs)/home" as any);
      }
    });

    return unsubscribe;
  }, [router]);

  const handleRetryPaywall = useCallback(async () => {
    try {
      setIsRetrying(true);
      const referralCodeStatus = await getReferralCodeStatus();
      await registerPlacement({
        placement: SUPERWALL_PAYWALL_PLACEMENT,
        params: getPaywallParams(referralCodeStatus),
      });
    } catch (error: any) {
      const message =
        error?.message ||
        "The subscription paywall could not be presented. Please try again.";
      console.error("[Superwall] Fallback screen retry failed:", error);
      setErrorMessage(message);
    } finally {
      setIsRetrying(false);
    }
  }, [registerPlacement]);

  const handleRestorePurchases = useCallback(async () => {
    try {
      setIsRestoring(true);
      await Purchases.restorePurchases();
      const isSubscribed = await syncSubscription("paywall-fallback:restore");

      if (isSubscribed) {
        router.replace("/(tabs)/home" as any);
        return;
      }

      setErrorMessage(
        "No active subscription was found for this Apple ID. Please try subscribing again or contact support.",
      );
    } catch (error: any) {
      const message =
        error?.message ||
        "Purchases could not be restored. Please try again or contact support.";
      console.error("[Superwall] Fallback screen restore failed:", error);
      setErrorMessage(message);
    } finally {
      setIsRestoring(false);
    }
  }, [router, syncSubscription]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconShell}>
          <Ionicons name="warning" size={34} color="#D32F2F" />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.body, { color: colors.placeholder }]}>
          We could not open the subscription paywall. Your account is signed in,
          but premium access is still locked until a subscription is confirmed.
        </Text>

        <View style={styles.errorCard}>
          <Text style={styles.errorLabel}>Error details</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={isRetrying || isRestoring}
          onPress={handleRetryPaywall}
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
        >
          {isRetrying ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.primaryButtonText}>Try Again</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={isRetrying || isRestoring}
          onPress={handleRestorePurchases}
          style={[
            styles.secondaryButton,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          {isRestoring ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
              Restore Purchases
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  iconShell: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(211, 47, 47, 0.12)",
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    marginBottom: 18,
    width: 56,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 10,
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 22,
    textAlign: "center",
  },
  errorCard: {
    backgroundColor: "rgba(211, 47, 47, 0.08)",
    borderColor: "#D32F2F",
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 22,
    padding: 16,
  },
  errorLabel: {
    color: "#D32F2F",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
  },
  errorText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 12,
    justifyContent: "center",
    minHeight: 52,
  },
  primaryButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 52,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "800",
  },
});
