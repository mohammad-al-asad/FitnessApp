import { useAuth } from "@/hooks/auth-context";
import { useLanguage, useSafeColors } from "@/hooks/language-context";
import { usePlacement } from "expo-superwall";
import {
  backendSyncRevenueCat,
  backendGetMySubscriptionStatus,
  type MySubscriptionStatus,
} from "@/services/backend-auth";
import { ensureRevenueCatConfigured } from "@/services/revenuecat";
import { trackAppsFlyerSubscribe } from "@/services/appsflyer";
import { subscribeToRevenueCatSync } from "@/services/subscription-sync-events";
import {
  SUPERWALL_PAYWALL_PLACEMENT,
  getPaywallParams,
  getReferralCodeStatus,
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
  TouchableOpacity,
  View,
} from "react-native";
import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
  type StoreProductChangeInfo,
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
  borderRadius = 6,
}: {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
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
        borderRadius,
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
      <View
        style={[
          styles.skeletonStatusCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.skeletonAccentBar} />

        <View style={styles.skeletonHeaderRow}>
          <SkeletonBar width={42} height={42} borderRadius={21} />
          <View style={styles.skeletonTitleStack}>
            <SkeletonBar width="74%" height={19} />
            <View style={{ height: 8 }} />
            <SkeletonBar width="48%" height={12} />
          </View>
          <SkeletonBar width={58} height={26} borderRadius={13} />
        </View>

        <View style={styles.statusDivider} />

        {["plan", "cost", "renewal"].map((item, index) => (
          <View key={item} style={styles.skeletonStatusRow}>
            <SkeletonBar width={index === 2 ? 94 : 68} height={13} />
            <SkeletonBar
              width={index === 1 ? 108 : index === 2 ? 126 : 118}
              height={16}
            />
          </View>
        ))}
      </View>

      <View
        style={[
          styles.skeletonFooterCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <SkeletonBar width="96%" height={12} />
        <View style={{ height: 7 }} />
        <SkeletonBar width="84%" height={12} />
        <View style={{ height: 7 }} />
        <SkeletonBar width="66%" height={12} />
        <View style={{ height: 18 }} />

        <View style={styles.subscriptionActionsRow}>
          <SkeletonBar width="48%" height={44} borderRadius={12} />
          <SkeletonBar width="48%" height={44} borderRadius={12} />
        </View>

        <View style={styles.skeletonPolicyRow}>
          <SkeletonBar width={90} height={12} />
          <View style={{ width: 20 }} />
          <SkeletonBar width={88} height={12} />
        </View>
      </View>
    </ScrollView>
  );
};

const hasActiveRevenueCatEntitlement = (customerInfo: any) =>
  Object.keys(customerInfo?.entitlements?.active ?? {}).length > 0;

type BillingPlanType = "monthly" | "yearly";

const normalizePlanType = (
  value: string | null | undefined,
): BillingPlanType | null => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["yearly", "annual", "year"].includes(normalized)) return "yearly";
  if (["monthly", "month"].includes(normalized)) return "monthly";
  return null;
};

const inferPlanTypeFromIdentifier = (
  value: string | null | undefined,
): BillingPlanType | null => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return null;

  // Check yearly first because Android identifiers can look like
  // "product.monthly:base-plan-yearly" after a product change.
  if (
    normalized.includes("yearly") ||
    normalized.includes("annual") ||
    normalized.includes("year") ||
    normalized.endsWith(":yr")
  ) {
    return "yearly";
  }

  if (
    normalized.includes("monthly") ||
    normalized.includes("month") ||
    normalized.endsWith(":mo")
  ) {
    return "monthly";
  }

  return null;
};

const firstInferredPlanType = (
  values: (string | null | undefined)[],
): BillingPlanType | null => {
  for (const value of values) {
    const planType = inferPlanTypeFromIdentifier(value);
    if (planType) return planType;
  }

  return null;
};

