import { useAuth } from "@/hooks/auth-context";
import { useUserProfile } from "@/hooks/user-profile-context";
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

function getAutoMacros(calorieGoal: number) {
  const proteinCalories = calorieGoal * 0.3;
  const fatCalories = calorieGoal * 0.25;
  const carbCalories = calorieGoal * 0.45;
  return {
    proteinGoal: Math.round(proteinCalories / 4),
    fatsGoal: Math.round(fatCalories / 9),
    carbsGoal: Math.round(carbCalories / 4),
  };
}

export async function getQuestionnaireSettings(userId: string) {
  try {
    const storedData = await AsyncStorage.getItem(`questionnaireData_${userId}`);
    if (!storedData) return null;
    const data = JSON.parse(storedData);
    const { weight, height, age, gender, activityLevel, goal } = data;

    let bmr =
      gender === "male"
        ? 10 * weight + 6.25 * height - 5 * age + 5
        : 10 * weight + 6.25 * height - 5 * age - 161;

    const factors: Record<string, number> = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extremely_active: 1.9,
    };
    bmr *= factors[activityLevel] || 1.55;

    if (goal === "lose_weight") bmr -= 400;
    else if (goal === "gain_weight" || goal === "build_muscle") bmr += 400;

    const calorieGoal = Math.round(bmr);
    const { proteinGoal, carbsGoal, fatsGoal } = getAutoMacros(calorieGoal);
    return { weight, calorieGoal, proteinGoal, carbsGoal, fatsGoal };
  } catch (error) {
    console.log("Error loading questionnaire settings:", error);
    return null;
  }
}

export const [NutritionProvider, useNutrition] = createContextHook(() => {
  const { profile } = useUserProfile();
  const { user } = useAuth();

  const userId = user?.uid || "guest";
  const isRealUser = !!user && userId !== "guest";

  const SETTINGS_KEY = `fitco_settings_${userId}`;
  const LOGS_KEY = `fitco_daily_logs_${userId}`;

  const [settings, setSettings] = useState<UserSettings>(getDefaultSettings());
  const [dailyLogs, setDailyLogs] = useState<Record<string, DailyLog>>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!isRealUser) {
      setIsLoading(false);
      return;
    }

    try {
      const [storedSettings, storedLogs, questionnaireSettings] = await Promise.all([
        AsyncStorage.getItem(SETTINGS_KEY),
        AsyncStorage.getItem(LOGS_KEY),
        getQuestionnaireSettings(userId),
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

      if (questionnaireSettings) {
        parsedSettings = { ...parsedSettings, ...questionnaireSettings };
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
      } catch (error) {
        console.error("Error saving logs:", error);
      }
    },
    [LOGS_KEY],
  );

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
    async (foodItem: any, quantity: number, date?: string, mealType?: string) => {
      const targetDate = date || getTodayString();

      const loggedFood: LoggedFood = {
        id: Date.now().toString(),
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
      saveSettings,
      getTodayLog,
      getLogByDate,
      addFoodToLog,
      removeFoodFromLog,
      getProgressData,
    }),
    [
      settings,
      dailyLogs,
      isLoading,
      saveSettings,
      getTodayLog,
      getLogByDate,
      addFoodToLog,
      removeFoodFromLog,
      getProgressData,
    ],
  );
});
