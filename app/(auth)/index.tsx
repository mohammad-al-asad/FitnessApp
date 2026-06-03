import { useLanguage, useSafeColors } from "@/hooks/language-context";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WelcomeScreen() {
  const { t } = useLanguage();
  const colors = useSafeColors();

  // Animation values for rotation
  const outerRotateAnim = useRef(new Animated.Value(0)).current;
  const innerRotateAnim = useRef(new Animated.Value(0)).current;

  // Fade-in animation for layout elements
  const contentFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 🌀 Orbit animations
    const createLoop = (animValue: Animated.Value, duration: number, isClockwise = true) => {
      animValue.setValue(0);
      return Animated.loop(
        Animated.timing(animValue, {
          toValue: isClockwise ? 1 : -1,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
    };

    const outerLoop = createLoop(outerRotateAnim, 38000, true);
    const innerLoop = createLoop(innerRotateAnim, 30000, false); // Inner rotates counter-clockwise for contrast

    Animated.parallel([outerLoop, innerLoop]).start();

    // ✨ Smooth entrance fade-in
    Animated.timing(contentFadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    return () => {
      outerLoop.stop();
      innerLoop.stop();
    };
  }, []);

  // Interpolations for rotations
  const outerRotate = outerRotateAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-360deg", "360deg"],
  });

  const innerRotate = innerRotateAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-360deg", "360deg"],
  });

  // Interpolations for counter-rotations to keep emojis upright
  const outerRotateCounter = outerRotateAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ["360deg", "-360deg"],
  });

  const innerRotateCounter = innerRotateAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ["360deg", "-360deg"],
  });

  const handleGetStarted = () => {
    router.push({ pathname: "/(auth)/auth" as any, params: { mode: "signup" } });
  };

  const handleSignIn = () => {
    router.push({ pathname: "/(auth)/auth" as any, params: { mode: "signin" } });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={[styles.content, { opacity: contentFadeAnim }]}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={[styles.logo, { color: colors.accent }]}>FITCO</Text>
        </View>

        {/* Animation Orbit Section */}
        <View style={styles.orbitArea}>
          {/* Faint Concentric Circles */}
          <View style={[styles.circleLine, { width: 380, height: 380, borderRadius: 190 }]} />
          <View style={[styles.circleLine, { width: 280, height: 280, borderRadius: 140 }]} />

          {/* Outer Orbit (🥣 Cereal, 🍎 Apple, 🧀 Cheese) - spaced at 120-degree intervals */}
          <Animated.View style={[styles.orbitWrapper, { width: 380, height: 380, transform: [{ rotate: outerRotate }] }]}>
            <Animated.View style={[styles.emojiContainer, { top: -18, left: 190 - 18, transform: [{ rotate: outerRotateCounter }] }]}><Text style={styles.emojiText}>🥣</Text></Animated.View>
            <Animated.View style={[styles.emojiContainer, { top: 267, left: 8, transform: [{ rotate: outerRotateCounter }] }]}><Text style={styles.emojiText}>🍎</Text></Animated.View>
            <Animated.View style={[styles.emojiContainer, { top: 267, left: 336, transform: [{ rotate: outerRotateCounter }] }]}><Text style={styles.emojiText}>🧀</Text></Animated.View>
          </Animated.View>

          {/* Inner Orbit (🍞 Toast, 🥑 Avocado) - opposite sides (180 deg) */}
          <Animated.View style={[styles.orbitWrapper, { width: 280, height: 280, transform: [{ rotate: innerRotate }] }]}>
            <Animated.View style={[styles.emojiContainer, { top: 140 - 18, left: -18, transform: [{ rotate: innerRotateCounter }] }]}><Text style={styles.emojiText}>🍞</Text></Animated.View>
            <Animated.View style={[styles.emojiContainer, { top: 140 - 18, left: 280 - 18, transform: [{ rotate: innerRotateCounter }] }]}><Text style={styles.emojiText}>🥑</Text></Animated.View>
          </Animated.View>

          {/* Core Center Welcome Text Overlay */}
          <View style={styles.centerTextOverlay}>
            <Text style={[styles.welcomeTitle, { color: colors.text }]}>
              {t("welcomeToFitco")}
            </Text>
            <Text style={[styles.welcomeSubtitle, { color: colors.placeholder }]}>
              {t("makeEveryDayCountWelcome")}
            </Text>
          </View>
        </View>

        {/* Buttons / Bottom Actions Section */}
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.accent }]}
            onPress={handleGetStarted}
            activeOpacity={0.8}
          >
            <Text style={[styles.primaryButtonText, { color: colors.background }]}>
              {t("getStarted")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSignIn} activeOpacity={0.7} style={styles.signInLink}>
            <Text style={[styles.signInText, { color: colors.text }]}>
              {t("alreadyHaveAccount")}{" "}
              <Text style={[styles.signInHighlight, { color: colors.accent }]}>
                {t("signIn")}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>

      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: "center",
    marginTop: 16,
  },
  logo: {
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: -1.5,
    includeFontPadding: false,
    textShadowColor: "rgba(0, 0, 0, 0.15)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  orbitArea: {
    height: 420,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  circleLine: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    borderStyle: "solid",
  },
  orbitWrapper: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  emojiContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    width: 36,
    height: 36,
  },
  emojiText: {
    fontSize: 24,
  },
  centerTextOverlay: {
    position: "absolute",
    width: "70%",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  welcomeSubtitle: {
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
    textShadowColor: "rgba(0, 0, 0, 0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  bottomSection: {
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
  },
  primaryButton: {
    width: "100%",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: "700",
  },
  signInLink: {
    marginTop: 18,
    padding: 8,
  },
  signInText: {
    fontSize: 16,
    fontWeight: "500",
  },
  signInHighlight: {
    fontWeight: "700",
  },
});
