// Displays the main Home screen — showing daily calories, macros, weekly summary, streaks, and insights
// with a horizontal day selector at the top and a floating FitBot assistant at the bottom.

import FloatingFitBot from "@/components/FloatingFitBot";
import MacroCircle, { CalorieCircle } from "@/components/MacroCircle";
import { MacroColors } from "@/constants/colors";
import { useAuth } from "@/hooks/auth-context";
import { useLanguage, useSafeColors } from "@/hooks/language-context";
import { useNutrition } from "@/hooks/nutrition-store";
import {
  FoodLogsHomeResponse,
  FoodLogsWeeklySummaryResponse,
  getFoodLogsHome,
  getFoodLogsWeeklySummary,
} from "@/services/food-api";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import {
  Award,
  Coffee,
  Flame,
  Moon,
  Plus,
  Sun,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { responsiveWidth } from "@/utilities/ScalingUtils";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekStartDate(dateString: string): string {
  const [year, month, day] = dateString.split("-").map((part) => Number(part));
  const date = new Date(year, (month || 1) - 1, day || 1);
  const offset = date.getDay();
  date.setDate(date.getDate() - offset);
  return formatLocalDate(date);
}

function getWeekdayLabel(dateString: string): string {
  const [year, month, day] = dateString.split("-").map((part) => Number(part));
  const date = new Date(year, (month || 1) - 1, day || 1);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

const HOME_REFRESH_INTERVAL_MS = 60 * 1000;

export default function HomeScreen() {
  // useEffect(() => {
  //   AsyncStorage.setItem("fitco_language", "ar");
  // }, []);

  // --- Small inline component ---
  const StreakBadge = ({ count }: { count: number }) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#4A3A28",
        borderRadius: 24,
        paddingHorizontal: 14,
        paddingVertical: 8,
        gap: 6,
        marginLeft: 20,
      }}
    >
      <Flame size={20} color="#FF6B35" fill="#FF6B35" />
      <Text style={{ color: "#FFA500", fontWeight: "700", fontSize: 16 }}>
        {count}
      </Text>
    </View>
  );

  // --- Hooks / contexts ---
  const { showFirstSignInSubscriptionPromptIfPending } = useAuth();
  const { settings, getTodayLog, getProgressData, getLogByDate, lastUpdateTimestamp } =
    useNutrition();
  const { t, isRTL } = useLanguage();
  const colors = useSafeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedDay] = useState(() => formatLocalDate(new Date()));
  const [homeData, setHomeData] = useState<FoodLogsHomeResponse | null>(null);
  const [weeklyData, setWeeklyData] =
    useState<FoodLogsWeeklySummaryResponse | null>(null);
  const [homeLoading, setHomeLoading] = useState(false);
  const [homeError, setHomeError] = useState<string | null>(null);
  const lastFetchedRef = useRef<{ date: string; time: number } | null>(null);

  useEffect(() => {
    void showFirstSignInSubscriptionPromptIfPending();
  }, [showFirstSignInSubscriptionPromptIfPending]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadHomeData = async () => {
        const now = Date.now();
        const lastFetch = lastFetchedRef.current;
        const isFreshForSameDate =
          !!lastFetch &&
          lastFetch.date === selectedDay &&
          lastFetch.time > lastUpdateTimestamp &&
          now - lastFetch.time < HOME_REFRESH_INTERVAL_MS;

        if (isFreshForSameDate && homeData && weeklyData) return;

        if (!homeData || !weeklyData) {
          setHomeLoading(true);
        }
        setHomeError(null);

        const weekStartDate = getWeekStartDate(selectedDay);
        const [homeResult, weeklyResult] = await Promise.allSettled([
          getFoodLogsHome(selectedDay),
          getFoodLogsWeeklySummary(weekStartDate),
        ]);

        if (!isActive) return;

        if (homeResult.status === "fulfilled") {
          setHomeData(homeResult.value);
        } else {
          setHomeError(
            homeResult.reason?.message
              ? String(homeResult.reason.message)
              : "Failed to load daily meals.",
          );
          setHomeData(null);
        }

        if (weeklyResult.status === "fulfilled") {
          setWeeklyData(weeklyResult.value);
        } else {
          setWeeklyData(null);
        }

        if (
          homeResult.status === "fulfilled" ||
          weeklyResult.status === "fulfilled"
        ) {
          lastFetchedRef.current = { date: selectedDay, time: now };
        }
        setHomeLoading(false);
      };

      void loadHomeData();

      return () => {
        isActive = false;
      };
    }, [selectedDay, homeData, weeklyData, lastUpdateTimestamp]),
  );

  // --- Safe guards / fallbacks to kill NaNs and undefineds ---
  const safeSettings = {
    calorieGoal: homeData?.goals?.calories ?? settings?.calorieGoal ?? 0,
    proteinGoal: homeData?.goals?.protein ?? settings?.proteinGoal ?? 0,
    carbsGoal: homeData?.goals?.carbs ?? settings?.carbsGoal ?? 0,
    fatsGoal: homeData?.goals?.fat ?? settings?.fatsGoal ?? 0,
  };

  const rawTodayLog = getLogByDate
    ? getLogByDate(selectedDay)
    : getTodayLog
      ? getTodayLog()
      : null;

  const hasLocalFoods = !!rawTodayLog?.foods?.length;

  const todayLog = {
    totalCalories: hasLocalFoods
      ? rawTodayLog.totalCalories
      : (homeData?.totals?.calories ?? 0),
    totalProtein: hasLocalFoods
      ? rawTodayLog.totalProtein
      : (homeData?.totals?.protein ?? 0),
    totalCarbs: hasLocalFoods
      ? rawTodayLog.totalCarbs
      : (homeData?.totals?.carbs ?? 0),
    totalFats: hasLocalFoods
      ? rawTodayLog.totalFats
      : (homeData?.totals?.fat ?? 0),
  };

  const meals = useMemo(() => {
    const emptyMeals = { breakfast: [], lunch: [], dinner: [] };
    const backendMeals = homeData?.meals ?? emptyMeals;

    const localFoods = rawTodayLog?.foods ?? [];
    const localMeals = {
      breakfast: localFoods
        .filter((f: any) => f.mealType === "breakfast")
        .map((f: any) => ({ calories: f.foodItem.calories * f.quantity })),
      lunch: localFoods
        .filter((f: any) => f.mealType === "lunch")
        .map((f: any) => ({ calories: f.foodItem.calories * f.quantity })),
      dinner: localFoods
        .filter((f: any) => f.mealType === "dinner")
        .map((f: any) => ({ calories: f.foodItem.calories * f.quantity })),
    };

    return {
      breakfast: localMeals.breakfast.length > 0 ? localMeals.breakfast : backendMeals.breakfast,
      lunch: localMeals.lunch.length > 0 ? localMeals.lunch : backendMeals.lunch,
      dinner: localMeals.dinner.length > 0 ? localMeals.dinner : backendMeals.dinner,
    };
  }, [homeData?.meals, rawTodayLog?.foods]);
  const mealRows = [
    {
      key: "breakfast",
      label: String(t("breakfast")),
      icon: <Coffee size={18} color={colors.primary} />,
      items: meals.breakfast,
    },
    {
      key: "lunch",
      label: String(t("lunch")),
      icon: <Sun size={18} color={colors.primary} />,
      items: meals.lunch,
    },
    {
      key: "dinner",
      label: String(t("dinner")),
      icon: <Moon size={18} color={colors.primary} />,
      items: meals.dinner,
    },
  ];

  const pd = getProgressData ? getProgressData() : null;
  const progressData = {
    currentStreak: pd?.currentStreak ?? 0,
    longestStreak: pd?.longestStreak ?? 0,
    totalDaysLogged: pd?.totalDaysLogged ?? 0,
    weeklyData: Array.isArray(pd?.weeklyData) ? pd!.weeklyData : [],
  };

  // --- Derived values (safe) ---
  const weeklyAverage = useMemo(() => {
    if (weeklyData) return Math.round(weeklyData.avgCalories);
    if (!progressData.weeklyData.length) return 0;
    const total = progressData.weeklyData.reduce(
      (s: number, d: any) => s + (d?.calories ?? 0),
      0,
    );
    return Math.round(total / 7);
  }, [weeklyData, progressData.weeklyData]);

  const goalsHitThisWeek = useMemo(() => {
    if (weeklyData) return Number(weeklyData.goalHits) || 0;
    if (!progressData.weeklyData.length || !safeSettings.calorieGoal) return 0;
    // Consider "hit" if within ±10% of goal
    const low = safeSettings.calorieGoal * 0.9;
    const high = safeSettings.calorieGoal * 1.1;
    return progressData.weeklyData.filter((d: any) => {
      const c = d?.calories ?? 0;
      return c >= low && c <= high;
    }).length;
  }, [weeklyData, progressData.weeklyData, safeSettings.calorieGoal]);

  const bestDayThisWeek = useMemo(() => {
    if (weeklyData?.bestDay?.date) {
      return getWeekdayLabel(weeklyData.bestDay.date);
    }

    if (!progressData.weeklyData.length) return "today";
    let best = progressData.weeklyData[0];
    for (const d of progressData.weeklyData) {
      if ((d?.calories ?? 0) > (best?.calories ?? 0)) best = d;
    }
    // You can localize this if you want; keeping simple.
    return "today";
  }, [weeklyData, progressData.weeklyData]);

  const weeklyDaysCompleted =
    weeklyData?.daysCompleted != null
      ? Number(weeklyData.daysCompleted)
      : goalsHitThisWeek;
  const weeklyProgressDays =
    weeklyData?.progressDays != null
      ? Number(weeklyData.progressDays)
      : weeklyDaysCompleted;
  const progressDenominator = Math.max(
    1,
    Number.isFinite(weeklyProgressDays) ? weeklyProgressDays : 7,
  );
  const progressCompleted = Math.max(
    0,
    Math.min(
      Number.isFinite(weeklyDaysCompleted) ? weeklyDaysCompleted : 0,
      progressDenominator,
    ),
  );
  const weeklyProgressPercent = Math.min(
    100,
    (progressCompleted / progressDenominator) * 100,
  );
  const weeklyCompletedCount = Math.round(progressCompleted);
  const weeklyTotalCount = Math.max(1, Math.round(progressDenominator));

  // Avoid divide-by-zero for percent text
  const percentOfGoal =
    safeSettings.calorieGoal > 0
      ? Math.round((todayLog.totalCalories / safeSettings.calorieGoal) * 100)
      : 0;

  // If settings aren’t ready and we have no log yet, show a light placeholder
  const notReady =
    (!settings && !rawTodayLog) ||
    (safeSettings.calorieGoal === 0 &&
      safeSettings.proteinGoal === 0 &&
      safeSettings.carbsGoal === 0 &&
      safeSettings.fatsGoal === 0);

  if (notReady) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>{t("waitingForData")}</Text>
      </View>
    );
  }

  if (!t) return null;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: colors.background },
      ]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.header,
            isRTL ? { paddingLeft: 20 } : { paddingLeft: 20 },
          ]}
        >
          <View style={isRTL ? styles.rtlAlign : undefined}>
            <Text
              style={[
                styles.greeting,
                isRTL && styles.rtlText,
                { color: colors.text },
              ]}
            >
              {t("heyThere")}
            </Text>
            <Text
              style={[
                styles.subtitle,
                isRTL && styles.rtlText,
                { color: colors.placeholder },
              ]}
            >
              {t("readyToLog")}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/modal/streak")}
            activeOpacity={0.7}
          >
            <StreakBadge count={progressData.currentStreak} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 10 }} />

        <View
          style={[styles.caloriesCard, { backgroundColor: colors.surface }]}
        >
          <Text
            style={[
              styles.caloriesTitle,
              { color: colors.text, textAlign: "center" },
            ]}
          >
            {t("dailyCalories")}
          </Text>

          <View style={styles.caloriesProgress}>
            <CalorieCircle
              current={todayLog.totalCalories}
              goal={safeSettings.calorieGoal}
              size={170}
            />

            <View style={[styles.macrosGrid]}>
              <MacroCircle
                label={String(t("protein"))}
                current={todayLog.totalProtein}
                goal={safeSettings.proteinGoal}
                color={MacroColors.protein}
                size={responsiveWidth(27)}
              />
              <MacroCircle
                label={String(t("carbs"))}
                current={todayLog.totalCarbs}
                goal={safeSettings.carbsGoal}
                color={MacroColors.carbs}
                size={responsiveWidth(27)}
              />
              <MacroCircle
                label={String(t("fats"))}
                current={todayLog.totalFats}
                goal={safeSettings.fatsGoal}
                color={MacroColors.fats}
                size={responsiveWidth(27)}
              />
            </View>
          </View>
        </View>

        <View style={[styles.mealsCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.mealsHeader]}>
            <Text
              style={[
                styles.sectionTitle,
                isRTL && styles.rtlText,
                { color: colors.text },
              ]}
            >
              {t("todaysMeals")}
            </Text>
            <Text
              style={[
                styles.totalMealsCalories,
                isRTL && styles.rtlText,
                { color: colors.placeholder },
              ]}
            >
              {Math.round(todayLog.totalCalories)} {t("calTotal")}
            </Text>
          </View>

          {homeLoading ? (
            <View style={styles.mealLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            mealRows.map((meal, index) => {
              const mealCalories = meal.items.reduce(
                (sum, item) => sum + Number(item?.calories ?? 0),
                0,
              );
              const hasFood = meal.items.length > 0;

              return (
                <TouchableOpacity
                  key={meal.key}
                  style={[
                    styles.mealRow,
                    { borderBottomColor: colors.border },
                    index === mealRows.length - 1 && { borderBottomWidth: 0 },
                  ]}
                  onPress={() =>
                    router.push({
                      pathname: "/log/log",
                      params: { date: selectedDay, meal: meal.key },
                    })
                  }
                  activeOpacity={0.7}
                >
                  <View style={[styles.mealRowLeft, isRTL && styles.rtlRow]}>
                    <View
                      style={[
                        styles.mealIcon,
                        { backgroundColor: colors.primary + "20" },
                      ]}
                    >
                      {meal.icon}
                    </View>
                    <View style={styles.mealInfo}>
                      <Text
                        style={[
                          styles.mealTitle,
                          isRTL && styles.rtlText,
                          { color: colors.text },
                        ]}
                      >
                        {meal.label}
                      </Text>
                      <Text
                        style={[
                          styles.mealSubtitle,
                          isRTL && styles.rtlText,
                          { color: colors.placeholder },
                        ]}
                      >
                        {hasFood
                          ? `${Math.round(mealCalories)} ${t("calories")} • ${meal.items.length} ${
                              meal.items.length > 1 ? t("items") : t("item")
                            }`
                          : String(t("tapToAddFood"))}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.addMealButton,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                      },
                    ]}
                  >
                    <Plus
                      size={16}
                      color={hasFood ? colors.placeholder : colors.primary}
                    />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View
          style={[
            styles.weeklySummaryCard,
            { backgroundColor: colors.surface },
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text, textAlign: isRTL ? "left" : "left" },
            ]}
          >
            {t("weeklySummary")}
          </Text>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <View
                style={[
                  styles.summaryIcon,
                  { backgroundColor: colors.primary + "20" },
                ]}
              >
                <TrendingUp size={20} color={colors.primary} />
              </View>
              <Text
                style={[
                  styles.summaryLabel,
                  isRTL && styles.rtlText,
                  { color: colors.placeholder },
                ]}
              >
                {t("avgCalories")}
              </Text>
              <Text
                style={[
                  styles.summaryValue,
                  isRTL && styles.rtlText,
                  { color: colors.text },
                ]}
              >
                {weeklyAverage}
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <View
                style={[
                  styles.summaryIcon,
                  { backgroundColor: "#9B59B6" + "20" },
                ]}
              >
                <Award size={20} color="#9B59B6" />
              </View>
              <Text
                style={[
                  styles.summaryLabel,
                  isRTL && styles.rtlText,
                  { color: colors.placeholder },
                ]}
              >
                {t("goalsHit")}
              </Text>
              <Text
                style={[
                  styles.summaryValue,
                  isRTL && styles.rtlText,
                  { color: colors.text },
                ]}
              >
                {goalsHitThisWeek}/7
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <View
                style={[
                  styles.summaryIcon,
                  { backgroundColor: "#1E90FF" + "20" },
                ]}
              >
                <Target size={20} color="#1E90FF" />
              </View>
              <Text
                style={[
                  styles.summaryLabel,
                  isRTL && styles.rtlText,
                  { color: colors.placeholder },
                ]}
              >
                {t("bestDay")}
              </Text>
              <Text
                style={[
                  styles.summaryValue,
                  isRTL && styles.rtlText,
                  { color: colors.text },
                ]}
              >
                {bestDayThisWeek === "today" ? t("today") : bestDayThisWeek}
              </Text>
            </View>
          </View>

          <View
            style={[styles.weeklyProgress, { borderTopColor: colors.border }]}
          >
            <Text
              style={[
                styles.weeklyProgressTitle,
                isRTL && styles.rtlText,
                { color: colors.text },
              ]}
            >
              {t("thisWeeksProgress")}
            </Text>
            <View
              style={[styles.progressBar, { backgroundColor: colors.border }]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${weeklyProgressPercent}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.progressText,
                isRTL && styles.rtlText,
                { color: colors.placeholder },
              ]}
            >
              {weeklyCompletedCount}/{weeklyTotalCount} {t("daysCompleted")}
            </Text>
          </View>
        </View>

        <View
          style={[styles.insightsCard, { backgroundColor: colors.surface }]}
        >
          <Text
            style={[
              styles.sectionTitle,
              isRTL && styles.rtlText,
              { color: colors.text },
            ]}
          >
            {t("todaysInsights")}
          </Text>

          <View style={styles.insightsList}>
            <View className="insight" style={styles.insightItem}>
              <View
                style={[
                  styles.insightIcon,
                  { backgroundColor: "#E74C3C" + "20" },
                ]}
              >
                <Zap size={20} color="#E74C3C" />
              </View>
              <View style={styles.insightContent}>
                <Text
                  style={[
                    styles.insightTitle,
                    isRTL && styles.rtlText,
                    { color: colors.text },
                  ]}
                >
                  {t("energyLevel")}
                </Text>
                <Text
                  style={[
                    styles.insightValue,
                    isRTL && styles.rtlText,
                    { color: colors.placeholder },
                  ]}
                >
                  {percentOfGoal}% {t("ofDailyGoal")}
                </Text>
              </View>
            </View>

            <View className="insight" style={styles.insightItem}>
              <View
                style={[
                  styles.insightIcon,
                  { backgroundColor: "#1E90FF" + "20" },
                ]}
              >
                <Target size={20} color="#1E90FF" />
              </View>
              <View style={styles.insightContent}>
                <Text
                  style={[
                    styles.insightTitle,
                    isRTL && styles.rtlText,
                    { color: colors.text },
                  ]}
                >
                  {t("proteinProgress")}
                </Text>
                <Text
                  style={[
                    styles.insightValue,
                    isRTL && styles.rtlText,
                    { color: colors.placeholder },
                  ]}
                >
                  {Math.round(todayLog.totalProtein)}
                  {t("g")} / {safeSettings.proteinGoal}
                  {t("g")}
                </Text>
              </View>
            </View>

            <View className="insight" style={styles.insightItem}>
              <View
                style={[
                  styles.insightIcon,
                  { backgroundColor: "#FF6B35" + "20" },
                ]}
              >
                <Flame size={20} color="#FF6B35" />
              </View>
              <View style={styles.insightContent}>
                <Text
                  style={[
                    styles.insightTitle,
                    isRTL && styles.rtlText,
                    { color: colors.text },
                  ]}
                >
                  {t("streakStatus")}
                </Text>
                <Text
                  style={[
                    styles.insightValue,
                    isRTL && styles.rtlText,
                    { color: colors.placeholder },
                  ]}
                >
                  {progressData.currentStreak > 0
                    ? `${progressData.currentStreak} ${t("daysStrong")}`
                    : t("startYourStreak")}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
      <FloatingFitBot />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingRight: 20,
    paddingVertical: 16,
  },
  greeting: { fontSize: 27, fontWeight: "700" },
  subtitle: { fontSize: 17, marginTop: 6 },

  streakContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2A2A2A",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },

  streakText: { fontSize: 14, fontWeight: "600", marginLeft: 6 },

  caloriesCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
  },
  caloriesTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },

  caloriesStats: { marginTop: 24, width: "100%", paddingHorizontal: 20 },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  statLabel: { fontSize: 15, fontWeight: "500" },
  statValue: { fontSize: 15, fontWeight: "600" },
  statValueRemaining: { fontSize: 15, color: "#6B7280", fontWeight: "600" },

  caloriesProgress: { alignItems: "center" },

  macrosCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 16 },

  macrosGrid: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    marginTop: 30,
    gap: responsiveWidth(1),
  },

  mealsCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
  },
  mealsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  totalMealsCalories: {
    fontSize: 14,
    fontWeight: "500",
  },
  mealLoading: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  mealRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  mealRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  mealIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  mealInfo: {
    marginStart: 10,
    flex: 1,
  },
  mealTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  mealSubtitle: {
    fontSize: 12,
  },
  addMealButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginStart: 8,
  },
  mealError: {
    marginTop: 10,
    fontSize: 12,
  },

  weeklySummaryCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
  },
  summaryGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  summaryItem: { alignItems: "center", flex: 1 },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  summaryLabel: { fontSize: 12, marginBottom: 4, textAlign: "center" },
  summaryValue: { fontSize: 16, fontWeight: "600", textAlign: "center" },

  weeklyProgress: { paddingTop: 16, borderTopWidth: 1 },
  weeklyProgressTitle: { fontSize: 14, fontWeight: "500", marginBottom: 12 },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: { height: "100%", borderRadius: 4 },
  progressText: { fontSize: 12, textAlign: "center" },

  insightsCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
  },
  insightsList: { gap: 16 },
  insightItem: { flexDirection: "row", alignItems: "center" },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  insightContent: { flex: 1 },
  insightTitle: { fontSize: 14, fontWeight: "500", marginBottom: 2 },
  insightValue: { fontSize: 13 },

  rtlText: { textAlign: "left", paddingRight: 10 },
  rtlRow: { flexDirection: "row-reverse" },
  rtlAlign: { alignItems: "flex-start" },

  caloriesStatsRTL: { flexDirection: "column-reverse" },
  statRowRTL: { flexDirection: "row-reverse" },
  statGroup: { marginBottom: 12 },
});
