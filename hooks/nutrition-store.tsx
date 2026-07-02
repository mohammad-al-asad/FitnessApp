import { useAuth } from "@/hooks/auth-context";
import { useLanguage } from "@/hooks/language-context";
import { useUserProfile } from "@/hooks/user-profile-context";
import { Alert } from "react-native";
import { backendDeleteFoodLog, getFoodLogsHome } from "@/services/food-api";
import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";

type UserSettings = any;
type DailyLog = any;
type LoggedFood = any;
type ProgressData = any;

const getDefaultSettings = (profile?: any): UserSettings => ({
  weight: profile?.weight || 70,
  calorieGoal: profile?.targetCalories || 2000,
  proteinGoal: profile?.targetProtein || 150,
  carbsGoal: profile?.targetCarbs || 250,
  fatsGoal: profile?.targetFat || 67,
  dailyReminders: true,
  reminderTime: "20:00",
  language: "en",
});

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const parseLocalDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map((v) => Number(v));
  return new Date(year, (month || 1) - 1, day || 1);
};
const getTodayString = () => formatLocalDate(new Date());

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getLoggedFoodSignature(food: any): string {
  const item = food?.foodItem ?? {};
  const meal = String(food?.mealType || "").toLowerCase();
  const name = String(item?.name || food?.foodName || "").trim().toLowerCase();
  const quantity = toNumber(food?.quantity) || 1;
  const calories = Math.round(toNumber(item?.calories) * quantity);
  const protein = Math.round(toNumber(item?.protein) * quantity * 10) / 10;
  const carbs = Math.round(toNumber(item?.carbs) * quantity * 10) / 10;
  const fats = Math.round(toNumber(item?.fats ?? item?.fat) * quantity * 10) / 10;

  return `${meal}:${name}:${calories}:${protein}:${carbs}:${fats}`;
}

function mergeLoggedFoods(localFoods: any[] = [], backendFoods: any[] = []) {
  const merged = [...backendFoods];
  const seen = new Set<string>();

  backendFoods.forEach((food) => {
    if (food?.id) seen.add(`id:${food.id}`);
    seen.add(`sig:${getLoggedFoodSignature(food)}`);
  });

  localFoods.forEach((food) => {
    const idKey = food?.id ? `id:${food.id}` : "";
    const signatureKey = `sig:${getLoggedFoodSignature(food)}`;
    if (!seen.has(idKey) && !seen.has(signatureKey)) {
      if (idKey) seen.add(idKey);
      seen.add(signatureKey);
      merged.push(food);
    }
  });

  return merged;
}

