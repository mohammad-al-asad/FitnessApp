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
import { useIAP, presentCodeRedemptionSheetIOS, getAvailablePurchases as getAvailablePurchasesStandalone } from "expo-iap";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * Safely extracts a numeric value from a price string (e.g., "$9.99" -> 9.99).
 * Returns 0 if extraction fails.
 */
const extractNumericPrice = (
  val: string | number | null | undefined,
): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  // Support both dot and comma locales, then keep only digits and first decimal
  const normalized = String(val)
    .replace(/,/g, ".")
    .replace(/[^0-9.]/g, "");
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
};

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
  } catch (e) {
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
    subscriptions: storeSubscriptions,
    fetchProducts,
    requestPurchase,
    finishTransaction,
    getAvailablePurchases,
    availablePurchases,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      try {
        setIsProcessingPurchase(true);
        let verifyResult;
        if (Platform.OS === "ios") {
          verifyResult = await backendVerifyApplePurchase({
            transactionId: purchase.transactionId || "",
            receipt: purchase.transactionReceipt || "",
          });
        } else {
          verifyResult = await backendVerifyGooglePurchase({
            purchaseToken: purchase.purchaseToken!,
          });
        }
        const isActive =
          verifyResult?.success === true &&
          (verifyResult?.normalized?.isActive === true ||
            verifyResult?.subscription?.isActive === true);

        if (!isActive) {
          throw new Error(verifyResult?.message || "Subscription verification failed");
        }

        await finishTransaction({ purchase, isConsumable: false });
        Alert.alert(
          String(t("success")),
          verifyResult?.message && verifyResult.message !== "Success"
            ? verifyResult.message
            : String(t("subscriptionActivated")),
        );
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

  console.log(JSON.stringify(storeSubscriptions, null, 2));

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
      const sub = storeSubscriptions.find(
        (s: any) => s.productId === sku || s.id === sku,
      );
      if (sub) {
        const hasIntroOffer = !!sub.introductoryPrice;
        const currencyCode =
          (sub as any).currency || (sub as any).currencyCode || "USD";

        const baseAmount = extractNumericPrice(sub.price);
        const displayAmount = hasIntroOffer
          ? extractNumericPrice(sub.introductoryPrice)
          : baseAmount;

        const localized =
          typeof sub.localizedPrice === "string" ? sub.localizedPrice : "";
        const hasSymbol = /[^\d\s.,]/.test(localized);

        return {
          ...sub,
          basePlanPrice: hasSymbol
            ? localized
            : formatCurrency(baseAmount, currencyCode),
          displayPrice:
            hasIntroOffer && !hasSymbol
              ? formatCurrency(displayAmount, currencyCode)
              : localized || formatCurrency(displayAmount, currencyCode),
          baseAmount: baseAmount,
          displayAmount: displayAmount,
          currencyCode: currencyCode,
          isDiscounted: hasIntroOffer,
        };
      }
      return null;
    } else {
      // Android logic
      const mainSub = storeSubscriptions.find(
        (s: any) =>
          s.productId === ANDROID_MAIN_SUB_ID || s.id === ANDROID_MAIN_SUB_ID,
      );

      const subAsAny = mainSub as any;
      const offers = subAsAny
        ? subAsAny.subscriptionOffers ||
          subAsAny.subscriptionOfferDetailsAndroid
        : null;

      if (mainSub && offers && Array.isArray(offers)) {
        const targetBasePlanId = selectedPlan.google_sku;
        const basePlanOffers = offers.filter(
          (o) =>
            o.basePlanId === targetBasePlanId ||
            o.basePlanIdAndroid === targetBasePlanId,
        );
        const basePlanOffer =
          basePlanOffers.find((o) => o.id === targetBasePlanId) ||
          basePlanOffers.find((o) => !o.offerId && !o.offerIdAndroid) ||
          basePlanOffers[0];

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

        if (!specificOffer) {
          specificOffer = basePlanOffer;
        }

        const pricingPhases =
          specificOffer?.pricingPhases?.pricingPhaseList ||
          specificOffer?.pricingPhasesAndroid?.pricingPhaseList;
        const basePricingPhases =
          basePlanOffer?.pricingPhases?.pricingPhaseList ||
          basePlanOffer?.pricingPhasesAndroid?.pricingPhaseList;

        return {
          ...mainSub,
          basePlanPrice:
            basePricingPhases?.[0]?.formattedPrice || mainSub.displayPrice,
          displayPrice:
            pricingPhases?.[0]?.formattedPrice || mainSub.displayPrice,
          baseAmount:
            Math.round(
              ((Number(basePricingPhases?.[0]?.priceAmountMicros) || 0) /
                1000000) *
                100,
            ) / 100,
          displayAmount:
            Math.round(
              ((Number(pricingPhases?.[0]?.priceAmountMicros) || 0) / 1000000) *
                100,
            ) / 100,
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
  }, [storeSubscriptions, selectedPlan, appliedOfferCode]);

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

  const handleApplyCoupon = () => {
    if (Platform.OS === "ios") {
      if (presentCodeRedemptionSheetIOS) {
        presentCodeRedemptionSheetIOS();
      } else {
        Alert.alert(
          String(t("error")),
          "Code redemption is not available on this device.",
        );
      }
    } else {
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
          off.offerId === code ||
          off.offerIdAndroid === code ||
          off.id === code;

        return isCorrectBasePlan && isCorrectOfferCode;
      });

      if (offerExists) {
        setAppliedOfferCode(code);
        Alert.alert(String(t("success")), String(t("couponApplied")));
      } else {
        Alert.alert(String(t("error")), String(t("invalidCoupon")));
      }
    }
  };

  const handleRestore = async () => {
    try {
      setIsProcessingPurchase(true);
      const purchases = await getAvailablePurchasesStandalone();

      if (!purchases || purchases.length === 0) {
        Alert.alert(
          String(t("error")),
          String(t("no_active_subscription_found")),
        );
        return;
      }

      let restoredCount = 0;
      let lastError: any = null;
      for (const purchase of purchases) {
        try {
          let verifyResult;
          if (Platform.OS === "ios") {
            verifyResult = await backendVerifyApplePurchase({
              transactionId: purchase.transactionId || "",
              receipt: purchase.transactionReceipt || "",
            });
          } else {
            verifyResult = await backendVerifyGooglePurchase({
              purchaseToken: purchase.purchaseToken!,
            });
          }
          const isActive =
            verifyResult?.success === true &&
            (verifyResult?.normalized?.isActive === true ||
             verifyResult?.subscription?.isActive === true);

          if (!isActive) {
            throw new Error(verifyResult?.message || "Subscription verification failed");
          }

          await finishTransaction({ purchase, isConsumable: false });
          restoredCount++;
        } catch (e: any) {
          console.error("Failed to restore a specific purchase:", e);
          lastError = e;
        }
      }

      if (restoredCount > 0) {
        Alert.alert(String(t("success")), String(t("subscription_restored")));
        loadInitialData();
      } else {
        Alert.alert(String(t("error")), lastError?.message || String(t("failed_to_restore")));
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
              {t(
                selectedPeriod === "monthly"
                  ? "monthlyPremium"
                  : "yearlyPremium",
              )}
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
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
