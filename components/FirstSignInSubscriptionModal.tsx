import colors from "@/constants/colors";
import { useLanguage, useSafeColors } from "@/hooks/language-context";
import {
} from "@/services/backend-auth";
import {
  STATIC_SUBSCRIPTION_PLANS,
  type SubscriptionPlan,
} from "@/constants/subscriptions";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useIAP } from "react-native-iap";

type FirstSignInSubscriptionModalProps = {
  visible: boolean;
  onSubscribe: () => void;
  onDismiss: () => void;
};

export default function FirstSignInSubscriptionModal({
  visible,
  onSubscribe,
  onDismiss,
}: FirstSignInSubscriptionModalProps) {
  const { t, tArray, currentLanguage } = useLanguage();
  const colors = useSafeColors();
  const [startingPlan, setStartingPlan] = useState<SubscriptionPlan | null>(
    null,
  );
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);

  const { connected, subscriptions, fetchProducts } = useIAP();
  const [iapPlan, setIapPlan] = useState<any>(null);

  useEffect(() => {
    if (!visible) return;

    const plans = STATIC_SUBSCRIPTION_PLANS;
    const monthlyPlan =
      plans.find((plan) => plan.interval?.toLowerCase() === "month") ??
      plans.find((plan) => plan.planType?.toLowerCase() === "monthly") ??
      [...plans].sort((a, b) => a.price - b.price)[0];

    setStartingPlan(monthlyPlan ?? null);

    if (connected) {
      const sku = Platform.OS === "ios" 
        ? "com.fitco.subscription.monthly" 
        : "com.fitco.subscription.monthly";
      
      setIsLoadingPlan(true);
      fetchProducts({ skus: [sku], type: "subs" })
        .catch(err => console.error("Error fetching modal IAP:", err))
        .finally(() => setIsLoadingPlan(false));
    }
  }, [visible, connected, fetchProducts]);

  useEffect(() => {
    if (subscriptions.length > 0) {
      const sku = "com.fitco.subscription.monthly";
      const sub = subscriptions.find(s => s.productId === sku || (s as any).id === sku);
      if (sub) {
        setIapPlan(sub);
      }
    }
  }, [subscriptions]);


  const startingPriceText = useMemo(() => {
    if (!startingPlan && !iapPlan) return null;

    const displayPrice = iapPlan 
      ? (iapPlan.localizedPrice || iapPlan.formattedPrice || iapPlan.price) 
      : startingPlan?.price;
    
    // If we have iapPlan, we can use its formatting, but we still need the localized labels
    const currencyLabel = iapPlan ? "" : (startingPlan?.currency?.toLowerCase() === "sar" ? (currentLanguage === "ar" ? "ريال" : "sr") : startingPlan?.currency);
    const intervalLabel = (iapPlan?.subscriptionPeriodNumberIOS === 1 || Object.is(startingPlan?.interval?.toLowerCase(), "month")) 
      ? (currentLanguage === "ar" ? "شهر" : "month") 
      : (currentLanguage === "ar" ? "سنة" : "year");
    
    const onlyLabel = currentLanguage === "ar" ? "فقط" : "only";

    return `${t("firstSignInSubscriptionStartingFrom") as string} ${onlyLabel} ${displayPrice}${currencyLabel}/${intervalLabel}`;
  }, [startingPlan, iapPlan, t, currentLanguage]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.primary,
            },
          ]}
        >
          <View style={styles.content}>
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: "rgba(76, 175, 80, 0.2)" },
              ]}
            >
              <Ionicons
                name="sparkles-outline"
                size={30}
                color={colors.primary}
              />
            </View>

            <Text
              style={[
                styles.title,
                { color: colors.text, textAlign: "center" },
              ]}
            >
              {t("firstSignInSubscriptionTitle") as string}
            </Text>

            <View style={styles.featureList}>
              {tArray("firstSignInSubscriptionFeatures").map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={colors.primary}
                    style={styles.featureIcon}
                  />
                  <Text style={[styles.featureText, { color: colors.text }]}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
            {isLoadingPlan ? (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={styles.priceLoading}
              />
            ) : (
              !!startingPriceText && (
                <View
                  style={[
                    styles.priceBadge,
                  ]}
                >
                  <Text style={[styles.priceText, { color: colors.primary }]}>
                    {startingPriceText}
                  </Text>
                </View>
              )
            )}
          </View>

          <View style={[styles.actions, { flexDirection: "column" }]}>
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                {
                  backgroundColor: colors.background,
                },
              ]}
              activeOpacity={0.85}
              onPress={onDismiss}
            >
              <Text
                style={[styles.secondaryButtonText, { color: colors.text }]}
              >
                {t("firstSignInSubscriptionLater") as string}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                {
                  backgroundColor: colors.primary,
                },
              ]}
              activeOpacity={0.85}
              onPress={onSubscribe}
            >
              <Text style={styles.primaryButtonText}>
                {t("firstSignInSubscriptionCta") as string}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "82%",
    maxWidth: 320,
    minHeight: 430,
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 24,
    paddingHorizontal: 20,
    justifyContent: "space-between",
  },
  content: {
    alignItems: "center",
  },
  iconBadge: {
    width: 80,
    height: 80,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 16,
    marginTop: 16,
  },
  title: {
    fontSize: 25,
    fontWeight: "700",
    marginBottom: 10,
  },
  featureList: {
    width: "100%",
    marginVertical: 15,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    paddingHorizontal: 5,
  },
  featureIcon: {
    marginTop: 2,
    marginRight: 10,
  },
  featureText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  priceLoading: {
    marginTop: 6,
  },
  priceBadge: {
    width: "100%",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  priceText: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    color: colors.primary,
  },
  actions: {
    gap: 10,
    marginTop: 10,
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 13,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#000000",
    fontSize: 15,
    fontWeight: "700",
  },
});