export const [NutritionProvider, useNutrition] = createContextHook(() => {
  const { profile } = useUserProfile();
  const { user } = useAuth();
  const { t } = useLanguage();

  const userId = user?.uid || "guest";
  const isRealUser = !!user && userId !== "guest";

  const SETTINGS_KEY = `fitco_settings_${userId}`;
  const LOGS_KEY = `fitco_daily_logs_${userId}`;

  const [settings, setSettings] = useState<UserSettings>(getDefaultSettings());
  const [dailyLogs, setDailyLogs] = useState<Record<string, DailyLog>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState<number>(Date.now());

  const loadData = useCallback(async () => {
    if (!isRealUser) {
      setIsLoading(false);
      return;
    }

    try {
      const [storedSettings, storedLogs] = await Promise.all([
        AsyncStorage.getItem(SETTINGS_KEY),
        AsyncStorage.getItem(LOGS_KEY),
      ]);


      let parsedSettings = storedSettings
        ? JSON.parse(storedSettings)
        : getDefaultSettings(profile);

      if (profile) {
        parsedSettings = {
          ...parsedSettings,
          weight: profile.weight ?? parsedSettings.weight,
          calorieGoal: profile.targetCalories ?? parsedSettings.calorieGoal,
          proteinGoal: profile.targetProtein ?? parsedSettings.proteinGoal,
          carbsGoal: profile.targetCarbs ?? parsedSettings.carbsGoal,
          fatsGoal: profile.targetFat ?? parsedSettings.fatsGoal,
        };
      }

      setSettings(parsedSettings);
      
      // Persist the merged settings back
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(parsedSettings));

      if (storedLogs) {
        let logs;
        try {
          logs = JSON.parse(storedLogs);
        } catch {
          logs = {};
          await AsyncStorage.removeItem(LOGS_KEY);
        }

        Object.keys(logs).forEach((date) => {
          logs[date].foods?.forEach((f: any) => {
            if (f?.timestamp && typeof f.timestamp === "string") {
              f.timestamp = new Date(f.timestamp);
            }
          });
        });

        setDailyLogs(logs);
      } else {
        setDailyLogs({});
      }

      // Sync today's logs from backend
      try {
        const today = getTodayString();
        const homeData = await getFoodLogsHome(today);
        
        const backendFoods: any[] = [];
        const mealTypes = ['breakfast', 'lunch', 'dinner'] as const;
        
        mealTypes.forEach(meal => {
          (homeData.meals[meal] || []).forEach(item => {
            backendFoods.push({
              id: item.id,
              imageUrl: item.imageUrl,
              confidence: item.confidence,
              notes: item.notes,
              source: item.source || item.foodSource,
              isAi: item.isAi,
              foodItem: {
                name: item.foodName,
                brand: item.brandName || (item.isAi ? "AI Meal" : ""),
                calories: item.calories / (item.servings || 1),
                protein: item.protein / (item.servings || 1),
                carbs: item.carbs / (item.servings || 1),
                fats: item.fat / (item.servings || 1),
                servingSize: `${item.servingSize}${item.servingUnit}`,
                imageUrl: item.imageUrl,
                confidence: item.confidence,
                notes: item.notes,
                source: item.source || item.foodSource,
                isAi: item.isAi,
              },
              quantity: item.servings,
              timestamp: item.loggedAt ? new Date(item.loggedAt) : new Date(),
              mealType: meal,
            });
          });
        });

        if (backendFoods.length > 0) {
          setDailyLogs(prev => {
            const updated = { ...prev };
            const existingFoods = updated[today]?.foods || [];
            const mergedFoods = mergeLoggedFoods(existingFoods, backendFoods);
            const mergedTotals = calculateTotals(mergedFoods);
            updated[today] = {
              ...(updated[today] || {}),
              date: today,
              foods: mergedFoods,
              ...mergedTotals,
            };
            return updated;
          });
          // Also persist to AsyncStorage
          const currentLogs = JSON.parse((await AsyncStorage.getItem(LOGS_KEY)) || "{}");
          const existingFoods = currentLogs[today]?.foods || [];
          const mergedFoods = mergeLoggedFoods(existingFoods, backendFoods);
          const mergedTotals = calculateTotals(mergedFoods);
          currentLogs[today] = {
            ...(currentLogs[today] || {}),
            date: today,
            foods: mergedFoods,
            ...mergedTotals,
          };
          await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(currentLogs));
        }
      } catch (error) {
        console.error("Error syncing logs from backend:", error);
      }
    } catch (e) {
    } finally {
      setIsLoading(false);
    }
  }, [isRealUser, profile, userId, SETTINGS_KEY, LOGS_KEY]);

  useEffect(() => {
    if (isRealUser) {
      loadData();
    }
  }, [isRealUser, loadData]);

  const saveSettings = useCallback(
    async (newSettings: UserSettings) => {
      try {
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
        setSettings(newSettings);
      } catch (error) {
        console.error("Error saving settings:", error);
      }
    },
    [SETTINGS_KEY],
  );

  useEffect(() => {
    if (!profile) return;

    const updatedSettings = {
      ...settings,
      weight: profile.weight || settings.weight,
      calorieGoal: profile.targetCalories || settings.calorieGoal,
      proteinGoal: profile.targetProtein || settings.proteinGoal,
      carbsGoal: profile.targetCarbs || settings.carbsGoal,
      fatsGoal: profile.targetFat || settings.fatsGoal,
    };

    const changed = JSON.stringify(updatedSettings) !== JSON.stringify(settings);
    if (changed) {
      saveSettings(updatedSettings);
    }
  }, [profile, saveSettings, settings]);

  const saveDailyLogs = useCallback(
    async (logs: Record<string, DailyLog>) => {
      try {
        await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(logs));
        setDailyLogs(logs);
        setLastUpdateTimestamp(Date.now());
      } catch (error) {
        console.error("Error saving logs:", error);
      }
    },
    [LOGS_KEY],
  );

  const markLogsChanged = useCallback(() => {
    setLastUpdateTimestamp(Date.now());
  }, []);

  const getTodayLog = useCallback((): DailyLog => {
    const today = getTodayString();
    return (
      dailyLogs[today] || {
        date: today,
        foods: [],
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFats: 0,
      }
    );
  }, [dailyLogs]);

  const getLogByDate = useCallback(
    (date: string): DailyLog => {
      return (
        dailyLogs[date] || {
          date,
          foods: [],
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFats: 0,
        }
      );
    },
    [dailyLogs],
  );

  const calculateTotals = (foods: LoggedFood[]) =>
    foods.reduce(
      (totals, loggedFood) => {
        const q = loggedFood.quantity;
        return {
          totalCalories: totals.totalCalories + loggedFood.foodItem.calories * q,
          totalProtein: totals.totalProtein + loggedFood.foodItem.protein * q,
          totalCarbs: totals.totalCarbs + loggedFood.foodItem.carbs * q,
          totalFats: totals.totalFats + loggedFood.foodItem.fats * q,
        };
      },
      { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFats: 0 },
    );

  const addFoodToLog = useCallback(
    async (foodItem: any, quantity: number, date?: string, mealType?: string, backendId?: string) => {
      const targetDate = date || getTodayString();

      const loggedFood: LoggedFood = {
        id: backendId || Date.now().toString(),
        foodItem,
        quantity,
        timestamp: new Date(),
        mealType: mealType || "breakfast",
      };

      const currentLog = dailyLogs[targetDate] || {
        foods: [],
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFats: 0,
      };

      const updatedFoods = [...currentLog.foods, loggedFood];
      const totals = calculateTotals(updatedFoods);
      const updatedLogs = {
        ...dailyLogs,
        [targetDate]: { ...currentLog, foods: updatedFoods, ...totals },
      };

      await saveDailyLogs(updatedLogs);
    },
    [dailyLogs, saveDailyLogs],
  );

  const removeFoodFromLog = useCallback(
    async (foodId: string, date?: string) => {
      const targetDate = date || getTodayString();
      const currentLog = dailyLogs[targetDate];
      if (!currentLog) return;

      const updatedFoods = currentLog.foods.filter((f: any) => f.id !== foodId);
      const totals = calculateTotals(updatedFoods);
      const updatedLogs = {
        ...dailyLogs,
        [targetDate]: { ...currentLog, foods: updatedFoods, ...totals },
      };

      await saveDailyLogs(updatedLogs);

      try {
        const response = await backendDeleteFoodLog(foodId);
        if (response?.message) {
          Alert.alert(t("success") as string, response.message);
        }
      } catch (error) {
        console.error("Error deleting food log from backend:", error);
      }
    },
    [dailyLogs, saveDailyLogs],
  );

  const removeFoodFromLocalLog = useCallback(
    async (foodId: string, date?: string, matchingFood?: any) => {
      const targetDate = date || getTodayString();
      const currentLog = dailyLogs[targetDate];
      if (!currentLog) return;

      const normalizedId = String(foodId || "");
      const matchingSignature = matchingFood
        ? getLoggedFoodSignature(matchingFood)
        : "";

      const updatedFoods = currentLog.foods.filter((food: any) => {
        const sameId = normalizedId && String(food?.id || "") === normalizedId;
        const sameFood =
          matchingSignature &&
          getLoggedFoodSignature(food) === matchingSignature;

        return !sameId && !sameFood;
      });

      if (updatedFoods.length === currentLog.foods.length) return;

      const totals = calculateTotals(updatedFoods);
      const updatedLogs = {
        ...dailyLogs,
        [targetDate]: { ...currentLog, foods: updatedFoods, ...totals },
      };

      await saveDailyLogs(updatedLogs);
    },
    [dailyLogs, saveDailyLogs],
  );

  const updateFoodInLocalLog = useCallback(
    async (
      foodId: string,
      date: string | undefined,
      previousFood: any,
      updatedFood: any,
    ) => {
      const targetDate = date || getTodayString();
      const currentLog = dailyLogs[targetDate];
      if (!currentLog) return;

      const normalizedId = String(foodId || "");
      const previousSignature = previousFood
        ? getLoggedFoodSignature(previousFood)
        : "";

      let changed = false;
      const updatedFoods = currentLog.foods.reduce((foods: any[], food: any) => {
        const sameId = normalizedId && String(food?.id || "") === normalizedId;
        const samePreviousFood =
          previousSignature &&
          getLoggedFoodSignature(food) === previousSignature;

        if (sameId) {
          changed = true;
          const quantity =
            toNumber(updatedFood?.quantity) || toNumber(food?.quantity) || 1;
          const calories = toNumber(updatedFood?.calories);
          const protein = toNumber(updatedFood?.protein);
          const carbs = toNumber(updatedFood?.carbs);
          const fats = toNumber(updatedFood?.fat ?? updatedFood?.fats);
          const imageUrl =
            updatedFood?.imageUrl ??
            updatedFood?.foodItem?.imageUrl ??
            food?.imageUrl ??
            food?.foodItem?.imageUrl;
          const confidence =
            updatedFood?.confidence ??
            updatedFood?.foodItem?.confidence ??
            food?.confidence ??
            food?.foodItem?.confidence;
          const notes =
            updatedFood?.notes ??
            updatedFood?.foodItem?.notes ??
            food?.notes ??
            food?.foodItem?.notes;
          const source =
            updatedFood?.source ??
            updatedFood?.foodItem?.source ??
            food?.source ??
            food?.foodItem?.source;
          const isAi = Boolean(
            updatedFood?.isAi ||
              updatedFood?.foodItem?.isAi ||
              food?.isAi ||
              food?.foodItem?.isAi,
          );

          foods.push({
            ...food,
            id: normalizedId || food?.id,
            quantity,
            mealType: updatedFood?.mealType || food?.mealType || "breakfast",
            imageUrl,
            confidence,
            notes,
            source,
            isAi,
            foodItem: {
              ...(food?.foodItem || {}),
              ...(updatedFood?.foodItem || {}),
              name:
                updatedFood?.foodItem?.name ||
                updatedFood?.foodName ||
                food?.foodItem?.name,
              calories: calories / quantity,
              protein: protein / quantity,
              carbs: carbs / quantity,
              fats: fats / quantity,
              imageUrl,
              confidence,
              notes,
              source,
              isAi,
            },
          });
          return foods;
        }

        if (samePreviousFood) {
          changed = true;
          return foods;
        }

        foods.push(food);
        return foods;
      }, []);

      if (!changed) return;

      const totals = calculateTotals(updatedFoods);
      const updatedLogs = {
        ...dailyLogs,
        [targetDate]: { ...currentLog, foods: updatedFoods, ...totals },
      };

      await saveDailyLogs(updatedLogs);
    },
    [dailyLogs, saveDailyLogs],
  );

  const getProgressData = useCallback((): ProgressData => {
    const dates = Object.keys(dailyLogs)
      .filter((d) => !!dailyLogs[d]?.foods?.length)
      .sort();
    let currentStreak = 0;
    let longestStreak = 0;
    let checkDate = new Date();

    const todayStr = formatLocalDate(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (!dailyLogs[todayStr]?.foods?.length) {
      checkDate = yesterday;
    }

    while (true) {
      const dateStr = formatLocalDate(checkDate);
      if (dailyLogs[dateStr]?.foods?.length) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    for (let i = 0; i < dates.length; i++) {
      let streakLength = 1;
      let previousDate = parseLocalDateKey(dates[i]);

      for (let j = i + 1; j < dates.length; j++) {
        const nextDate = parseLocalDateKey(dates[j]);
        const expectedNext = new Date(previousDate);
        expectedNext.setDate(expectedNext.getDate() + 1);

        if (formatLocalDate(nextDate) === formatLocalDate(expectedNext)) {
          streakLength++;
          previousDate = nextDate;
        } else {
          break;
        }
      }

      if (streakLength > longestStreak) {
        longestStreak = streakLength;
      }
    }

    const today = new Date();
    const weeklyData = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      const dateStr = formatLocalDate(d);
      const log = dailyLogs[dateStr];
      return {
        date: dateStr,
        calories: log?.totalCalories || 0,
        protein: log?.totalProtein || 0,
        carbs: log?.totalCarbs || 0,
        fats: log?.totalFats || 0,
      };
    });

    const totalDaysLogged = Object.keys(dailyLogs).filter(
      (d) => dailyLogs[d]?.foods?.length,
    ).length;

    return { currentStreak, longestStreak, totalDaysLogged, weeklyData };
  }, [dailyLogs]);

  return useMemo(
    () => ({
      settings,
      dailyLogs,
      isLoading,
      lastUpdateTimestamp,
      saveSettings,
      getTodayLog,
      getLogByDate,
      addFoodToLog,
      removeFoodFromLog,
      removeFoodFromLocalLog,
      updateFoodInLocalLog,
      markLogsChanged,
      getProgressData,
    }),
    [
      settings,
      dailyLogs,
      isLoading,
      lastUpdateTimestamp,
      saveSettings,
      getTodayLog,
      getLogByDate,
      addFoodToLog,
      removeFoodFromLog,
      removeFoodFromLocalLog,
      updateFoodInLocalLog,
      markLogsChanged,
      getProgressData,
    ],
  );
});
