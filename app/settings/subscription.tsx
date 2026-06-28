import {
  STATIC_SUBSCRIPTION_PLANS,
  type SubscriptionPlan,
} from "@/constants/subscriptions";
import { TranslationKey } from "@/constants/translations";
import { useAuth } from "@/hooks/auth-context";
import { useLanguage, useSafeColors } from "@/hooks/language-context";
import { usePlacement } from "expo-superwall";
import {
  backendGetMySubscriptionStatus,
  backendSyncRevenueCat,
  type MySubscriptionStatus,
} from "@/services/backend-auth";
import { ensureRevenueCatConfigured } from "@/services/revenuecat";
import {
  SUPERWALL_PAYWALL_PLACEMENT,
  getPaywallParams,
  getReferralCodeStatus,
  isSuperwallPurchasedAction,
} from "@/services/superwall-flow";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Purchases, {
  type PricingPhase,
  type PurchasesPackage,
  type SubscriptionOption,
} from "react-native-purchases";

/**
 * Formats a number as a currency string.
 * Uses a robust fallback if Intl.NumberFormat is unavailable or fails.
 */
const formatCurrency = (
  amount: number,
  currencyCode: string | null | undefined,
) => {
  const code = (currencyCode || "USD").toUpperCase();
  const safeAmount = isNaN(amount) ? 0 : amount;

  try {
    if (typeof Intl !== "undefined" && Intl.NumberFormat) {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: code,
      }).format(safeAmount);
    }
  } catch {
    // Fallback if Intl fails
  }
  return `${code} ${safeAmount.toFixed(2)}`;
};

const SkeletonBar = ({
  width = 80,
  height = 18,
}: {
  width?: number;
  height?: number;
}) => {
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius: 6,
        backgroundColor: "#404040",
        opacity: pulse,
      }}
    />
  );
};

const SubscriptionSkeleton = () => {
  const colors = useSafeColors();
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ alignItems: "center", marginBottom: 24 }}>
        <SkeletonBar width={200} height={14} />
      </View>

      <View
        style={[
          styles.toggleContainer,
          {
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={{ flex: 1, padding: 12, alignItems: "center" }}>
          <SkeletonBar width={60} height={16} />
        </View>
        <View style={{ flex: 1, padding: 12, alignItems: "center" }}>
          <SkeletonBar width={60} height={16} />
        </View>
      </View>

      <View
        style={[
          styles.planCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: 0.6,
          },
        ]}
      >
        <SkeletonBar width={100} height={24} />
        <View style={{ height: 8 }} />
        <SkeletonBar width={180} height={14} />
        <View style={{ height: 24 }} />
        <SkeletonBar width={140} height={32} />
        <View style={{ height: 24 }} />
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <SkeletonBar width={18} height={18} />
            <View style={{ width: 12 }} />
            <SkeletonBar width={150} height={14} />
          </View>
        ))}
      </View>

      <View
        style={[
          styles.summaryCard,
          {
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            opacity: 0.6,
          },
        ]}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <SkeletonBar width={100} height={16} />
          <SkeletonBar width={60} height={16} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <SkeletonBar width={80} height={20} />
          <SkeletonBar width={90} height={24} />
        </View>
      </View>

      <View
        style={{
          height: 62,
          borderRadius: 16,
          backgroundColor: colors.surface,
          opacity: 0.4,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <SkeletonBar width={140} height={20} />
      </View>
    </ScrollView>
  );
};

// Verified subscription active helper

const isVerifiedSubscriptionActive = (verifyResult: any) =>
  verifyResult?.success === true &&
  (verifyResult?.normalized?.isActive === true ||
    verifyResult?.subscription?.isActive === true);

const hasActiveRevenueCatEntitlement = (customerInfo: any) =>
  Object.keys(customerInfo?.entitlements?.active ?? {}).length > 0;

const normalizeOfferCode = (code: string) => code.trim().toLowerCase();

const getAndroidSubscriptionOptions = (
  selectedPack: PurchasesPackage | null,
) => {
  const options = selectedPack?.product.subscriptionOptions ?? [];
  const defaultOption = selectedPack?.product.defaultOption;

  if (!defaultOption) return options;

  return [
    defaultOption,
    ...options.filter((option) => option.id !== defaultOption.id),
  ];
};

