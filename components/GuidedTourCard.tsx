// 💡 GuidedTourCard.tsx — Sleek Tooltip Card for Guided Steps
import React, { useEffect } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { Sparkles, Check } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useLanguage } from "@/hooks/language-context";

interface Props {
  stepNumber: 1 | 2 | 3;
  totalSteps?: number;
  title: string;
  description: string;
  arrowPosition?: "top" | "bottom" | "none";
  actionText?: string;
  onActionPress?: () => void;
  showCheckmark?: boolean;
}

export default function GuidedTourCard({
  stepNumber,
  totalSteps = 3,
  title,
  description,
  arrowPosition = "bottom",
  actionText,
  onActionPress,
  showCheckmark,
}: Props) {
  const { isRTL } = useLanguage();
  const isCongratulations = stepNumber === 3 || showCheckmark;

  // Reanimated shared values
  const pulseAnim = useSharedValue(1);
  const bounceAnim = useSharedValue(0);

  // Checkmark animation shared values
  const checkCircleScale = useSharedValue(0);
  const checkIconScale = useSharedValue(0);
  const glowRingScale = useSharedValue(0.85);
  const glowRingOpacity = useSharedValue(0.7);
  const glowRing2Scale = useSharedValue(0.75);
  const glowRing2Opacity = useSharedValue(0.4);

  useEffect(() => {
    // Pulse animation for sparkles / badge
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 700 }),
        withTiming(1, { duration: 700 })
      ),
      -1,
      true
    );

    if (!isCongratulations) {
      // Floating bounce animation for tooltip card
      bounceAnim.value = withRepeat(
        withSequence(
          withTiming(-6, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      // Trigger haptic feedback for congratulations
      try {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Fallback if haptics unavailable
      }

      // Checkmark entrance animations with spring physics
      checkCircleScale.value = withSpring(1, {
        damping: 10,
        stiffness: 140,
        mass: 0.8,
      });

      checkIconScale.value = withDelay(
        140,
        withSpring(1, {
          damping: 8,
          stiffness: 160,
          mass: 0.7,
        })
      );

      // Continuous glowing pulse rings
      glowRingScale.value = withRepeat(
        withSequence(
          withTiming(1.35, { duration: 1500, easing: Easing.out(Easing.ease) }),
          withTiming(0.9, { duration: 1500, easing: Easing.in(Easing.ease) })
        ),
        -1,
        false
      );

      glowRingOpacity.value = withRepeat(
        withSequence(
          withTiming(0.1, { duration: 1500 }),
          withTiming(0.7, { duration: 1500 })
        ),
        -1,
        false
      );

      glowRing2Scale.value = withRepeat(
        withSequence(
          withTiming(1.45, { duration: 1700, easing: Easing.out(Easing.ease) }),
          withTiming(0.8, { duration: 1700, easing: Easing.in(Easing.ease) })
        ),
        -1,
        false
      );

      glowRing2Opacity.value = withRepeat(
        withSequence(
          withTiming(0.05, { duration: 1700 }),
          withTiming(0.45, { duration: 1700 })
        ),
        -1,
        false
      );
    }
  }, [
    isCongratulations,
    pulseAnim,
    bounceAnim,
    checkCircleScale,
    checkIconScale,
    glowRingScale,
    glowRingOpacity,
    glowRing2Scale,
    glowRing2Opacity,
  ]);

  // Animated styles
  const containerAnimatedStyle = useAnimatedStyle(() => {
    if (isCongratulations) {
      return {};
    }
    return {
      transform: [{ translateY: bounceAnim.value }],
    };
  });

  const pulseBadgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const checkCircleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkCircleScale.value }],
  }));

  const checkIconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkIconScale.value }],
  }));

  const glowRingAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowRingScale.value }],
    opacity: glowRingOpacity.value,
  }));

  const glowRing2AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowRing2Scale.value }],
    opacity: glowRing2Opacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      {arrowPosition === "top" && <View style={styles.arrowTop} />}

      <View style={[styles.card, isCongratulations && styles.congratulationsCard]}>
        {/* Step Badge */}
        <View
          style={[
            styles.headerRow,
            isCongratulations
              ? styles.centeredHeaderRow
              : isRTL
              ? styles.rtlRow
              : styles.ltrRow,
          ]}
        >
          <View style={styles.stepBadgeGroup}>
            <Animated.View
              style={[styles.iconBadge, pulseBadgeAnimatedStyle]}
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

        {/* Animated Bigger Checkmark / Tick for Step 3 Congratulations */}
        {isCongratulations && (
          <View style={styles.tickContainer}>
            {/* Outer Glow Ring 2 (Soft Ambient Wave) */}
            <Animated.View
              style={[styles.glowRingOuter, glowRing2AnimatedStyle]}
            />
            {/* Inner Glow Ring (Pulsing Border) */}
            <Animated.View
              style={[styles.glowRing, glowRingAnimatedStyle]}
            />
            {/* Main Vibrant Green Tick Circle */}
            <Animated.View
              style={[styles.tickCircle, checkCircleAnimatedStyle]}
            >
              {/* Scaled-up Bold Check Icon */}
              <Animated.View style={checkIconAnimatedStyle}>
                <Check size={46} color="#FFFFFF" strokeWidth={4} />
              </Animated.View>
            </Animated.View>
          </View>
        )}

        {/* Title */}
        <Text
          style={[
            styles.title,
            isCongratulations
              ? styles.centeredTitle
              : isRTL
              ? styles.rtlText
              : styles.ltrText,
          ]}
        >
          {title}
        </Text>

        {/* Description */}
        <Text
          style={[
            styles.description,
            isCongratulations
              ? styles.centeredDescription
              : isRTL
              ? styles.rtlText
              : styles.ltrText,
          ]}
        >
          {description}
        </Text>

        {/* Action Button */}
        {actionText && onActionPress && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              isCongratulations && styles.congratulationsActionButton,
            ]}
            onPress={onActionPress}
            activeOpacity={0.85}
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
    marginHorizontal: 16,
    maxWidth: 360,
    width: "100%",
    alignSelf: "center",
    zIndex: 99999,
  },
  card: {
    backgroundColor: "#1c1c1e",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1.5,
    borderColor: "#22c55e",
    shadowColor: "#22c55e",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 12,
    width: "100%",
  },
  congratulationsCard: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    backgroundColor: "#18181b",
    borderColor: "rgba(34, 197, 94, 0.85)",
    shadowOpacity: 0.5,
    shadowRadius: 22,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    width: "100%",
  },
  centeredHeaderRow: {
    justifyContent: "center",
    marginBottom: 12,
  },
  ltrRow: {
    justifyContent: "flex-start",
  },
  rtlRow: {
    flexDirection: "row-reverse",
    justifyContent: "flex-start",
  },
  stepBadgeGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.25)",
    gap: 6,
  },
  iconBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(34, 197, 94, 0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    color: "#22c55e",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  tickContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
    width: 108,
    height: 108,
  },
  glowRingOuter: {
    position: "absolute",
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: "rgba(34, 197, 94, 0.12)",
  },
  glowRing: {
    position: "absolute",
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "rgba(34, 197, 94, 0.24)",
    borderWidth: 2,
    borderColor: "rgba(34, 197, 94, 0.55)",
  },
  tickCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.65,
    shadowRadius: 18,
    elevation: 10,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
  },
  centeredTitle: {
    textAlign: "center",
    fontSize: 21,
    fontWeight: "800",
    marginTop: 4,
    marginBottom: 8,
  },
  description: {
    color: "#D1D5DB",
    fontSize: 13,
    lineHeight: 19,
  },
  centeredDescription: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 22,
    color: "#A1A1AA",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  ltrText: {
    textAlign: "left",
  },
  rtlText: {
    textAlign: "right",
  },
  actionButton: {
    marginTop: 14,
    backgroundColor: "#22c55e",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  congratulationsActionButton: {
    marginTop: 16,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#22c55e",
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
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


