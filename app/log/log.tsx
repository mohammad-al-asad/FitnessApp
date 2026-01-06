import { router, Stack, useLocalSearchParams } from "expo-router";
import { Plus, X } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLanguage, useSafeColors } from "@/hooks/language-context";
import { searchFood } from "@/services/food-api";
import { getFoodsFromSheetCached } from "@/services/googleSheetService";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ---- Types ----
type FoodRow = {
  brand: string;
  name: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  barcode?: string;
};

export default function LogFoodScreen() {
  const params = useLocalSearchParams();
  const selectedDate = Array.isArray(params.date) ? params.date[0] : (params.date as string | undefined);
  const scannedBarcode = Array.isArray(params.barcode) ? params.barcode[0] : (params.barcode as string | undefined);
  const { t, isRTL } = useLanguage();
  const colors = useSafeColors();
  const insets = useSafeAreaInsets();

  const [foods, setFoods] = useState<FoodRow[]>([]);
  const [filteredFoods, setFilteredFoods] = useState<FoodRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // ------- handle scanned barcode -------
  useEffect(() => {
    if (scannedBarcode && foods.length > 0) {
      const matchingFoods = foods.filter(food =>
        food.barcode === scannedBarcode ||
        food.name.toLowerCase().includes(scannedBarcode.toLowerCase()) ||
        food.brand.toLowerCase().includes(scannedBarcode.toLowerCase())
      );
      if (matchingFoods.length > 0) {
        setFilteredFoods(matchingFoods);
      } else {
        // If no exact match, show all foods and set search query to barcode
        setSearchQuery(scannedBarcode);
        setFilteredFoods(foods.slice(0, 150));
      }
    }
  }, [scannedBarcode, foods]);

  // ------- data load (cache → network) -------
  useEffect(() => {
    const fetchFoods = async () => {
      try {
        setLoading(true);
        const cached = await AsyncStorage.getItem("fitco_food_cache");
        if (cached) {
          const parsed: FoodRow[] = JSON.parse(cached);
          setFoods(parsed);
          setFilteredFoods(parsed.slice(0, 100));
        }

        const freshData = await getFoodsFromSheetCached();
        const formatted: FoodRow[] = (freshData ?? []).map((row: any) => ({
          brand: row["BRAND"] || "",
          name: row["PRODUCT"] || "Unnamed",
          serving: row["SERVING SIZE"] || "100g",
          calories: Number(row["CALORIES"]) || 0,
          protein: Number(row["PROTEIN"]) || 0,
          carbs: Number(row["CARBS"]) || 0,
          fats: Number(row["FAT"]) || 0,
          barcode: row["BARCODE ID"] || "",
        }));

        if (formatted.length) {
          setFoods(formatted);
          setFilteredFoods((prev) => (prev.length ? prev : formatted.slice(0, 100)));
          await AsyncStorage.setItem("fitco_food_cache", JSON.stringify(formatted));
        }
      } catch (err) {
        console.error("Error fetching foods:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFoods();
  }, []);

  // ------- search -------
  const onSearch = async (text: string) => {
    setSearchQuery(text);
    const q = text.trim();
    if (!q) {
      setFilteredFoods(foods.slice(0, 150));
      return;
    }

    try {
      const results = await searchFood(q);
      const normalized: FoodRow[] = (results ?? []).map((f: any) => ({
        brand: f.brand || "",
        name: f.name || "Unnamed",
        serving: f.serving || f.servingSize || "100g",
        calories: Number(f.calories) || 0,
        protein: Number(f.protein) || 0,
        carbs: Number(f.carbs) || 0,
        fats: Number(f.fats) || 0,
      }));
      setFilteredFoods(normalized.slice(0, 200));
    } catch (err) {
      console.error("Search error:", err);
    }
  };

  const title = useMemo(() => t("whatsOnMenu") || "What's on the menu today?", [t]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 12 }}>{t("loading")}</Text>
      </View>
    );
  }

 return (
  <>
    <Stack.Screen options={{ headerShown: false }} />

    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
        isRTL && { direction: "rtl" },
      ]}
    >
      {/* Custom Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable style={styles.closeButton} onPress={() => router.back()} hitSlop={10}>
          <X size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('logFood')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Title */}
      <Text
        style={[
          styles.title,
          { color: colors.text },
          isRTL && styles.rtlText,
        ]}
      >
        {title}
      </Text>

      {/* Search */}
      <View style={[styles.search, { backgroundColor: colors.surface }]}>
        <TextInput
          style={[
            styles.searchInput,
            { color: colors.text },
            { textAlign: isRTL ? 'right' : 'left' }
          ]}
          placeholder={(t("searchForDeliciousFuel") as string) || "Search for your delicious fuel!"}
          placeholderTextColor={colors.placeholder}
          value={searchQuery}
          onChangeText={onSearch}
          returnKeyType="search"
        />
      </View>

      {/* List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 28 }}
        keyboardShouldPersistTaps="handled"
      >
        {filteredFoods.length ? (
          filteredFoods.map((food, idx) => (
            <View
              key={`${food.name}-${idx}`}
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.surface },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.foodName, { color: colors.text, textAlign: isRTL ? 'left' : 'left' }]} numberOfLines={1}>
                  {food.name}
                </Text>

                <View style={styles.row}>
                  {!!food.brand && (
                    <Text style={[styles.brand, { color: colors.placeholder }]} numberOfLines={1}>
                      {food.brand}
                    </Text>
                  )}
                  <Text style={[styles.dot, { color: colors.placeholder }]}>•</Text>
                  <Text style={[styles.serving, { color: colors.placeholder }]} numberOfLines={1}>
                    {food.serving}
                  </Text>
                </View>

                <View style={styles.macroRow}>
                  <Text style={[styles.cal, { color: colors.primary }]}>{food.calories} {t('kcal')}</Text>
                  <Text style={[styles.macro, { color: colors.placeholder }]}>{t('p')} {food.protein} {t('g')}</Text>
                  <Text style={[styles.macro, { color: colors.placeholder }]}>{t('c')} {food.carbs} {t('g')}</Text>
                  <Text style={[styles.macro, { color: colors.placeholder }]}>{t('f')} {food.fats} {t('g')}</Text>
                </View>
              </View>

              <Pressable
                style={[styles.addBtn, { borderColor: colors.primary }]}
               onPress={() =>
  router.push({
    pathname: "/logFood",
    params: {
      foodData: JSON.stringify(food),
      date: selectedDate ?? new Date().toISOString().split("T")[0],
    },
  })
}


                android_ripple={{ color: colors.primary }}
              >
                <Plus size={18} color={colors.primary} />
              </Pressable>
            </View>
          ))
        ) : (
          <Text style={[styles.empty, { color: colors.placeholder }, isRTL && styles.rtlText]}>
            {"No foods found."}
          </Text>
        )}
           </ScrollView>
    </View>
  </>
);
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  headerTitle: { fontSize: 18, fontWeight: "600" },

  title: {
  fontSize: 20,
  fontWeight: "700",
  textAlign: "center",
  marginBottom: 14,
  marginTop: 18, // ⬅️ increase this a bit (you can tweak 18→20)
  letterSpacing: -0.3,
},


  search: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginHorizontal: 8,
  },

  list: { flex: 1 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },

  foodName: { fontSize: 16, fontWeight: "700", marginBottom: 2 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  brand: { fontSize: 12, fontWeight: "500" },
  serving: { fontSize: 12 },
  dot: { fontSize: 12, opacity: 0.6 },

  macroRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  cal: { fontSize: 14, fontWeight: "800", paddingRight: 10 },
  macro: { fontSize: 12, fontWeight: "600", paddingRight: 10 },

  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    marginLeft: 8,
  },

  empty: { textAlign: "center", marginTop: 40, fontSize: 16 },

  rtlText: { textAlign: "left" },
  rtlInput: { textAlign: "left" },
});