const findAndroidOfferOption = (
  selectedPack: PurchasesPackage | null,
  code: string,
): SubscriptionOption | null => {
  const normalizedCode = normalizeOfferCode(code);
  if (!normalizedCode) return null;

  const options = getAndroidSubscriptionOptions(selectedPack);
  return (
    options.find((option) => {
      if (option.isBasePlan) return false;

      const id = normalizeOfferCode(option.id);
      const offerId = normalizeOfferCode(id.split(":").pop() ?? "");
      const tags = option.tags.map(normalizeOfferCode);

      return (
        id === normalizedCode ||
        id.includes(normalizedCode) ||
        offerId === normalizedCode ||
        tags.includes(normalizedCode)
      );
    }) ?? null
  );
};

const getPhasePrice = (phase: PricingPhase | null | undefined) => {
  if (!phase?.price) return null;

  return {
    amount: phase.price.amountMicros / 1_000_000,
    currencyCode: phase.price.currencyCode,
    priceString: phase.price.formatted,
  };
};

const getOfferDisplayPrice = (option: SubscriptionOption) =>
  getPhasePrice(option.freePhase) ??
  getPhasePrice(option.introPhase) ??
  getPhasePrice(option.fullPricePhase) ??
  getPhasePrice(option.pricingPhases[0]);

const getOfferBasePrice = (option: SubscriptionOption) =>
  getPhasePrice(option.fullPricePhase) ??
  getPhasePrice(option.pricingPhases[option.pricingPhases.length - 1]);

