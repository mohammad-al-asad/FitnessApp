// 🍎 nutrition-store.ts — Central hub for user-specific nutrition tracking and macros.

import { auth } from "@/config/firebaseConfig";
import { useAuth } from "@/hooks/auth-context";
import { useUserProfile } from "@/hooks/user-profile-context";
import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";

// 🧩 Types
type UserSettings = any;
type DailyLog = any;
type LoggedFood = any;
type ProgressData = any;

// 🧠 Helper to track current user ID reactively
function useUserId() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUserId(user ? user.uid : null);
    });
    return unsubscribe;
  }, []);

  return userId;
}


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

const getTodayString = () => new Date().toISOString().split("T")[0];

// ✅ Auto macro generator
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

// ✅ Pull questionnaire data (stored per user)
export async function getQuestionnaireSettings(userId: string) {

  console.log("📋 Loading questionnaire for userId:", userId);

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

// ✅ Main Context
export const [NutritionProvider, useNutrition] = createContextHook(() => {
  const { profile } = useUserProfile();
  const { user } = useAuth();
const userId = user?.uid || "guest";
const isRealUser = !!userId && userId !== "guest";






  const SETTINGS_KEY = `fitco_settings_${userId}`;
const LOGS_KEY = `fitco_daily_logs_${userId}`;

  const [settings, setSettings] = useState<UserSettings>(getDefaultSettings());
  const [dailyLogs, setDailyLogs] = useState<Record<string, DailyLog>>({});
  const [isLoading, setIsLoading] = useState(true);

  // 🧩 Load settings and logs
 const loadData = useCallback(async () => {
  console.log("📦 loadData called for userId:", userId);

  // ⛔ Don’t load/save anything if user is guest
  if (!isRealUser) {
    setIsLoading(false);
    return;
  }

  try {
    const [storedSettings, storedLogs, questionnaireSettings] = await Promise.all([
      AsyncStorage.getItem(`fitco_settings_${userId}`),
      AsyncStorage.getItem(`fitco_daily_logs_${userId}`),
      getQuestionnaireSettings(userId),
    ]);

console.log("📋 Raw questionnaireSettings:", questionnaireSettings);
console.log("🧠 Stored settings before merge:", storedSettings);



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
    await AsyncStorage.setItem(`fitco_settings_${userId}`, JSON.stringify(parsedSettings));

    if (storedLogs) {
      let logs;
      try {
        logs = JSON.parse(storedLogs);
      } catch {
        logs = {};
        await AsyncStorage.removeItem(`fitco_daily_logs_${userId}`);
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
    console.error("Error loading nutrition data:", e);
  } finally {
    setIsLoading(false);
  }
}, [isRealUser, profile, userId]);


  useEffect(() => {
  if (userId && userId !== "guest") loadData();
}, [loadData, userId, profile]);



// 🧹 On user change, just load persisted data (do NOT wipe)
useEffect(() => {
  if (userId && userId !== "guest") {
    loadData();
  }
}, [userId, loadData]);



  // ✅ Save settings
  const saveSettings = useCallback(
    async (newSettings: UserSettings) => {
      try {
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
        setSettings(newSettings);
      } catch (error) {
        console.error("Error saving settings:", error);
      }
    },
    [SETTINGS_KEY]
  );


  // ✅ React to profile updates (update calorie/macros when profile changes)
  useEffect(() => {
    if (!profile) return;

    console.log("⚡ Nutrition store reacting to updated profile:", profile);

    const updatedSettings = {
      ...settings,
      weight: profile.weight || settings.weight,
      calorieGoal: profile.targetCalories || settings.calorieGoal,
      proteinGoal: profile.targetProtein || settings.proteinGoal,
      carbsGoal: profile.targetCarbs || settings.carbsGoal,
      fatsGoal: profile.targetFat || settings.fatsGoal,
    };

    // 🔄 Only update if something actually changed
    const changed = JSON.stringify(updatedSettings) !== JSON.stringify(settings);
    if (changed) {
      console.log("💾 Updating settings with new profile data...");
      saveSettings(updatedSettings);
    }
  }, [profile]);







  // ✅ Save logs
  const saveDailyLogs = useCallback(
  async (logs: Record<string, DailyLog>) => {
    try {
      console.log("🧠 saveDailyLogs called for userId key:", LOGS_KEY);
      await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(logs));
      setDailyLogs(logs);
    } catch (error) {
      console.error("Error saving logs:", error);
    }
  },
  [LOGS_KEY]
);


 // ✅ Get today’s log
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

// ✅ Get log by any date (for horizontal day selector)
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
  [dailyLogs]
);


  // ✅ Add food
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
      { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFats: 0 }
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
    [dailyLogs, saveDailyLogs]
  );

  // ✅ Remove food
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
    [dailyLogs, saveDailyLogs]
  );

 // ✅ Weekly progress (now includes chart data)
const getProgressData = useCallback((): ProgressData => {
  const dates = Object.keys(dailyLogs).sort();
  let currentStreak = 0,
    longestStreak = 0,
    tempStreak = 0;
  let checkDate = new Date();

 // 🔹 Current streak (fixed: don't reset to 0 at midnight)
const todayStr = new Date().toISOString().split("T")[0];
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayStr = yesterday.toISOString().split("T")[0];

// If today has no logs yet, start counting from yesterday
if (!dailyLogs[todayStr]?.foods?.length) {
  checkDate = new Date(yesterday);
}

while (true) {
  const dateStr = checkDate.toISOString().split("T")[0];
  if (dailyLogs[dateStr]?.foods?.length) {
    currentStreak++;
    checkDate.setDate(checkDate.getDate() - 1);
  } else {
    break;
  }
}


  // 🔹 Longest streak
  for (const date of dates) {
    if (dailyLogs[date]?.foods?.length) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else tempStreak = 0;
  }

  // 🔹 Weekly chart data (last 7 days)
  const today = new Date();
  const weeklyData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    const log = dailyLogs[dateStr];
    return {
      date: dateStr,
      calories: log?.totalCalories || 0,
      protein: log?.totalProtein || 0,
      carbs: log?.totalCarbs || 0,
      fats: log?.totalFats || 0,
    };
  });

  // 🔹 Total days logged
  const totalDaysLogged = Object.keys(dailyLogs).filter(
    (d) => dailyLogs[d]?.foods?.length
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
    getLogByDate, // ✅ added this
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
    getLogByDate, // ✅ added this too
    addFoodToLog,
    removeFoodFromLog,
    getProgressData,
  ]
);

});

