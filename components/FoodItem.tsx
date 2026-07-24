import colors from "@/constants/colors";
import { useLanguage } from "@/hooks/language-context";
import { Image } from "expo-image";
import { Pencil, Sparkles, Trash2 } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface FoodItemProps {
  loggedFood: any;
  onRemove: (foodId: string) => Promise<void> | void;
  onEdit?: (loggedFood: any) => void;
  showRemove?: boolean;
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getFoodValues(loggedFood: any) {
  const item = loggedFood?.foodItem ?? loggedFood ?? {};
  const quantity = toNumber(loggedFood?.quantity) || 1;
  const calories =
    loggedFood?.calories != null
      ? toNumber(loggedFood.calories)
      : toNumber(item.calories) * quantity;
  const protein =
    loggedFood?.protein != null
      ? toNumber(loggedFood.protein)
      : toNumber(item.protein) * quantity;
  const carbs =
    loggedFood?.carbs != null
      ? toNumber(loggedFood.carbs)
      : toNumber(item.carbs) * quantity;
  const fat =
    loggedFood?.fat != null
      ? toNumber(loggedFood.fat)
      : toNumber(item.fats ?? item.fat) * quantity;

  return {
    name: item.name || loggedFood?.foodName || "Unnamed Food",
    brand: item.brand || loggedFood?.brandName || "",
    calories,
    protein,
    carbs,
    fat,
    imageUrl: loggedFood?.imageUrl || item.imageUrl,
    isAi: Boolean(loggedFood?.isAi || item.isAi || loggedFood?.source === "ai"),
    confidence: loggedFood?.confidence ?? item.confidence,
  };
}

export default function FoodItem({
  loggedFood,
  onRemove,
  onEdit,
  showRemove = false,
}: FoodItemProps) {
  const { t } = useLanguage();
  const values = getFoodValues(loggedFood);

  return (
    <View style={styles.container}>
      {values.imageUrl ? (
        <Image
          source={{ uri: values.imageUrl }}
          style={styles.foodImage}
          contentFit="cover"
        />
      ) : (
        <View style={styles.imageFallback}>
          <Text style={styles.imageFallbackText}>
            {String(values.name).slice(0, 1).toUpperCase()}
          </Text>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <View style={styles.titleColumn}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={2}>
                {values.name}
              </Text>
              {values.isAi && (
                <View style={styles.aiBadge}>
                  <Sparkles size={11} color={colors.background} />
                  <Text style={styles.aiBadgeText}>AI</Text>
                </View>
              )}
            </View>
            {!!values.brand && (
              <Text style={styles.brand} numberOfLines={1}>
                {values.brand}
              </Text>
            )}
          </View>

          <View style={styles.actions}>
            {onEdit && (
              <TouchableOpacity
                style={styles.iconAction}
                onPress={() => onEdit(loggedFood)}
                activeOpacity={0.75}
              >
                <Pencil size={15} color={colors.text} />
              </TouchableOpacity>
            )}
            {showRemove && (
              <TouchableOpacity
                style={[styles.iconAction, styles.deleteAction]}
                onPress={() => loggedFood?.id && onRemove(String(loggedFood.id))}
                activeOpacity={0.75}
              >
                <Trash2 size={15} color="#FF6B35" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.macroRow}>
          <Text style={[styles.macroPill, styles.caloriePill]}>
            {Math.round(values.calories)} {t("kcal")}
          </Text>
          <Text style={styles.macroPill}>
            {t("p")} {Math.round(values.protein * 10) / 10}
            {t("g")}
          </Text>
          <Text style={styles.macroPill}>
            {t("c")} {Math.round(values.carbs * 10) / 10}
            {t("g")}
          </Text>
          <Text style={styles.macroPill}>
            {t("f")} {Math.round(values.fat * 10) / 10}
            {t("g")}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  foodImage: {
    width: 58,
    height: 58,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  imageFallback: {
    width: 58,
    height: 58,
    borderRadius: 12,
    backgroundColor: "rgba(76,175,80,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageFallbackText: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: "800",
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  titleColumn: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
    flexShrink: 1,
  },
  brand: {
    color: colors.placeholder,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  aiBadgeText: {
    color: colors.background,
    fontSize: 10,
    fontWeight: "900",
  },
  actions: {
    flexDirection: "row",
    gap: 6,
  },
  iconAction: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteAction: {
    backgroundColor: "rgba(255,107,53,0.12)",
  },
  macroRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  macroPill: {
    color: colors.placeholder,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "800",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    includeFontPadding: false,
    overflow: "hidden",
  },
  caloriePill: {
    color: colors.primary,
    backgroundColor: "rgba(76,175,80,0.12)",
  },
});
