// MacroCircle & CalorieCircle — circular progress components visualizing macro and calorie intake vs daily goals.

import { useLanguage, useSafeColors } from "@/hooks/language-context";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface MacroCircleProps {
  label: string;
  current: number;
  goal: number;
  color: string;
  size?: number;
}

interface CalorieCircleProps {
  current: number;
  goal: number;
  size?: number;
  showPercentage?: boolean;
  textSize?: "small" | "normal";
}

export default function MacroCircle({
  label,
  current,
  goal,
  color,
  size = 80,
}: MacroCircleProps) {
  const colors = useSafeColors();
  const { isRTL, t } = useLanguage();

  const overLimit = current > goal;
  const percentage = Math.min((current / goal) * 100, 100);
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset =
    circumference - (percentage / 100) * circumference;
  const backgroundStroke = colors.border;

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size },
        isRTL && { transform: [{ scaleX: -1 }] },
      ]}
    >
      {overLimit && (
        <View
          style={[
            styles.glow,
            {
              backgroundColor: color,
              shadowColor: color,
            },
          ]}
        />
      )}

      <Svg
        width={size}
        height={size}
        style={[styles.svg, isRTL && { transform: [{ scaleX: -1 }] }]}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundStroke}
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View
        style={[
          styles.content,
          isRTL && { transform: [{ scaleX: -1 }] },
        ]}
      >
        <Text style={[styles.value, { color: colors.text }]}>
          {Math.round(current)}
        </Text>
        <Text style={[styles.goal, { color: colors.placeholder }]}>
          /{Math.round(goal)}
        </Text>
        <Text style={[styles.label, { color: colors.placeholder }]}>
          {label}
        </Text>

        {overLimit && (
          <Text style={[styles.overText, { color }]}>
            {`${Math.round(current - goal)} ${' ' + t('g') + ' ' + t('over')}`}
          </Text>
        )}
      </View>
    </View>
  );
}

export function CalorieCircle({
  current,
  goal,
  size = 120,
  showPercentage = true,
  textSize = "normal",
}: CalorieCircleProps) {
  const colors = useSafeColors();
  const { isRTL, t } = useLanguage();
  const overLimit = current > goal;
  const percentage = Math.min((current / goal) * 100, 100);
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset =
    circumference - (percentage / 100) * circumference;

  const circleColor = colors.primary;
  const backgroundStroke = colors.border;

  return (
    <View
      style={[
        styles.container,
        { width: size , height: size },
      ]}
    >
      {overLimit && (
        <View
          style={[
            styles.glow,
            {
              backgroundColor: circleColor,
              shadowColor: circleColor,
            },
          ]}
        />
      )}

      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundStroke}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={circleColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View style={styles.calorieContent}>
        {showPercentage && (
          <Text
            style={[
              styles.percentage,
              textSize === "small" && styles.percentageSmall,
              { color: colors.primary },
            ]}
          >
            {Math.round(percentage)}%
          </Text>
        )}
        <Text
          style={[
            styles.calorieValue,
            textSize === "small" && styles.calorieValueSmall,
            { color: colors.text },
          ]}
        >
          {Math.round(current)}
        </Text>
        <Text
          style={[
            styles.calorieGoal,
            textSize === "small" && styles.calorieGoalSmall,
            { color: colors.placeholder },
          ]}
        >
          {isRTL
            ? `${t("ofDailyGoal")} ${Math.round(goal)} ${t("cal")}`
            : `${t("ofCalories")} ${Math.round(goal)} ${t("cal")}`}
        </Text>

        {overLimit && (
          <Text style={[styles.overText, { color: circleColor }]}>
            {`${Math.round(current - goal)} ${' ' + t('cal') + ' ' + t('over')}`}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  svg: {
    position: "absolute",
  },
  glow: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 999,
    opacity: 0.2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: "bold",
    lineHeight: 18,
  },
  goal: {
    fontSize: 12,
    lineHeight: 14,
  },
  label: {
    fontSize: 10,
    marginTop: 4,
    textTransform: "uppercase",
    fontWeight: "600",
    lineHeight: 12,
    textAlign: "center",
  },
  overText: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: "600",
    textAlign: "center",
  },
  calorieContent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    gap: 0,
  },
  percentage: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "center",
    alignSelf: "center",
    transform: [{ translateX: 4 }],
  },
  calorieValue: {
    fontSize: 24,
    fontWeight: "bold",
    lineHeight: 28,
  },
  calorieGoal: {
    fontSize: 10,
    marginTop: 4,
    lineHeight: 12,
    textAlign: "center",
  },
  percentageSmall: {
    fontSize: 10,
    lineHeight: 12,
  },
  calorieValueSmall: {
    fontSize: 16,
    lineHeight: 18,
  },
  calorieGoalSmall: {
    fontSize: 8,
    lineHeight: 10,
  },
});

