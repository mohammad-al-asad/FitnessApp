import { TranslationKey } from "@/constants/translations";
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
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useIAP } from "react-native-iap";
import { SafeAreaView } from "react-native-safe-area-context";

// Updated Product IDs from App Store Connect
// On Android, we only query the main Subscription ID (which contains multiple base plans).
// On iOS, we still query both individual SKUs as separate products.
const ANDROID_MAIN_SUB_ID = "com.fitco.subscription.monthly";

const IAP_SKUS =
  Platform.select({
    ios: ["com.fitco.subscription.monthly", "com.fitco.subscription.yearly"],
    android: [ANDROID_MAIN_SUB_ID],
  }) || [];

const UpgradePlanScreen = () => {
  const { t, isRTL } = useLanguage();
  const colors = useSafeColors();
  const router = useRouter();
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
  const [couponText, setCouponText] = useState("");
  const [appliedOfferCode, setAppliedOfferCode] = useState("");

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
    }
  }, [connected, fetchProducts]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Removed old useEffects for purchase handling as they are now handled in useIAP callbacks

  const selectedPlan =
    plans.find((p) => p.planType === selectedPeriod) ?? plans[0];

  const nativeStoreProduct = useMemo(() => {
    if (!selectedPlan) return null;

    if (Platform.OS === "ios") {
      const sku = selectedPlan.apple_sku;
      return subscriptions.find(
        (s: any) => s.productId === sku || s.id === sku,
      );
    } else {
      // For Android, find the main subscription product first
      const mainSub = subscriptions.find(
        (s: any) =>
          s.productId === ANDROID_MAIN_SUB_ID || s.id === ANDROID_MAIN_SUB_ID,
      );

      // Search for offers inside the subscription
      const subAsAny = mainSub as any;
      if (mainSub && subAsAny.subscriptionOffers) {
        const targetBasePlanId = selectedPlan.google_sku;
        const offers = subAsAny.subscriptionOffers as any[];

        // 1. Attempt to find matching offer code if one is applied
        let specificOffer = null;
        if (appliedOfferCode) {
          specificOffer = offers.find(
            (offer) =>
              offer.basePlanId === targetBasePlanId &&
              offer.offerId === appliedOfferCode,
          );
        }

        // 2. Fall back to standard offer (null/empty offerId) if no match or no code
        if (!specificOffer) {
          specificOffer = offers.find(
            (offer) => offer.basePlanId === targetBasePlanId && !offer.offerId,
          );
        }

        // 3. Last resort fallback
        if (!specificOffer) {
          specificOffer = offers.find(
            (offer) => offer.basePlanId === targetBasePlanId,
          );
        }

        const basePlanOffer = offers.find(
          (o) => o.basePlanId === targetBasePlanId && !o.offerId,
        );

        // Return a merged object so your UI and price formatting still works
        return {
          ...mainSub,
          basePlanPrice:
            basePlanOffer?.pricingPhases?.pricingPhaseList?.[0]
              ?.formattedPrice || mainSub.displayPrice,
          displayPrice:
            specificOffer?.pricingPhases?.pricingPhaseList?.[0]
              ?.formattedPrice || mainSub.displayPrice,
          offerTokenToUse: specificOffer?.offerToken,
          isDiscounted: Boolean(specificOffer?.offerId),
        } as any;
      }
      return mainSub;
    }
  }, [subscriptions, selectedPlan, appliedOfferCode]);

  const handleSubscribe = async () => {
    if (!selectedPlan || isProcessingPurchase) return;

    try {
      setIsProcessingPurchase(true);

      if (Platform.OS === "ios") {
        const sku = selectedPlan.apple_sku;
        if (!sku) throw new Error("Apple Store ID not found for this plan");

        await requestPurchase({
          request: {
            apple: { sku },
          },
          type: "subs",
        });
      } else {
        // Android logic: Request the main subscription product with the specific base plan offer token
        const targetBasePlanId = selectedPlan.google_sku;
        if (!targetBasePlanId) throw new Error("Google Base Plan ID not found");

        const offerToken = (nativeStoreProduct as any)?.offerTokenToUse;

        await requestPurchase({
          request: {
            google: {
              skus: [ANDROID_MAIN_SUB_ID],
              subscriptionOffers: offerToken
                ? [{ sku: ANDROID_MAIN_SUB_ID, offerToken }]
                : [],
            },
          },
          type: "subs",
        });
      }
    } catch (error: any) {
      Alert.alert(String(t("error")), error.message);
      setIsProcessingPurchase(false);
    }
  };

  const formatCurrency = (amount: number, currencyCode: string) => {
    // If we have a native store product, it likely has better formatting
    const nativeAsAny = nativeStoreProduct as any;
    if (nativeAsAny?.displayPrice) {
      return nativeAsAny.displayPrice;
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

  const handleApplyCoupon = () => {
    if (!couponText.trim()) return;

    // Check if the code actually exists in our available offers
    const offers = (nativeStoreProduct as any)?.subscriptionOffers as any[];
    const offerExists = offers?.some(
      (off) =>
        off.basePlanId === selectedPlan?.google_sku &&
        off.offerId === couponText.trim(),
    );

    if (offerExists) {
      setAppliedOfferCode(couponText.trim());
      Alert.alert(String(t("success")), "Coupon Applied!");
    } else {
      Alert.alert(String(t("error")), "Invalid coupon code");
    }
  };

  const isSubscribed = Boolean(subscriptionStatus?.subscribed);

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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.subtitle, { color: colors.placeholder }]}>
          {t("choosePlanSubtitle")}
        </Text>

        {isSubscribed && (
          <View
            style={[
              styles.statusCard,
              { backgroundColor: colors.surface, borderColor: colors.primary },
            ]}
          >
            <Text style={[styles.statusTitle, { color: colors.text }]}>
              {t("youAreAlreadySubscribed")}
            </Text>
            {subscriptionStatus?.activeSubscription?.expiryDate && (
              <Text
                style={[styles.statusSubtitle, { color: colors.placeholder }]}
              >
                {t("activeUntil")}{" "}
                {new Date(
                  subscriptionStatus.activeSubscription.expiryDate,
                ).toLocaleDateString()}
              </Text>
            )}
          </View>
        )}

        <View style={[styles.toggleContainer, { backgroundColor: "#1A1A1A" }]}>
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
                {t(plan.planType as TranslationKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedPlan && (
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
              {t("premium")}
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
                <Text style={styles.periodText}>
                  {selectedPlan.interval === "month"
                    ? t("perMonthly")
                    : t("perYearly")}
                </Text>
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
                <Ionicons name="checkmark" size={18} color={colors.primary} />
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

            <TouchableOpacity
              style={[styles.innerButton, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.innerButtonText}>
                {t("choosePremiumPlus")}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Coupon Section */}
        <View style={styles.couponSection}>
          <Text style={[styles.couponTitle, { color: colors.text }]}>
            {t("haveACoupon")}
          </Text>
          <View style={styles.couponInputWrapper}>
            <TextInput
              style={[
                styles.couponInput,
                {
                  backgroundColor: "#1A1A1A",
                  color: colors.text,
                  borderColor: colors.surface,
                },
              ]}
              placeholder={String(t("enterCouponCode"))}
              placeholderTextColor={colors.placeholder}
              value={couponText}
              onChangeText={setCouponText}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.applyButton, { backgroundColor: colors.primary }]}
              onPress={handleApplyCoupon}
            >
              <Text style={styles.applyButtonText}>{t("apply")}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: "#1A1A1A" }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.placeholder }]}>
              {t("originalPrice")}
            </Text>
            <Text style={[styles.summaryValue, { color: colors.placeholder }]}>
              {nativeStoreProduct?.basePlanPrice ||
                formatCurrency(
                  selectedPlan?.price || 0,
                  selectedPlan?.currency || "USD",
                )}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.text }]}>
              {t("total")}
            </Text>
            <Text
              style={[
                styles.summaryValue,
                { color: colors.primary, fontWeight: "bold" },
              ]}
            >
              {formatCurrency(
                selectedPlan?.price || 0,
                selectedPlan?.currency || "USD",
              )}
            </Text>
          </View>
        </View>

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
          {t("iapTermsNote")}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { justifyContent: "center", alignItems: "center" },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  backButton: { position: "absolute", left: 20, zIndex: 10 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    opacity: 0.8,
  },
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
    marginBottom: 32,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
  },
  toggleText: { fontWeight: "600" },
  planCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    marginBottom: 32,
  },
  planTitle: { fontSize: 22, fontWeight: "bold", marginBottom: 4 },
  planSubtitle: { fontSize: 14, marginBottom: 24 },
  priceContainer: { alignItems: "baseline", marginBottom: 24 },
  price: { fontSize: 32, fontWeight: "bold" },
  periodText: { fontSize: 16, fontWeight: "normal", opacity: 0.6 },
  featureItem: { alignItems: "center", marginBottom: 16 },
  featureText: { fontSize: 14, opacity: 0.9 },
  innerButton: {
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  innerButtonText: { color: "#000", fontWeight: "bold", fontSize: 16 },
  couponSection: { marginBottom: 24 },
  couponTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 16 },
  couponInputWrapper: { flexDirection: "row", alignItems: "center" },
  couponInput: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 1,
  },
  applyButton: {
    marginLeft: 12,
    paddingHorizontal: 24,
    height: 54,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  applyButtonText: { color: "#000", fontWeight: "bold", fontSize: 16 },
  summaryCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 32,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 4,
  },
  summaryLabel: { fontSize: 15 },
  summaryValue: { fontSize: 16 },
  divider: {
    height: 1,
    backgroundColor: "#333",
    marginVertical: 12,
    opacity: 0.5,
  },
  subscribeButton: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonTextWhite: { color: "#000", fontWeight: "bold", fontSize: 18 },
  disabledButton: { opacity: 0.5 },
  footerNote: {
    fontSize: 12,
    textAlign: "center",
    opacity: 0.6,
    lineHeight: 18,
  },
});

export default UpgradePlanScreen;