const UpgradePlanScreen = () => {
  const { t, isRTL } = useLanguage();
  const { user, syncSubscription } = useAuth();
  const colors = useSafeColors();
  const router = useRouter();

  const handleSuperwallPurchased = useCallback(async () => {
    const isSubscribed = await syncSubscription();
    if (isSubscribed) {
      router.replace("/(tabs)/home" as any);
    }
  }, [router, syncSubscription]);

  const { registerPlacement } = usePlacement({
    onPresent: () => {
      console.log("[Superwall] Paywall presented on subscription screen.");
    },
    onDismiss: () => {
      console.log("[Superwall] Paywall dismissed on subscription screen.");
    },
    onCustomCallback: async (callback) => {
      if (isSuperwallPurchasedAction(callback.name)) {
        await handleSuperwallPurchased();
      }
      return { status: "success" };
    },
  });

  const handleSubscribeNow = useCallback(async () => {
    const referralCodeStatus = await getReferralCodeStatus();
    await registerPlacement({
      placement: SUPERWALL_PAYWALL_PLACEMENT,
      params: getPaywallParams(referralCodeStatus),
    });
  }, [registerPlacement]);

  const [connected, setConnected] = useState(false);
  const [monthlyPackage, setMonthlyPackage] = useState<any>(null);
  const [yearlyPackage, setYearlyPackage] = useState<any>(null);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<MySubscriptionStatus | null>(null);

  const loadInitialData = useCallback(async () => {
    try {
      setIsLoadingPlans(true);

      const statusResult = await backendGetMySubscriptionStatus();
      setSubscriptionStatus(statusResult);

      await ensureRevenueCatConfigured(user?.uid);
      const offerings = await Purchases.getOfferings();
      if (offerings.current) {
        setConnected(true);
        if (offerings.current.monthly) {
          setMonthlyPackage(offerings.current.monthly);
        }
        if (offerings.current.annual) {
          setYearlyPackage(offerings.current.annual);
        }
      }
    } catch (err) {
      console.error("Error loading RevenueCat offerings:", err);
    } finally {
      setIsLoadingPlans(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleUpgradeToYearly = async () => {
    if (!yearlyPackage || isProcessingPurchase) {
      Alert.alert(String(t("error")), "Yearly plan is currently not available. Please try again later.");
      return;
    }

    try {
      setIsProcessingPurchase(true);
      await ensureRevenueCatConfigured(user?.uid);
      await Purchases.purchasePackage(yearlyPackage);
      const isSubscribedLocally = await syncSubscription();
      if (isSubscribedLocally) {
        Alert.alert(String(t("success")), "Successfully upgraded to the Yearly Plan!");
        await loadInitialData();
      } else {
        throw new Error("Upgrade verification failed.");
      }
    } catch (error: any) {
      if (!error.userCancelled) {
        Alert.alert(
          String(t("error")),
          error.message || "Failed to upgrade subscription",
        );
      }
    } finally {
      setIsProcessingPurchase(false);
    }
  };

  const handleRestore = async () => {
    try {
      setIsProcessingPurchase(true);
      await ensureRevenueCatConfigured(user?.uid);
      let customerInfo = await Purchases.restorePurchases();
      let isEntitled = hasActiveRevenueCatEntitlement(customerInfo);

      if (!isEntitled && Platform.OS === "ios") {
        const syncResult = await Purchases.syncPurchasesForResult();
        customerInfo = syncResult.customerInfo;
        isEntitled = hasActiveRevenueCatEntitlement(customerInfo);
      }

      if (!isEntitled) {
        Alert.alert(
          String(t("error")),
          String(t("no_active_subscription_found")),
        );
        return;
      }

      const isSubscribedLocally = await syncSubscription();

      if (isSubscribedLocally) {
        Alert.alert(String(t("success")), String(t("subscription_restored")));
        await loadInitialData();
      } else {
        Alert.alert(String(t("error")), String(t("failed_to_restore")));
      }
    } catch (error: any) {
      Alert.alert(
        String(t("error")),
        error.message || "Failed to restore purchases",
      );
    } finally {
      setIsProcessingPurchase(false);
    }
  };

  const isSubscribed = Boolean(subscriptionStatus?.subscribed);
  const activeSub = subscriptionStatus?.activeSubscription;
  const showInitialSkeleton = isLoadingPlans && !subscriptionStatus;

  if (showInitialSkeleton) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SubscriptionSkeleton />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Title */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t("subscription") || "Subscription"}
          </Text>
        </View>

        {isSubscribed && activeSub ? (
          <>
            {/* Active Subscription Card */}
            <View style={[styles.statusCard, { borderColor: colors.primary }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                <Text style={[styles.statusTitle, { color: colors.text }]}>
                  Active Premium Member
                </Text>
              </View>

              <View style={styles.statusDivider} />

              <View style={styles.statusRow}>
                <Text style={[styles.statusLabel, { color: colors.placeholder }]}>Plan Type</Text>
                <Text style={[styles.statusValue, { color: colors.text }]}>
                  {activeSub.planType === "monthly" ? "Monthly Plan" : "Yearly Plan"}
                </Text>
              </View>

              <View style={styles.statusRow}>
                <Text style={[styles.statusLabel, { color: colors.placeholder }]}>Cost</Text>
                <Text style={[styles.statusValue, { color: colors.text }]}>
                  {activeSub.planType === "monthly"
                    ? (monthlyPackage?.product?.priceString || "$9.99/mo")
                    : (yearlyPackage?.product?.priceString || "$59.99/yr")}
                </Text>
              </View>

              <View style={styles.statusRow}>
                <Text style={[styles.statusLabel, { color: colors.placeholder }]}>Renewal Date</Text>
                <Text style={[styles.statusValue, { color: colors.text }]}>
                  {activeSub.expiryDate
                    ? new Date(activeSub.expiryDate).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "N/A"}
                </Text>
              </View>

              <View style={styles.statusRow}>
                <Text style={[styles.statusLabel, { color: colors.placeholder }]}>Platform</Text>
                <Text style={[styles.statusValue, { color: colors.text, textTransform: "capitalize" }]}>
                  {activeSub.platform || "App Store/Google Play"}
                </Text>
              </View>
            </View>

            {/* Upgrade Option for Monthly Subscribers */}
            {activeSub.planType === "monthly" && (
              <View style={[styles.upgradeCard, { backgroundColor: colors.surface }]}>
                <View style={styles.badgeContainer}>
                  <View style={[styles.bestValueBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.bestValueText}>UPGRADE & SAVE 50%</Text>
                  </View>
                </View>

                <Text style={[styles.upgradeTitle, { color: colors.text }]}>
                  Switch to Yearly Plan
                </Text>
                <Text style={[styles.upgradeDesc, { color: colors.placeholder }]}>
                  Get the same premium features for a full year and save 50% compared to the monthly plan.
                </Text>

                <View style={styles.comparisonWrapper}>
                  <View style={styles.priceComparisonItem}>
                    <Text style={[styles.comparisonPlanLabel, { color: colors.placeholder }]}>Monthly</Text>
                    <Text style={[styles.comparisonPlanPrice, { color: colors.text }]}>
                      {monthlyPackage?.product?.priceString || "$9.99"}
                      <Text style={styles.priceSubText}>/mo</Text>
                    </Text>
                    <Text style={[styles.comparisonTotal, { color: colors.placeholder }]}>$119.88 / year</Text>
                  </View>

                  <Ionicons name="arrow-forward" size={24} color={colors.placeholder} style={styles.arrowIcon} />

                  <View style={[styles.priceComparisonItem, { borderColor: colors.primary, borderWidth: 1, borderRadius: 12, padding: 8 }]}>
                    <Text style={[styles.comparisonPlanLabel, { color: colors.primary, fontWeight: "700" }]}>Yearly</Text>
                    <Text style={[styles.comparisonPlanPrice, { color: colors.primary }]}>
                      {yearlyPackage?.product?.priceString || "$59.99"}
                      <Text style={[styles.priceSubText, { color: colors.primary }]}>/yr</Text>
                    </Text>
                    <Text style={[styles.comparisonTotal, { color: colors.primary }]}>Only $5.00 / month</Text>
                  </View>
                </View>

                <TouchableOpacity
                  disabled={isProcessingPurchase}
                  style={[styles.upgradeButton, { backgroundColor: colors.primary }]}
                  onPress={handleUpgradeToYearly}
                >
                  {isProcessingPurchase ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.upgradeButtonText}>Upgrade to Yearly</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          /* Unsubscribed State */
          <View style={[styles.statusCard, { borderColor: "#D32F2F" }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="alert-circle" size={24} color="#D32F2F" />
              <Text style={[styles.statusTitle, { color: "#D32F2F" }]}>
                No Active Subscription
              </Text>
            </View>
            <Text style={[styles.statusSubtitle, { color: colors.placeholder, marginTop: 8 }]}>
              You are currently on the free/inactive tier. Subscribe to unlock all features.
            </Text>

            <TouchableOpacity
              style={[styles.subscribeButton, { backgroundColor: colors.primary, marginTop: 24 }]}
              onPress={handleSubscribeNow}
            >
              <Text style={styles.buttonTextWhite}>Subscribe Now</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.transparencySection}>
          <Text style={[styles.autoRenewalNotice, { color: colors.text }]}>
            {t("autoRenewalNotice")}
          </Text>

          <TouchableOpacity
            onPress={() => {
              const url =
                Platform.OS === "ios"
                  ? "https://apps.apple.com/account/subscriptions"
                  : "https://play.google.com/store/account/subscriptions";
              Linking.openURL(url);
            }}
            style={styles.manageLink}
          >
            <Text style={[styles.manageLinkText, { color: colors.primary }]}>
              {t("manageSubscription")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRestore}
            style={styles.manageLink}
            disabled={isProcessingPurchase}
          >
            <Text style={[styles.manageLinkText, { color: colors.primary }]}>
              {t("restorePurchases")}
            </Text>
          </TouchableOpacity>

          <View style={styles.policyRow}>
            <TouchableOpacity
              onPress={() => router.push("/settings/account/privacyPolicy")}
            >
              <Text style={[styles.policyLink, { color: colors.primary }]}>
                {t("privacyPolicy")}
              </Text>
            </TouchableOpacity>
            <Text style={{ color: colors.placeholder, marginHorizontal: 8 }}>
              •
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/settings/account/termsOfServices")}
            >
              <Text style={[styles.policyLink, { color: colors.primary }]}>
                {t("termsOfUse")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 24, fontWeight: "bold" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10 },
  statusCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 20,
    marginBottom: 24,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusTitle: { fontSize: 18, fontWeight: "bold" },
  statusSubtitle: { fontSize: 15, lineHeight: 22 },
  statusDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginVertical: 16,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 6,
  },
  statusLabel: { fontSize: 15 },
  statusValue: { fontSize: 15, fontWeight: "600" },
  subscribeButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonTextWhite: { color: "#000", fontWeight: "bold", fontSize: 16 },
  upgradeCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  badgeContainer: {
    alignItems: "flex-start",
    marginBottom: 12,
  },
  bestValueBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bestValueText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  upgradeTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 6,
  },
  upgradeDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  comparisonWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  priceComparisonItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  comparisonPlanLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  comparisonPlanPrice: {
    fontSize: 22,
    fontWeight: "bold",
  },
  priceSubText: {
    fontSize: 12,
    fontWeight: "normal",
    color: "#999",
  },
  comparisonTotal: {
    fontSize: 12,
    marginTop: 4,
  },
  arrowIcon: {
    marginHorizontal: 10,
  },
  upgradeButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeButtonText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 16,
  },
  transparencySection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
  },
  autoRenewalNotice: {
    fontSize: 12,
    textAlign: "center",
    opacity: 0.8,
    marginBottom: 16,
    lineHeight: 18,
  },
  manageLink: {
    marginBottom: 16,
  },
  manageLinkText: {
    fontSize: 14,
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
  policyRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  policyLink: {
    fontSize: 12,
    fontWeight: "500",
  },
});

export default UpgradePlanScreen;
