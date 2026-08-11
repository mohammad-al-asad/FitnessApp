// 💡 GuidedTourCard.tsx — Sleek Tooltip Card for Guided Steps
import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Sparkles } from "lucide-react-native";
import { useLanguage } from "@/hooks/language-context";

interface Props {
  stepNumber: 1 | 2 | 3;
  totalSteps?: number;
  title: string;
  description: string;
  arrowPosition?: "top" | "bottom" | "none";
  actionText?: string;
  onActionPress?: () => void;
}

export default function GuidedTourCard({
  stepNumber,
  totalSteps = 3,
  title,
  description,
  arrowPosition = "bottom",
  actionText,
  onActionPress,
}: Props) {
  const { isRTL } = useLanguage();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation for sparkles / badge
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Floating bounce animation for tooltip card
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -5,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [bounceAnim, pulseAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: bounceAnim }] },
      ]}
    >
      {arrowPosition === "top" && <View style={styles.arrowTop} />}

      <View style={styles.card}>
        <View style={[styles.headerRow, isRTL && styles.rtlRow]}>
          <View style={styles.stepBadgeGroup}>
            <Animated.View
              style={[
                styles.iconBadge,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <Sparkles size={14} color="#22c55e" />
            </Animated.View>
            <Text style={styles.stepText}>
              {isRTL
                ? `الخطوة ${stepNumber} من ${totalSteps}`
                : `Step ${stepNumber} of ${totalSteps}`}
            </Text>
          </View>
        </View>

        <Text style={[styles.title, isRTL && styles.rtlText]}>{title}</Text>
        <Text style={[styles.description, isRTL && styles.rtlText]}>
          {description}
        </Text>

        {actionText && onActionPress && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onActionPress}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>{actionText}</Text>
          </TouchableOpacity>
        )}
      </View>

      {arrowPosition === "bottom" && <View style={styles.arrowBottom} />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginHorizontal: 20,
    maxWidth: 340,
    alignSelf: "center",
    zIndex: 99999,
  },
  card: {
    backgroundColor: "#1f1f23",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#22c55e",
    shadowColor: "#22c55e",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 12,
    width: "100%",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  rtlRow: {
    flexDirection: "row-reverse",
  },
  stepBadgeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(34, 197, 94, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    color: "#22c55e",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  description: {
    color: "#D1D5DB",
    fontSize: 13,
    lineHeight: 18,
  },
  rtlText: {
    textAlign: "right",
  },
  actionButton: {
    marginTop: 12,
    backgroundColor: "#22c55e",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  arrowBottom: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#22c55e",
    alignSelf: "center",
    marginTop: -1,
  },
  arrowTop: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#22c55e",
    alignSelf: "center",
    marginBottom: -1,
  },
});
