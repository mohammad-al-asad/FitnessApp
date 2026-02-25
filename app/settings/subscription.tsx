import { useLanguage, useSafeColors } from "@/hooks/language-context";
import {
  backendCreateSubscription,
  backendGetSubscriptionPlans,
  backendGetSubscriptionQuote,
  type SubscriptionQuote,
  type SubscriptionPlan,
} from "@/services/backend-auth";
import { Ionicons } from "@expo/vector-icons";
import {
  openBrowserAsync,
  WebBrowserPresentationStyle,
} from "expo-web-browser";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const UpgradePlanScreen = () => {
  const { t, isRTL } = useLanguage();
  const colors = useSafeColors();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [activeQuote, setActiveQuote] = useState<SubscriptionQuote | null>(null);
  const [couponCode, setCouponCode] = useState("");

  const features = useMemo(
    () => [
      t("featureBarcode"),
      t("featureChat"),
      t("featureSupport"),
      t("featureEarlyAccess"),
    ],
    [t],
  );

  const selectedPlan =
    plans.find((plan) => plan.planType === selectedPeriod) ?? plans[0];

  useEffect(() => {
    let isMounted = true;

    const loadPlans = async () => {
      try {
        setIsLoadingPlans(true);
        setPlansError(null);
        const data = await backendGetSubscriptionPlans();
        if (!isMounted) return;
        setPlans(data);
      } catch (error: any) {
        if (!isMounted) return;
        setPlansError(
          error?.message || (t("somethingWentWrong") as string) || "Error",
        );
      } finally {
        if (!isMounted) return;
        setIsLoadingPlans(false);
      }
    };

    loadPlans();

    return () => {
      isMounted = false;
    };
  }, [t]);

  useEffect(() => {
    if (!plans.some((plan) => plan.planType === selectedPeriod)) {
      setSelectedPeriod(plans[0]?.planType || "monthly");
    }
  }, [plans, selectedPeriod]);

  useEffect(() => {
    setActiveQuote(null);
  }, [selectedPeriod]);

  const formatCurrency = (amount: number, currencyCode: string) => {
    const currency = (currencyCode || "usd").toUpperCase();
    const safeAmount = Number.isFinite(amount) ? amount : 0;

    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
      }).format(safeAmount);
    } catch {
      return `$${safeAmount.toFixed(2)}`;
    }
  };

  const getPeriodLabel = (plan: SubscriptionPlan) => {
    if (plan.interval === "month") return t("perMonthly");
    if (plan.interval === "year") return t("perYearly");
    return ` / ${plan.interval}`;
  };

  const shownCurrency = activeQuote?.currency || selectedPlan?.currency || "usd";
  const shownPrice = activeQuote?.finalPrice ?? selectedPlan?.price ?? 0;
  const shownBasePrice = activeQuote?.basePrice ?? selectedPlan?.price ?? 0;
  const hasDiscount =
    !!activeQuote &&
    activeQuote.discountAmount > 0 &&
    activeQuote.finalPrice < activeQuote.basePrice;

  const handleApplyCoupon = async () => {
    if (!selectedPlan || isApplyingCoupon) return;
    const trimmed = couponCode.trim();
    if (!trimmed) {
      Alert.alert(String(t("error")), "Please enter coupon code.");
      return;
    }

    try {
      setIsApplyingCoupon(true);
      const quote = await backendGetSubscriptionQuote({
        planType: selectedPlan.planType,
        couponCode: trimmed,
      });
      setActiveQuote(quote);
    } catch (error: any) {
      setActiveQuote(null);
      Alert.alert(
        String(t("error")),
        error?.message || String(t("somethingWentWrong")),
      );
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPlan || isCreatingCheckout) return;

    try {
      setIsCreatingCheckout(true);

      const payload = {
        planType: selectedPlan.planType,
        ...(couponCode.trim() ? { couponCode: couponCode.trim() } : {}),
      };

      const result = await backendCreateSubscription(payload);
      if (!result.checkoutUrl) {
        throw new Error("Missing checkout URL");
      }

      if (Platform.OS === "web") {
        window.open(result.checkoutUrl, "_blank");
      } else {
        await openBrowserAsync(result.checkoutUrl, {
          presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
        });
      }
    } catch (error: any) {
      Alert.alert(
        String(t("error")),
        error?.message || String(t("somethingWentWrong")),
      );
    } finally {
      setIsCreatingCheckout(false);
    }
  };

  if (!selectedPlan && !isLoadingPlans) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <StatusBar barStyle="light-content" />
        <View style={styles.emptyStateContainer}>
          <Text style={[styles.emptyStateText, { color: colors.placeholder }]}>
            {t("somethingWentWrong")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.scrollContent}
      >
        <Text style={[styles.headerSubtitle, { color: colors.placeholder }]}>
          {t("choosePlanSubtitle")}
        </Text>

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
              ]}
              onPress={() => setSelectedPeriod(plan.planType)}
            >
              <Text
                style={[
                  styles.toggleText,
                  {
                    color: selectedPeriod === plan.planType ? "#000" : "#fff",
                  },
                ]}
              >
                { t(plan.planType as any) || plan.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoadingPlans && (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={styles.loadingIndicator}
          />
        )}

        {plansError && (
          <Text style={[styles.errorText, { color: colors.placeholder }]}>
            {plansError}
          </Text>
        )}

        {!!selectedPlan && (
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
                <View
                  style={[
                    styles.priceLine,
                    { flexDirection: isRTL ? "row-reverse" : "row" },
                  ]}
                >
                  {hasDiscount && (
                    <Text
                      style={[styles.originalPrice, { color: colors.placeholder }]}
                    >
                      {formatCurrency(shownBasePrice, shownCurrency)}
                    </Text>
                  )}
                  <Text style={[styles.price, { color: colors.text }]}>
                    {formatCurrency(shownPrice, shownCurrency)}
                  </Text>
                </View>
                <Text style={[styles.period, { color: colors.placeholder }]}>
                  {getPeriodLabel(selectedPlan)}
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

        <Text
          style={[
            styles.sectionTitle,
            { color: colors.text, textAlign: isRTL ? "right" : "left" },
          ]}
        >
          {t("haveCoupon")}
        </Text>

        <View
          style={[
            styles.couponContainer,
            { flexDirection: isRTL ? "row-reverse" : "row" },
          ]}
        >
          <TextInput
            style={[
              styles.couponInput,
              {
                backgroundColor: colors.surface,
                color: colors.text,
                textAlign: isRTL ? "right" : "left",
              },
            ]}
            placeholder={t("enterCoupon") as string}
            placeholderTextColor={colors.placeholder}
            value={couponCode}
            onChangeText={setCouponCode}
          />
          <TouchableOpacity
            disabled={!selectedPlan || isApplyingCoupon}
            style={[styles.applyButton, { backgroundColor: colors.primary }]}
            onPress={handleApplyCoupon}
          >
            <Text style={styles.buttonTextWhite}>
              {isApplyingCoupon ? t("pleaseWait") : t("apply")}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          disabled={!selectedPlan || isCreatingCheckout || isLoadingPlans}
          style={[styles.subscribeButton, { backgroundColor: colors.primary }]}
          onPress={handleSubscribe}
        >
          <Text style={styles.buttonTextWhite}>
            {isCreatingCheckout ? t("pleaseWait") : t("subscribeNow")}
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10 },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyStateText: { fontSize: 14 },

  headerSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },

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
  loadingIndicator: { marginBottom: 12 },
  errorText: { textAlign: "center", marginBottom: 10, fontSize: 13 },

  glowWrapper: {
    position: "relative",
    marginBottom: 28,
  },

  glowLayer: {
    position: "absolute",
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 28,
    opacity: 0.15,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 24,
    elevation: 20,
  },

  planCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
  },

  planTitle: { fontSize: 24, fontWeight: "bold", marginBottom: 4 },
  planSubtitle: { fontSize: 15, marginBottom: 20 },

  priceContainer: { alignItems: "baseline", marginBottom: 20 },
  priceLine: { alignItems: "baseline", gap: 8 },
  originalPrice: { fontSize: 18, textDecorationLine: "line-through" },
  price: { fontSize: 36, fontWeight: "bold" },
  period: { fontSize: 16, marginLeft: 4 },

  featureItem: { alignItems: "center", marginBottom: 14 },
  featureText: { fontSize: 15 },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },

  couponContainer: { marginBottom: 24, gap: 10 },
  couponInput: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
  },

  applyButton: {
    paddingHorizontal: 24,
    justifyContent: "center",
    borderRadius: 12,
    height: 50,
  },

  subscribeButton: {
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 40,
  },

  buttonTextWhite: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 18,
  },
});

export default UpgradePlanScreen;
