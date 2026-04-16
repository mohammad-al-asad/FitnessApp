import {
  STATIC_SUBSCRIPTION_PLANS,
  type SubscriptionPlan,
} from "@/constants/subscriptions";
import { TranslationKey } from "@/constants/translations";
import { useLanguage, useSafeColors } from "@/hooks/language-context";
import {
  backendGetMySubscriptionStatus,
  backendVerifyApplePurchase,
  backendVerifyGooglePurchase,
  type MySubscriptionStatus,
} from "@/services/backend-auth";
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
        let verifyResult;
        if (Platform.OS === "ios") {
          verifyResult = await backendVerifyApplePurchase({
            transactionId: purchase.transactionId || "",
          });
        } else {
          verifyResult = await backendVerifyGooglePurchase({
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

  const [plans, setPlans] = useState<SubscriptionPlan[]>(
    STATIC_SUBSCRIPTION_PLANS,
  );
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

      const statusResult = await backendGetMySubscriptionStatus();
      setSubscriptionStatus(statusResult);

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

  const selectedPlan =
    plans.find((p) => p.planType === selectedPeriod) ?? plans[0];

  const nativeStoreProduct = useMemo(() => {
    if (!selectedPlan) return null;

    if (Platform.OS === "ios") {
      const sku = selectedPlan.apple_sku;
      const sub = subscriptions.find(
        (s: any) => s.productId === sku || s.id === sku,
      );
      if (sub) {
        const hasIntroOffer = !!sub.introductoryPrice;
        const rawBasePrice = sub.localizedPrice || sub.price || "0";
        const rawDisplayPrice = hasIntroOffer
          ? sub.introductoryPriceAsAmountIOS || sub.introductoryPrice || "0"
          : rawBasePrice;

        return {
          ...sub,
          basePlanPrice: rawBasePrice,
          displayPrice: rawDisplayPrice,
          baseAmount: parseFloat(String(rawBasePrice).replace(/[^0-9.]/g, "")) || 0,
          displayAmount:
            parseFloat(String(rawDisplayPrice).replace(/[^0-9.]/g, "")) || 0,
          currencyCode: (sub as any).currency || "USD",
          isDiscounted: hasIntroOffer,
        };
      }
      return null;
    } else {
      // For Android, find the main subscription product first
      const mainSub = subscriptions.find(
        (s: any) =>
          s.productId === ANDROID_MAIN_SUB_ID || s.id === ANDROID_MAIN_SUB_ID,
      );

      // Search for offers inside the subscription
      const subAsAny = mainSub as any;
      const offers = subAsAny
        ? subAsAny.subscriptionOffers ||
          subAsAny.subscriptionOfferDetailsAndroid
        : null;

      if (mainSub && offers && Array.isArray(offers)) {
        const targetBasePlanId = selectedPlan.google_sku;

        // Find the base plan offer
        const basePlanOffers = offers.filter(
          (o) =>
            o.basePlanId === targetBasePlanId ||
            o.basePlanIdAndroid === targetBasePlanId,
        );
        const basePlanOffer =
          basePlanOffers.find((o) => o.id === targetBasePlanId) ||
          basePlanOffers.find((o) => !o.offerId && !o.offerIdAndroid) ||
          basePlanOffers[0];

        // 1. Attempt to find matching offer code if one is applied
        let specificOffer = null;
        if (appliedOfferCode) {
          specificOffer = offers.find(
            (offer) =>
              (offer.basePlanId === targetBasePlanId ||
                offer.basePlanIdAndroid === targetBasePlanId) &&
              (offer.offerId === appliedOfferCode ||
                offer.offerIdAndroid === appliedOfferCode ||
                offer.id === appliedOfferCode),
          );
        }

        // 2. Fall back to standard offer
        if (!specificOffer) {
          specificOffer = basePlanOffer;
        }

        const pricingPhases =
          specificOffer?.pricingPhases?.pricingPhaseList ||
          specificOffer?.pricingPhasesAndroid?.pricingPhaseList;
        const basePricingPhases =
          basePlanOffer?.pricingPhases?.pricingPhaseList ||
          basePlanOffer?.pricingPhasesAndroid?.pricingPhaseList;

        // Return a merged object so your UI and price formatting still works
        return {
          ...mainSub,
          basePlanPrice:
            basePricingPhases?.[0]?.formattedPrice || mainSub.displayPrice,
          displayPrice:
            pricingPhases?.[0]?.formattedPrice || mainSub.displayPrice,
          baseAmount:
            (Number(basePricingPhases?.[0]?.priceAmountMicros) || 0) / 1000000,
          displayAmount:
            (Number(pricingPhases?.[0]?.priceAmountMicros) || 0) / 1000000,
          currencyCode:
            pricingPhases?.[0]?.priceCurrencyCode ||
            basePricingPhases?.[0]?.priceCurrencyCode ||
            "USD",
          offerTokenToUse:
            specificOffer?.offerToken || specificOffer?.offerTokenAndroid,
          isDiscounted: Boolean(
            specificOffer?.offerId ||
            specificOffer?.offerIdAndroid ||
            (specificOffer?.id && specificOffer?.id !== targetBasePlanId),
          ),
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
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currencyCode.toUpperCase(),
      }).format(amount);
    } catch {
      return `${currencyCode.toUpperCase()} ${amount.toFixed(2)}`;
    }
  };

  const handleApplyCoupon = () => {
    if (Platform.OS === "ios") {
      // Apple doesn't support typed coupon codes — open the native redemption sheet
      try {
        const RNIap = require("react-native-iap");
        if (RNIap.presentCodeRedemptionSheetIOS) {
          RNIap.presentCodeRedemptionSheetIOS();
        } else {
          Alert.alert(
            String(t("error")),
            "Code redemption is not available on this device.",
          );
        }
      } catch {
        Alert.alert(
          String(t("error")),
          "Code redemption is not available on this device.",
        );
      }
      return;
    }

    // Android: check if the code exists in available offers
    const code = couponText.trim().toLowerCase();
    if (!code) return;

    const subAsAny = nativeStoreProduct as any;
    const offers = (subAsAny?.subscriptionOffers ||
      subAsAny?.subscriptionOfferDetailsAndroid) as any[];

    const offerExists = offers?.some((off) => {
      const isCorrectBasePlan =
        off.basePlanId === selectedPlan?.google_sku ||
        off.basePlanIdAndroid === selectedPlan?.google_sku;

      const isCorrectOfferCode =
        off.offerId === code || off.offerIdAndroid === code || off.id === code;

      return isCorrectBasePlan && isCorrectOfferCode;
    });

    if (offerExists) {
      setAppliedOfferCode(code);
      Alert.alert(String(t("success")), String(t("couponApplied")));
    } else {
      Alert.alert(String(t("error")), String(t("invalidCoupon")));
    }
  };

  const isSubscribed = Boolean(subscriptionStatus?.subscribed);
  const isReady =
    !isLoadingPlans && connected && !!nativeStoreProduct?.displayPrice;

  if (!isReady) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <SubscriptionSkeleton />
      </SafeAreaView>
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
              <View>
                {nativeStoreProduct?.isDiscounted && (
                  <Text
                    style={[
                      styles.originalPriceText,
                      {
                        color: colors.placeholder,
                        textDecorationLine: "line-through",
                      },
                    ]}
                  >
                    {nativeStoreProduct.basePlanPrice}
                  </Text>
                )}
                {nativeStoreProduct?.displayPrice && (
                  <Text style={[styles.price, { color: colors.text }]}>
                    {nativeStoreProduct.displayPrice}
                    <Text style={styles.periodText}>
                      {" "}
                      {selectedPlan.interval === "month"
                        ? t("perMonthly")
                        : t("perYearly")}
                    </Text>
                  </Text>
                )}
              </View>
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
          </View>
        )}

        {/* Coupon Section */}
        {selectedPeriod !== "yearly" && (
          <>
            {Platform.OS === "ios" ? (
              <View style={styles.couponSection}>
                <TouchableOpacity
                  style={[
                    styles.applyButton,
                    { backgroundColor: colors.primary, paddingHorizontal: 20 },
                  ]}
                  onPress={handleApplyCoupon}
                >
                  <Text style={styles.applyButtonText}>{t("haveACoupon")}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.couponSection}>
                <Text style={[styles.couponTitle, { color: colors.text }]}>
                  {t("haveACoupon")}
                </Text>
                <View style={styles.couponInputWrapper}>
                  <TextInput
                    style={[
                      styles.couponInput,
                      {
                        backgroundColor: colors.surface,
                        color: colors.text,
                        borderColor: colors.border,
                      },
                    ]}
                    placeholder={String(t("enterCouponCode"))}
                    placeholderTextColor={colors.placeholder}
                    value={couponText}
                    onChangeText={(txt) => setCouponText(txt.toLowerCase())}
                    editable={!appliedOfferCode}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={[
                      styles.applyButton,
                      { backgroundColor: colors.primary },
                      (appliedOfferCode || !couponText.trim()) && {
                        opacity: 0.5,
                      },
                    ]}
                    onPress={handleApplyCoupon}
                    disabled={Boolean(appliedOfferCode) || !couponText.trim()}
                  >
                    <Text style={styles.applyButtonText}>
                      {appliedOfferCode ? t("applied") : t("apply")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}

        {/* Summary Card */}
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.placeholder }]}>
              {t("originalPrice")}
            </Text>
            <Text style={[styles.summaryValue, { color: colors.placeholder }]}>
              {nativeStoreProduct?.basePlanPrice}
            </Text>
          </View>

          {appliedOfferCode && (
            <>
              {nativeStoreProduct?.isDiscounted && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: "#4CAF50" }]}>
                    {t("discountPercentage") || "Discount Applied"}
                  </Text>
                  <Text style={[styles.summaryValue, { color: "#4CAF50" }]}>
                    {(() => {
                      const base = Number(nativeStoreProduct?.baseAmount) || 0;
                      const current =
                        Number(nativeStoreProduct?.displayAmount) || 0;
                      const saved = base - current;
                      if (saved > 0) {
                        return `${formatCurrency(saved, nativeStoreProduct?.currencyCode || "USD")}`;
                      }
                      return t("saved") || "SAVED!";
                    })()}
                  </Text>
                </View>
              )}
              <View style={styles.divider} />
            </>
          )}

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.text }]}>
              {t("total")}
            </Text>
            <Text
              style={[
                styles.summaryValue,
                { color: colors.primary, fontWeight: "bold", fontSize: 20 },
              ]}
            >
              {nativeStoreProduct?.displayPrice}
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
    borderRadius: 16,
    padding: 4,
    marginBottom: 32,
    // Shadow for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    // Elevation for Android
    elevation: 8,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 14,
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
  originalPriceText: { fontSize: 16, marginBottom: -4, opacity: 0.7 },
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
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    // Shadow for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    // Elevation for Android
    elevation: 4,
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