const inferRevenueCatPlanType = (
  customerInfo: CustomerInfo | null,
): BillingPlanType | null => {
  const activeEntitlements = Object.values(
    customerInfo?.entitlements?.active ?? {},
  );

  for (const entitlement of activeEntitlements) {
    const entitlementPlan = firstInferredPlanType([
      entitlement.productPlanIdentifier,
      entitlement.productIdentifier,
      entitlement.identifier,
    ]);

    if (entitlementPlan) return entitlementPlan;
  }

  const activeSubscriptionIds = customerInfo?.activeSubscriptions ?? [];
  const activeSubscriptionProductIds = Object.values(
    customerInfo?.subscriptionsByProductIdentifier ?? {},
  )
    .filter((subscription) => subscription.isActive)
    .map((subscription) => subscription.productIdentifier);

  return firstInferredPlanType([
    ...activeSubscriptionIds,
    ...activeSubscriptionProductIds,
  ]);
};

const resolveActivePlanType = (
  activeSub: MySubscriptionStatus["activeSubscription"],
  customerInfo: CustomerInfo | null,
): BillingPlanType | null =>
  inferRevenueCatPlanType(customerInfo) ??
  firstInferredPlanType([
    activeSub?.productId,
    activeSub?.providerSubscriptionId,
    activeSub?.id,
  ]) ??
  normalizePlanType(activeSub?.planType);

const resolveActiveRevenueCatProductIdentifier = (
  activeSub: MySubscriptionStatus["activeSubscription"],
  customerInfo: CustomerInfo | null,
) => {
  const activeEntitlement = Object.values(
    customerInfo?.entitlements?.active ?? {},
  )[0];

  return (
    activeEntitlement?.productIdentifier ??
    customerInfo?.activeSubscriptions?.[0] ??
    activeSub?.productId ??
    null
  );
};

const getPackagePriceParts = (
  pack: PurchasesPackage | null,
  fallback: { currency: string; amount: string },
) => {
  const priceString = String(pack?.product?.priceString ?? "").trim();
  const fallbackParts = fallback;

  if (!priceString) return fallbackParts;

  const match = priceString.match(/^([^\d.,-]+)?\s*([\d.,]+)\s*([^\d.,-]+)?$/);
  if (!match) {
    return { currency: "", amount: priceString };
  }

  return {
    currency: String(match[1] || match[3] || fallback.currency).trim(),
    amount: String(match[2] || fallback.amount).trim(),
  };
};

const getAnnualTotalText = (pack: PurchasesPackage | null, yearLabel: string) => {
  const price = Number(pack?.product?.price ?? 0);
  const currencyCode = pack?.product?.currencyCode;
  if (price > 0) return `${formatCurrency(price * 12, currencyCode)} / ${yearLabel}`;
  return `$119.88 / ${yearLabel}`;
};

const getMonthlyEquivalentText = (pack: PurchasesPackage | null, monthLabel: string) => {
  const price = Number(pack?.product?.price ?? 0);
  const currencyCode = pack?.product?.currencyCode;
  if (price > 0) return `${formatCurrency(price / 12, currencyCode)} / ${monthLabel}`;
  return `$5.00 / ${monthLabel}`;
};

