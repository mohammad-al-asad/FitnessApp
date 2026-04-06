import { useLanguage, useSafeColors } from "@/hooks/language-context";
import {
  backendGetMySubscriptionStatus,
  backendGetSubscriptionPlans,
  backendVerifyApplePurchase,
  backendVerifyGooglePurchase,
  type MySubscriptionStatus,
  type SubscriptionPlan,
} from "@/services/backend-auth";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useIAP } from "react-native-iap";
import { SafeAreaView } from "react-native-safe-area-context";

// Updated Product IDs from App Store Connect
const IAP_SKUS =
  Platform.select({
    ios: ["com.fitco.subscription.monthly", "com.fitco.subscription.yearly"],
    android: [
      "com.fitco.subscription.monthly",
      "com.fitco.subscription.yearly",
    ],
  }) || [];

const UpgradePlanScreen = () => {
  const { t, isRTL } = useLanguage();
  const colors = useSafeColors();
  const {
    connected,
    subscriptions,
    fetchProducts,
    requestPurchase,
    finishTransaction,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      try {
        setIsProcessingPurchase(true);
        if (Platform.OS === "ios") {
          await backendVerifyApplePurchase({
            transactionId: purchase.transactionId || "",
          });
        } else {
          await backendVerifyGooglePurchase({
            purchaseToken: purchase.purchaseToken!,
          });
        }

        await finishTransaction({ purchase, isConsumable: false });
        Alert.alert(String(t("success")), String(t("subscriptionActivated")));
        loadInitialData();
      } catch (error: any) {
        Alert.alert(
          String(t("error")),
          error.message || "Failed to verify purchase",
        );
      } finally {
        setIsProcessingPurchase(false);
      }
    },
    onPurchaseError: (error) => {
      Alert.alert(String(t("error")), error.message);
      setIsProcessingPurchase(false);
    },
  });

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<MySubscriptionStatus | null>(null);
  const [isLoadingSubscriptionStatus, setIsLoadingSubscriptionStatus] =
    useState(true);

  const features = useMemo(
    () => [
      t("featureBarcode"),
      t("featureChat"),
      t("featureSupport"),
      t("featureEarlyAccess"),
    ],
    [t],
  );

  const loadInitialData = useCallback(async () => {
    try {
      setIsLoadingPlans(true);
      setIsLoadingSubscriptionStatus(true);

      const [plansResult, statusResult] = await Promise.allSettled([
        backendGetSubscriptionPlans(),
        backendGetMySubscriptionStatus(),
      ]);

      if (plansResult.status === "fulfilled") {
        setPlans(plansResult.value);
      }
      if (statusResult.status === "fulfilled") {
        setSubscriptionStatus(statusResult.value);
      }

      if (connected) {
        await fetchProducts({ skus: IAP_SKUS, type: "subs" });
      }
    } catch (err) {
      console.error("Error loading IAP data:", err);
    } finally {
      setIsLoadingPlans(false);
      setIsLoadingSubscriptionStatus(false);
    }
  }, [connected, fetchProducts]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Removed old useEffects for purchase handling as they are now handled in useIAP callbacks

  const selectedPlan =
    plans.find((p) => p.planType === selectedPeriod) ?? plans[0];

  const nativeStoreProduct = useMemo(() => {
    const sku =
      Platform.OS === "ios"
        ? selectedPlan?.apple_sku
        : selectedPlan?.google_sku;
    return subscriptions.find((s) => s.id === sku);
  }, [subscriptions, selectedPlan]);

  const handleSubscribe = async () => {
    if (!selectedPlan || isProcessingPurchase) return;

    try {
      setIsProcessingPurchase(true);
      const sku =
        Platform.OS === "ios"
          ? selectedPlan.apple_sku
          : selectedPlan.google_sku;

      if (!sku) {
        throw new Error("Store ID not found for this plan");
      }

      const offerToken =
        nativeStoreProduct?.subscriptionOffers?.[0]?.offerTokenAndroid;

      await requestPurchase({
        request:
          Platform.OS === "ios"
            ? { apple: { sku } }
            : {
                google: {
                  skus: [sku],
                  subscriptionOffers: offerToken ? [{ sku, offerToken }] : [],
                },
              },
        type: "subs",
      });
    } catch (error: any) {
      Alert.alert(String(t("error")), error.message);
      setIsProcessingPurchase(false);
    }
  };

  const formatCurrency = (amount: number, currencyCode: string) => {
    if (nativeStoreProduct) {
      return nativeStoreProduct.displayPrice;
    }
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currencyCode.toUpperCase(),
      }).format(amount);
    } catch {
      return `${currencyCode.toUpperCase()} ${amount}`;
    }
  };

  const isSubscribed = Boolean(subscriptionStatus?.subscribed);
  const activeSubscription = subscriptionStatus?.activeSubscription;

  if (isLoadingPlans && !connected) {
    return (
      <View
        style={[
          styles.container,
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.scrollContent}>
        {isSubscribed && (
          <View
            style={[
              styles.statusCard,
              { backgroundColor: colors.surface, borderColor: colors.primary },
            ]}
          >
            <Text
              style={[
                styles.statusTitle,
                { color: colors.text, textAlign: isRTL ? "right" : "left" },
              ]}
            >
              {t("youAreAlreadySubscribed")}
            </Text>
            {activeSubscription?.expiryDate && (
              <Text
                style={[
                  styles.statusSubtitle,
                  {
                    color: colors.placeholder,
                    textAlign: isRTL ? "right" : "left",
                  },
                ]}
              >
                {t("activeUntil")}{" "}
                {new Date(activeSubscription.expiryDate).toLocaleDateString()}
              </Text>
            )}
          </View>
        )}

        <View
          style={[styles.toggleContainer, { backgroundColor: colors.surface }]}
        >
          {plans.map((plan) => (
            <TouchableOpacity
              key={plan.planType}
              style={[
                styles.toggleButton,
                selectedPeriod === plan.planType && {
                  backgroundColor: colors.primary,
                },
                isSubscribed && styles.disabledButton,
              ]}
              onPress={() => setSelectedPeriod(plan.planType)}
              disabled={isSubscribed}
            >
              <Text
                style={[
                  styles.toggleText,
                  { color: selectedPeriod === plan.planType ? "#000" : "#fff" },
                ]}
              >
                {t(plan.planType as any) || plan.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedPlan && (
          <View style={styles.glowWrapper}>
            <View
              style={[
                styles.glowLayer,
                {
                  shadowColor: colors.primary,
                  backgroundColor: colors.primary,
                },
              ]}
            />
            <View
              style={[
                styles.planCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.planTitle,
                  { color: colors.text, textAlign: isRTL ? "right" : "left" },
                ]}
              >
                {t("subscription")}
              </Text>
              <Text
                style={[
                  styles.planSubtitle,
                  {
                    color: colors.placeholder,
                    textAlign: isRTL ? "right" : "left",
                  },
                ]}
              >
                {t("premiumSubtitle")}
              </Text>

              <View
                style={[
                  styles.priceContainer,
                  { flexDirection: isRTL ? "row-reverse" : "row" },
                ]}
              >
                <Text style={[styles.price, { color: colors.text }]}>
                  {formatCurrency(selectedPlan.price, selectedPlan.currency)}
                </Text>
                <Text style={[styles.period, { color: colors.placeholder }]}>
                  {selectedPlan.interval === "month"
                    ? t("perMonthly")
                    : t("perYearly")}
                </Text>
              </View>

              {features.map((f, i) => (
                <View
                  key={i}
                  style={[
                    styles.featureItem,
                    { flexDirection: isRTL ? "row-reverse" : "row" },
                  ]}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.primary}
                  />
                  <Text
                    style={[
                      styles.featureText,
                      {
                        color: colors.text,
                        marginLeft: isRTL ? 0 : 12,
                        marginRight: isRTL ? 12 : 0,
                      },
                    ]}
                  >
                    {f}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity
          disabled={isProcessingPurchase || isSubscribed}
          style={[
            styles.subscribeButton,
            { backgroundColor: colors.primary },
            (isProcessingPurchase || isSubscribed) && styles.disabledButton,
          ]}
          onPress={handleSubscribe}
        >
          {isProcessingPurchase ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.buttonTextWhite}>
              {isSubscribed ? t("alreadySubscribed") : t("subscribeNow")}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.footerNote, { color: colors.placeholder }]}>
          {t("iapTermsNote") ||
            "Payments will be charged to your store account at confirmation of purchase. Subscription automatically renews unless auto-renew is turned off."}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { justifyContent: "center", alignItems: "center" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  statusCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  statusTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  statusSubtitle: { fontSize: 14 },
  toggleContainer: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
  },
  toggleText: { fontWeight: "600" },
  glowWrapper: { position: "relative", marginBottom: 28 },
  glowLayer: {
    position: "absolute",
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 28,
    opacity: 0.15,
    shadowRadius: 24,
    elevation: 20,
  },
  planCard: { borderRadius: 20, padding: 24, borderWidth: 2 },
  planTitle: { fontSize: 24, fontWeight: "bold", marginBottom: 4 },
  planSubtitle: { fontSize: 15, marginBottom: 20 },
  priceContainer: { alignItems: "baseline", marginBottom: 20 },
  price: { fontSize: 36, fontWeight: "bold" },
  period: { fontSize: 16, marginLeft: 4 },
  featureItem: { alignItems: "center", marginBottom: 14 },
  featureText: { fontSize: 15 },
  subscribeButton: {
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonTextWhite: { color: "#000", fontWeight: "bold", fontSize: 18 },
  disabledButton: { opacity: 0.5 },
  footerNote: {
    fontSize: 12,
    textAlign: "center",
    opacity: 0.8,
    marginBottom: 40,
  },
});

export default UpgradePlanScreen;
