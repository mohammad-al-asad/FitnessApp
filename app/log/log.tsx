import { router, useLocalSearchParams } from "expo-router";
import { Plus, X } from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLanguage, useSafeColors } from "@/hooks/language-context";
import { FoodApiItem, getLogFoodsPage } from "@/services/food-api";

const PAGE_LIMIT = 25;
const SEARCH_DEBOUNCE_MS = 350;

function foodKey(food: FoodApiItem): string {
  return (
    food.id ||
    `${food.name}|${food.brand}|${food.serving}|${food.barcode || ""}`
  );
}

export default function LogFoodScreen() {
  const params = useLocalSearchParams();
  const selectedDate = Array.isArray(params.date)
    ? params.date[0]
    : (params.date as string | undefined);
  const scannedBarcode = Array.isArray(params.barcode)
    ? params.barcode[0]
    : (params.barcode as string | undefined);

  const { t, isRTL } = useLanguage();
  const colors = useSafeColors();
  const insets = useSafeAreaInsets();

  const [foods, setFoods] = useState<FoodApiItem[]>([]);
  const [searchQuery, setSearchQuery] = useState(scannedBarcode || "");
  const [debouncedQuery, setDebouncedQuery] = useState(
    (scannedBarcode || "").trim(),
  );

  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  useEffect(() => {
    if (scannedBarcode) {
      setSearchQuery(scannedBarcode);
      setDebouncedQuery(scannedBarcode.trim());
    }
  }, [scannedBarcode]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const loadFoods = useCallback(
    async ({
      pageToLoad,
      replace,
    }: {
      pageToLoad: number;
      replace: boolean;
    }) => {
      const requestId = ++requestIdRef.current;

      if (replace) {
        setLoadingInitial(true);
        setErrorMessage(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const response = await getLogFoodsPage({
          page: pageToLoad,
          limit: PAGE_LIMIT,
          search: debouncedQuery || undefined,
        });

        if (requestId !== requestIdRef.current) return;

        setFoods((prev) => {
          if (replace) return response.items;

          const merged = [...prev];
          const seen = new Set(prev.map(foodKey));

          response.items.forEach((item) => {
            const key = foodKey(item);
            if (!seen.has(key)) {
              seen.add(key);
              merged.push(item);
            }
          });

          return merged;
        });

        setPage(response.page);
        setHasNextPage(response.hasNextPage);
      } catch (error: any) {
        if (requestId !== requestIdRef.current) return;

        console.error("Error loading foods:", error);
        setErrorMessage(
          error?.message ? String(error.message) : String(t("failedToLoadFoods")),
        );

        if (replace) {
          setFoods([]);
          setHasNextPage(false);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoadingInitial(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [debouncedQuery, t],
  );

  useEffect(() => {
    setPage(1);
    setHasNextPage(true);
    loadFoods({ pageToLoad: 1, replace: true });
  }, [debouncedQuery, loadFoods]);

  const handleLoadMore = () => {
    if (loadingInitial || loadingMore || !hasNextPage) return;
    loadFoods({ pageToLoad: page + 1, replace: false });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    setHasNextPage(true);
    loadFoods({ pageToLoad: 1, replace: true });
  };

  const title = useMemo(() => t("whatsOnMenu"), [t]);

  const renderFoodItem = ({ item }: { item: FoodApiItem }) => (
    <View
      style={[
        styles.card,
        { flexDirection: isRTL ? "row-reverse" : "row" },
        { backgroundColor: colors.surface, borderColor: colors.surface },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.foodName,
            {
              color: colors.text,
              textAlign: "left",
            },
          ]}
          numberOfLines={1}
        >
          {item.name}
        </Text>

        <View
          style={[
            styles.row,
            {
              flexDirection: isRTL ? "row-reverse" : "row",
              justifyContent: isRTL ? "flex-end" : "flex-start",
            },
          ]}
        >
          {!!item.brand && (
            <Text
              style={[
                styles.brand,
                {
                  color: colors.placeholder,
                  textAlign: isRTL ? "right" : "left",
                },
              ]}
              numberOfLines={1}
            >
              {item.brand}
            </Text>
          )}
          {!!item.brand && (
            <Text style={[styles.dot, { color: colors.placeholder }]}>|</Text>
          )}
          <Text
            style={[
              styles.serving,
              {
                color: colors.placeholder,
                textAlign: isRTL ? "right" : "left",
              },
            ]}
            numberOfLines={1}
          >
            {item.serving}
          </Text>
        </View>

        <View
          style={[
            styles.macroRow,
            {
              flexDirection: isRTL ? "row" : "row-reverse",
              justifyContent: isRTL ? "flex-start" : "flex-end",
            },
          ]}
        >
          <Text
            style={[
              styles.cal,
              { color: colors.primary },
              isRTL
                ? { paddingLeft: 10, paddingRight: 0 }
                : { paddingRight: 10, paddingLeft: 0 },
            ]}
          >
            {item.calories} {t("kcal")}
          </Text>
          <Text
            style={[
              styles.macro,
              { color: colors.placeholder },
              isRTL
                ? { paddingLeft: 10, paddingRight: 0 }
                : { paddingRight: 10, paddingLeft: 0 },
            ]}
          >
            {t("p")} {item.protein} {t("g")}
          </Text>
          <Text
            style={[
              styles.macro,
              { color: colors.placeholder },
              isRTL
                ? { paddingLeft: 10, paddingRight: 0 }
                : { paddingRight: 10, paddingLeft: 0 },
            ]}
          >
            {t("c")} {item.carbs} {t("g")}
          </Text>
          <Text
            style={[
              styles.macro,
              { color: colors.placeholder },
              isRTL
                ? { paddingLeft: 10, paddingRight: 0 }
                : { paddingRight: 10, paddingLeft: 0 },
            ]}
          >
            {t("f")} {item.fats} {t("g")}
          </Text>
        </View>
      </View>

      <Pressable
        style={[
          styles.addBtn,
          { borderColor: colors.primary },
          isRTL
            ? { marginRight: 8, marginLeft: 0 }
            : { marginLeft: 8, marginRight: 0 },
        ]}
        onPress={() =>
          router.push({
            pathname: "/logFood",
            params: {
              foodData: JSON.stringify(item),
              date: selectedDate ?? new Date().toISOString().split("T")[0],
              meal: params.meal,
            },
          })
        }
        android_ripple={{ color: colors.primary }}
      >
        <Plus size={18} color={colors.primary} />
      </Pressable>
    </View>
  );

  if (loadingInitial && foods.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 12 }}>
          {t("loading")}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
        isRTL && { direction: "rtl" },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          style={styles.closeButton}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <X size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t("logFood")}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <Text
        style={[styles.title, { color: colors.text }, isRTL && styles.rtlText]}
      >
        {title}
      </Text>

      <View style={[styles.search, { backgroundColor: colors.surface }]}>
        <TextInput
          style={[
            styles.searchInput,
            { color: colors.text },
            { textAlign: isRTL ? "right" : "left" },
          ]}
          placeholder={
            t("searchForDeliciousFuel") as string
          }
          placeholderTextColor={colors.placeholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
      </View>

      <FlatList
        data={foods}
        style={styles.list}
        contentContainerStyle={{
          paddingBottom: 28,
          flexGrow: foods.length ? 0 : 1,
        }}
        keyExtractor={(item, index) => `${foodKey(item)}-${index}`}
        renderItem={renderFoodItem}
        keyboardShouldPersistTaps="handled"
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.35}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <Text
            style={[
              styles.empty,
              { color: colors.placeholder },
              isRTL && styles.rtlText,
            ]}
          >
            {errorMessage || String(t("noFoodsFound"))}
          </Text>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
      />
    </View>
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
    marginTop: 18,
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
  brand: { fontSize: 12, fontWeight: "500", flexShrink: 1 },
  serving: { fontSize: 12, flexShrink: 1 },
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
  footerLoader: { paddingVertical: 16 },

  rtlText: { textAlign: "left" },
});
