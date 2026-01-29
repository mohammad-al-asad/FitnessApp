import { useLanguage, useSafeColors } from "@/hooks/language-context";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ScrollView,
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
  const [selectedPeriod, setSelectedPeriod] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const [couponCode, setCouponCode] = useState("");

  const mockPlans = {
    monthly: {
      title: t("subscription"),
      subtitle: t("premiumSubtitle"),
      price: "$9.99",
      period: t("perMonthly"),
      features: [
        t("featureBarcode"),
        t("featureChat"),
        t("featureSupport"),
        t("featureEarlyAccess"),
      ],
      originalPrice: "$19.99",
      totalPrice: "$9.99",
    },
    yearly: {
      title: t("subscription"),
      subtitle: t("premiumSubtitle"),
      price: "$99.99",
      period: t("perYearly"),
      features: [
        t("featureBarcode"),
        t("featureChat"),
        t("featureSupport"),
        t("featureEarlyAccess"),
      ],
      originalPrice: "$120.00",
      totalPrice: "$99.99",
    },
  };

  const selectedPlan = mockPlans[selectedPeriod];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.headerSubtitle, { color: colors.placeholder }]}>
          {t("choosePlanSubtitle")}
        </Text>

        {/* Toggle */}
        <View
          style={[styles.toggleContainer, { backgroundColor: colors.surface }]}
        >
          {["monthly", "yearly"].map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                styles.toggleButton,
                selectedPeriod === p && {
                  backgroundColor: colors.primary,
                },
              ]}
              onPress={() => setSelectedPeriod(p as any)}
            >
              <Text
                style={[
                  styles.toggleText,
                  {
                    color: selectedPeriod === p ? "#000" : "#fff",
                  },
                ]}
              >
                {t(p as any)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 🔥 GLOW WRAPPER */}
        <View style={styles.glowWrapper}>
          {/* Glow layer */}
          <View
            style={[
              styles.glowLayer,
              { shadowColor: colors.primary, backgroundColor: colors.primary },
            ]}
          />

          {/* Card */}
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
              {selectedPlan.title}
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
              {selectedPlan.subtitle}
            </Text>

            <View
              style={[
                styles.priceContainer,
                { flexDirection: isRTL ? "row-reverse" : "row" },
              ]}
            >
              <Text style={[styles.price, { color: colors.text }]}>
                {selectedPlan.price}
              </Text>
              <Text style={[styles.period, { color: colors.placeholder }]}>
                {selectedPlan.period}
              </Text>
            </View>

            {selectedPlan.features.map((f, i) => (
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

        {/* Coupon */}
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
            style={[styles.applyButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.buttonTextWhite}>{t("apply")}</Text>
          </TouchableOpacity>
        </View>

        {/* Subscribe */}
        <TouchableOpacity
          style={[styles.subscribeButton, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.buttonTextWhite}>{t("subscribeNow")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10 },

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
