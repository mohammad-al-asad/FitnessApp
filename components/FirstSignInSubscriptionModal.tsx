import colors from "@/constants/colors";
import { useLanguage, useSafeColors } from "@/hooks/language-context";
import {
  backendGetSubscriptionPlans,
  type SubscriptionPlan,
} from "@/services/backend-auth";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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
  const { t } = useLanguage();
  const colors = useSafeColors();
  const [startingPlan, setStartingPlan] = useState<SubscriptionPlan | null>(
    null,
  );
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadStartingPlan = async () => {
      if (!visible) return;

      try {
        setIsLoadingPlan(true);
        const plans = await backendGetSubscriptionPlans();
        if (!isMounted || plans.length === 0) return;

        const monthlyPlan =
          plans.find((plan) => plan.interval?.toLowerCase() === "month") ??
          plans.find((plan) => plan.planType?.toLowerCase() === "monthly") ??
          [...plans].sort((a, b) => a.price - b.price)[0];

        setStartingPlan(monthlyPlan ?? null);
      } catch {
        if (!isMounted) return;
        setStartingPlan(null);
      } finally {
        if (!isMounted) return;
        setIsLoadingPlan(false);
      }
    };

    loadStartingPlan();

    return () => {
      isMounted = false;
    };
  }, [visible]);

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

  const startingPriceText = useMemo(() => {
    if (!startingPlan) return null;
    const periodLabel =
      startingPlan.interval?.toLowerCase() === "year"
        ? (t("perYearly") as string)
        : (t("perMonthly") as string);

    return `${t("firstSignInSubscriptionStartingFrom") as string} ${formatCurrency(
      startingPlan.price,
      startingPlan.currency,
    )} ${periodLabel}`;
  }, [startingPlan, t]);

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

            <Text
              style={[
                styles.body,
                { color: colors.placeholder, textAlign: "center" },
              ]}
            >
              {t("firstSignInSubscriptionBody") as string}
            </Text>
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
  body: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
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
