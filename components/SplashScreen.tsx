// SplashScreen — animated intro displaying the "FITCO" logo and tagline with smooth letter-by-letter transitions before entering the main app.
import { translations } from "@/constants/translations";
import { useLanguage } from "@/hooks/language-context";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const colors = {
    background: "#1A1A1A",
    accent: "#4CAF50",
    text: "#FFFFFF",
  };

  const { t, isRTL } = useLanguage();

  const taglines = isRTL ? translations.ar.splash_taglines : translations.en.splash_taglines;


  const [tagline, setTagline] = useState("");
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * taglines.length);
    setTagline(taglines[randomIndex]);
  }, []);

  const letterAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const fadeAnimation = useRef(new Animated.Value(1)).current;
  const sloganAnimation = useRef(new Animated.Value(0)).current;
  const madeInSaudiAnimation = useRef(new Animated.Value(0)).current;

  const hasFinished = useRef(false);
  const handleAnimationComplete = useCallback(() => {
    if (hasFinished.current) return;
    hasFinished.current = true;
    if (typeof onFinish === "function") onFinish();
  }, [onFinish]);

  useEffect(() => {
    const letterSequence = letterAnimations.map((anim, i) =>
      Animated.sequence([
        Animated.delay(i * 60),
        Animated.timing(anim, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
      ])
    );

    Animated.parallel(letterSequence).start(() => {
      Animated.sequence([
        Animated.timing(sloganAnimation, {
          toValue: 1,
          duration: 500,
          delay: 150,
          useNativeDriver: true,
        }),
        Animated.timing(madeInSaudiAnimation, {
          toValue: 1,
          duration: 500,
          delay: 120,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTimeout(() => {
          Animated.timing(fadeAnimation, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }).start(handleAnimationComplete);
        }, 900);
      });
    });
  }, []);

  const letters = ["F", "I", "T", "C", "O"];

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnimation, backgroundColor: colors.background, direction: "ltr" },
      ]}
    >
      <View style={[styles.content, { direction: "ltr" }]}>
        {/* FITCO animation */}
        <View style={[styles.logoContainer, { direction: "ltr" }]}>
          {letters.map((letter: string, index: number) => {
            const animatedStyle = {
              transform: [
                {
                  translateY: letterAnimations[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
                {
                  scale: letterAnimations[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
                {
                  rotateZ: letterAnimations[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: ["10deg", "0deg"],
                  }),
                },
              ],
              opacity: letterAnimations[index].interpolate({
                inputRange: [0, 0.3, 1],
                outputRange: [0, 0.7, 1],
              }),
            };

            return (
              <Animated.Text
                key={`letter-${letter}-${index}`}
                style={[
                  styles.letter,
                  animatedStyle,
                  { color: colors.accent, writingDirection: "ltr" as "ltr" },
                ]}
                allowFontScaling={false}
              >
                {letter}
              </Animated.Text>
            );
          })}
        </View>

        {/* Tagline */}
        <Animated.View
          style={[
            styles.sloganContainer,
            {
              opacity: sloganAnimation,
              transform: [
                {
                  translateY: sloganAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={[styles.slogan, { color: colors.text }]}>{tagline}</Text>
        </Animated.View>

        {/* Made in Saudi */}
        <Animated.View
          style={[
            styles.madeInSaudiContainer,
            {
              opacity: madeInSaudiAnimation,
              transform: [
                {
                  translateY: madeInSaudiAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={[styles.madeInSaudi, { color: colors.text }]}>
            {t('madeInSaudi')}
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  logoContainer: { flexDirection: "row", alignItems: "center" },
  letter: {
    fontSize: 72,
    fontWeight: "900",
    marginHorizontal: 1,
    includeFontPadding: false,
    letterSpacing: -2,
    textShadowColor: "rgba(0, 0, 0, 0.1)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  sloganContainer: {
    position: "absolute",
    bottom: 100,
    width: "100%",
    alignItems: "center",
  },
  slogan: {
  fontSize: 17,
  fontWeight: "500",
  letterSpacing: 1.2,
  textAlign: "center",
  opacity: 0.85,
},
  madeInSaudiContainer: {
    position: "absolute",
    bottom: 60,
    width: "100%",
    alignItems: "center",
  },
  madeInSaudi: {
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 1,
    textAlign: "center",
    opacity: 0.9,
  },
});