const UpgradePlanScreen = () => {
  const { t, currentLanguage, isRTL } = useLanguage();
  const { user, syncSubscription } = useAuth();
  const colors = useSafeColors();
  const router = useRouter();

  const { registerPlacement } = usePlacement({
    onPresent: () => {
      console.log("[Superwall] Paywall presented on subscription screen.");
    },
    onDismiss: () => {
      console.log("[Superwall] Paywall dismissed on subscription screen.");
    },
  });

  const handleSubscribeNow = useCallback(async () => {
    const referralCodeStatus = await getReferralCodeStatus();
    console.log("Referral Code Status: ", referralCodeStatus);
    await registerPlacement({
      placement: SUPERWALL_PAYWALL_PLACEMENT,
      params: getPaywallParams(referralCodeStatus, currentLanguage),
    });
  }, [currentLanguage, registerPlacement]);

  const [monthlyPackage, setMonthlyPackage] =
    useState<PurchasesPackage | null>(null);
  const [yearlyPackage, setYearlyPackage] =
    useState<PurchasesPackage | null>(null);
  const [revenueCatCustomerInfo, setRevenueCatCustomerInfo] =
    useState<CustomerInfo | null>(null);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<MySubscriptionStatus | null>(null);
  const monthlyPrice = getPackagePriceParts(monthlyPackage, {
    currency: "USD",
    amount: "9.99",
  });
  const yearlyPrice = getPackagePriceParts(yearlyPackage, {
    currency: "USD",
    amount: "59.99",
  });

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

  const loadInitialData = useCallback(async () => {
    try {
      setIsLoadingPlans(true);

      try {
        await ensureRevenueCatConfigured(user?.uid);
        const [offerings, customerInfo] = await Promise.all([
          Purchases.getOfferings(),
          Purchases.getCustomerInfo(),
        ]);

        setRevenueCatCustomerInfo(customerInfo);

        if (offerings.current) {
          setMonthlyPackage(offerings.current.monthly ?? null);
          setYearlyPackage(offerings.current.annual ?? null);
        }

        if (hasActiveRevenueCatEntitlement(customerInfo)) {
          await backendSyncRevenueCat("subscription-screen:load").catch(
            (syncError) => {
              console.warn(
                "[Subscription] RevenueCat backend sync failed during load:",
                syncError,
              );
            },
          );
        }
      } catch (revenueCatError) {
        console.error("Error loading RevenueCat offerings:", revenueCatError);
      }

      const statusResult = await backendGetMySubscriptionStatus();
      setSubscriptionStatus(statusResult);
    } catch (err) {
      console.error("Error loading subscription status:", err);
    } finally {
      setIsLoadingPlans(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleUpgradeToYearly = async () => {
    if (activePlanType === "yearly") {
      Alert.alert(String(t("success")), String(t("alreadyOnYearlyPlan")));
      return;
    }

    if (!yearlyPackage || isProcessingPurchase) {
      Alert.alert(String(t("error")), String(t("yearlyPlanUnavailable")));
      return;
    }

    try {
      setIsProcessingPurchase(true);
      await ensureRevenueCatConfigured(user?.uid);
      const activeProductId = resolveActiveRevenueCatProductIdentifier(
        activeSub,
        revenueCatCustomerInfo,
      );
      const monthlyProductId = monthlyPackage?.product?.identifier || "";
      const oldProductIdentifier = activeProductId || monthlyProductId;
      const productChangeInfo: StoreProductChangeInfo | null =
        Platform.OS === "android" && oldProductIdentifier
          ? {
              oldProductIdentifier,
              replacementMode:
                Purchases.STORE_REPLACEMENT_MODE.WITHOUT_PRORATION,
            }
          : null;

      const purchaseResult = await Purchases.purchasePackage(
        yearlyPackage,
        null,
        productChangeInfo,
      );
      setRevenueCatCustomerInfo(purchaseResult.customerInfo);

      try {
        trackAppsFlyerSubscribe({
          productId: yearlyPackage.product.identifier,
          price: yearlyPackage.product.price,
          currency: yearlyPackage.product.currencyCode || "USD",
          additionalParams: {
            placement: "settings_subscription_upgrade",
          },
        });
      } catch (afError) {
        console.warn("[Subscription] Failed to track AppsFlyer upgrade:", afError);
      }

      const isSubscribedLocally = await syncSubscription(
        "subscription-screen:purchase",
      );
      if (isSubscribedLocally) {
        Alert.alert(String(t("success")), String(t("upgradedToYearlySuccessfully")));
        await loadInitialData();
      } else {
        throw new Error(String(t("upgradeVerificationFailed")));
      }
    } catch (error: any) {
      if (!error.userCancelled) {
        Alert.alert(
          String(t("error")),
          error.message || String(t("failedToUpgradeSubscription")),
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

      setRevenueCatCustomerInfo(customerInfo);

      const isSubscribedLocally = await syncSubscription(
        "subscription-screen:restore",
      );

      if (isSubscribedLocally) {
        Alert.alert(String(t("success")), String(t("subscription_restored")));
        await loadInitialData();
      } else {
        Alert.alert(String(t("error")), String(t("failed_to_restore")));
      }
    } catch (error: any) {
      Alert.alert(
        String(t("error")),
        error.message || String(t("failedToRestorePurchases")),
      );
    } finally {
      setIsProcessingPurchase(false);
    }
  };

  const activeSub = subscriptionStatus?.activeSubscription ?? null;
  const isRevenueCatSubscribed =
    hasActiveRevenueCatEntitlement(revenueCatCustomerInfo);
  const isSubscribed = Boolean(
    subscriptionStatus?.subscribed || isRevenueCatSubscribed,
  );
  const activePlanType = useMemo(
    () => resolveActivePlanType(activeSub, revenueCatCustomerInfo),
    [activeSub, revenueCatCustomerInfo],
  );
  const activePlanLabel =
    activePlanType === "monthly"
      ? String(t("monthly"))
      : activePlanType === "yearly"
        ? String(t("yearly"))
        : String(t("premiumPlan"));
  const activePlanPrice = useMemo(() => {
    if (activeSub?.price) {
      return formatCurrency(activeSub.price, activeSub.currency || "USD");
    }
    return activePlanType === "monthly"
      ? monthlyPackage?.product?.priceString || `$9.99${String(t("perMonthShort"))}`
      : activePlanType === "yearly"
        ? yearlyPackage?.product?.priceString || `$59.99${String(t("perYearShort"))}`
        : String(t("notAvailable"));
  }, [activeSub, activePlanType, monthlyPackage, yearlyPackage, t]);
  const showYearlyUpgrade = activePlanType === "monthly";
  const activeExpiryDate =
    activeSub?.expiryDate || revenueCatCustomerInfo?.latestExpirationDate;
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

        {isSubscribed ? (
          <>
            {/* Active Subscription Card */}
            <View style={[styles.statusCard, { borderColor: colors.primary }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                <Text style={[styles.statusTitle, { color: colors.text }]}>
                  {t("activePremiumMember")}
                </Text>
              </View>

              <View style={styles.statusDivider} />

              <View style={styles.statusRow}>
                <Text style={[styles.statusLabel, { color: colors.placeholder }]}>{t("planType")}</Text>
                <Text style={[styles.statusValue, { color: colors.text }]}>
                  {activePlanLabel}
                </Text>
              </View>

              <View style={styles.statusRow}>
                <Text style={[styles.statusLabel, { color: colors.placeholder }]}>{t("cost")}</Text>
                <Text style={[styles.statusValue, { color: colors.text }]}>
                  {activePlanPrice}
                </Text>
              </View>

              <View style={styles.statusRow}>
                <Text style={[styles.statusLabel, { color: colors.placeholder }]}>{t("renewalDate")}</Text>
                <Text style={[styles.statusValue, { color: colors.text }]}>
                  {activeExpiryDate
                    ? new Date(activeExpiryDate).toLocaleDateString(currentLanguage === "ar" ? "ar-SA-u-ca-gregory" : undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : t("notAvailable")}
                </Text>
              </View>

            </View>

            {/* Upgrade Option for Monthly Subscribers */}
            {showYearlyUpgrade && (
              <View style={[styles.upgradeCard, { backgroundColor: colors.surface }]}>
                <View style={styles.badgeContainer}>
                  <View style={[styles.bestValueBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.bestValueText}>{t("upgradeAndSave50")}</Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.upgradeTitle,
                    { color: colors.text },
                    isRTL && { writingDirection: "rtl" },
                  ]}
                >
                  {t("switchToYearlyPlan")}
                </Text>
                <Text
                  style={[
                    styles.upgradeDesc,
                    { color: colors.placeholder },
                    isRTL && { writingDirection: "rtl" },
                  ]}
                >
                  {t("yearlyUpgradeDescription")}
                </Text>

                <View style={styles.comparisonWrapper}>
                  <View style={styles.priceComparisonItem}>
                    <Text style={[styles.comparisonPlanLabel, { color: colors.placeholder }]}>{t("monthlyLabel")}</Text>
                    <View style={styles.priceLine}>
                      <Text style={[styles.priceCurrency, { color: colors.text }]}>
                        {monthlyPrice.currency}
                      </Text>
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.72}
                        style={[styles.comparisonPlanPrice, { color: colors.text }]}
                      >
                        {monthlyPrice.amount}
                      </Text>
                      <Text style={styles.priceSubText}>{t("perMonthShort")}</Text>
                    </View>
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      style={[styles.comparisonTotal, { color: colors.placeholder }]}
                    >
                      {getAnnualTotalText(monthlyPackage, String(t("perYear")))}
                    </Text>
                  </View>

                  <Ionicons
                    name={isRTL ? "arrow-back" : "arrow-forward"}
                    size={24}
                    color={colors.placeholder}
                    style={styles.arrowIcon}
                  />

                  <View style={[styles.priceComparisonItem, { borderColor: colors.primary, borderWidth: 1, borderRadius: 12, padding: 8 }]}>
                    <Text style={[styles.comparisonPlanLabel, { color: colors.primary, fontWeight: "700" }]}>{t("yearlyLabel")}</Text>
                    <View style={styles.priceLine}>
                      <Text style={[styles.priceCurrency, { color: colors.primary }]}>
                        {yearlyPrice.currency}
                      </Text>
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.72}
                        style={[styles.comparisonPlanPrice, { color: colors.primary }]}
                      >
                        {yearlyPrice.amount}
                      </Text>
                      <Text style={[styles.priceSubText, { color: colors.primary }]}>{t("perYearShort")}</Text>
                    </View>
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      style={[styles.comparisonTotal, { color: colors.primary }]}
                    >
                      {t("only")} {getMonthlyEquivalentText(yearlyPackage, String(t("perMonth")))}
                    </Text>
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
                    <Text style={styles.upgradeButtonText}>{t("upgradeToYearly")}</Text>
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
                {t("noActiveSubscription")}
              </Text>
            </View>
            <Text style={[styles.statusSubtitle, { color: colors.placeholder, marginTop: 8 }, isRTL && { textAlign: "right" }]}>
              {t("inactiveSubscriptionDescription")}
            </Text>

            <TouchableOpacity
              style={[styles.subscribeButton, { backgroundColor: colors.primary, marginTop: 24 }]}
              onPress={handleSubscribeNow}
            >
              <Text style={styles.buttonTextWhite}>{t("subscribeNow")}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.transparencySection}>
          <Text style={[styles.autoRenewalNotice, { color: colors.text }, isRTL && { textAlign: "right" }]}>
            {t("autoRenewalNotice")}
          </Text>

          <View style={styles.subscriptionActionsRow}>
            <TouchableOpacity
              onPress={() => {
                const url =
                  Platform.OS === "ios"
                    ? "https://apps.apple.com/account/subscriptions"
                    : "https://play.google.com/store/account/subscriptions";
                Linking.openURL(url);
              }}
              style={[
                styles.manageLink,
                styles.subscriptionActionLink,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.manageLinkText, { color: colors.primary }]}>
                {t("manageSubscription")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleRestore}
              style={[
                styles.manageLink,
                styles.subscriptionActionLink,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: isProcessingPurchase ? 0.6 : 1,
                },
              ]}
              disabled={isProcessingPurchase}
            >
              <Text style={[styles.manageLinkText, { color: colors.primary }]}>
                {t("restorePurchases")}
              </Text>
            </TouchableOpacity>
          </View>

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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 30 },
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
  skeletonHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  skeletonStatusCard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
  },
  skeletonAccentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "rgba(81, 186, 93, 0.5)",
  },
  skeletonTitleStack: {
    flex: 1,
  },
  skeletonStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 7,
  },
  skeletonFooterCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginTop: 6,
    marginBottom: 24,
    alignItems: "center",
  },
  skeletonPolicyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
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
    minWidth: 0,
  },
  comparisonPlanLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  priceLine: {
    width: "100%",
    minHeight: 32,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    flexWrap: "nowrap",
  },
  priceCurrency: {
    flexShrink: 0,
    fontSize: 12,
    fontWeight: "700",
    marginEnd: 3,
  },
  comparisonPlanPrice: {
    flexShrink: 1,
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  priceSubText: {
    flexShrink: 0,
    fontSize: 12,
    fontWeight: "normal",
    color: "#999",
    marginStart: 2,
  },
  comparisonTotal: {
    width: "100%",
    fontSize: 11,
    marginTop: 4,
    textAlign: "center",
  },
  arrowIcon: {
    marginHorizontal: 8,
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
  subscriptionActionsRow: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  manageLink: {
    flex: 1,
  },
  subscriptionActionLink: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  manageLinkText: {
    fontSize: 13,
    fontWeight: "bold",
    textAlign: "center",
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
