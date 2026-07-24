// 👤 user-profile-context.ts — Manages user profile and nutrition targets per authenticated user.

import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./auth-context";

export interface UserProfile {
  userId: string;
  age: number;
  height: number;
  weight: number;
  gender: "male" | "female";
  activityLevel:
    | "sedentary"
    | "lightly_active"
    | "moderately_active"
    | "very_active"
    | "extremely_active";
  goal: "lose_weight" | "maintain_weight" | "gain_weight" | "build_muscle";
  targetWeight?: number;
  medicalConditions: string;
  allergies: string;
  createdAt: string;
  updatedAt: string;

  bmr?: number;
  tdee?: number;
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
}

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extremely_active: 1.9,
};

const GOAL_ADJUSTMENTS = {
  lose_weight: -500,
  maintain_weight: 0,
  gain_weight: 300,
  build_muscle: 200,
};

export const [UserProfileProvider, useUserProfile] = createContextHook(() => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 🧩 Key changes: dynamically use per-user key
  const USER_PROFILE_KEY = user ? `fitco_user_profile_${user.uid}` : null;

  // 🔥 Load user profile on login
  useEffect(() => {
    if (user) {
      loadUserProfile();
    } else {
      setProfile(null);
      setIsLoading(false);
    }
  }, [user]);

  const loadUserProfile = async () => {
    try {
      if (!user || !USER_PROFILE_KEY) return;
      const data = await AsyncStorage.getItem(USER_PROFILE_KEY);

      if (data) {
        setProfile(JSON.parse(data));
      } else {
        // ✅ No local profile. Check if the authenticated 'user' object has the data (from server sync)
        const hasServerProfile =
          user.age && user.height && user.weight && user.gender;

        if (hasServerProfile) {
          const {
            age,
            height,
            weight,
            gender,
            activityLevel,
            goal,
            goals,
            targetWeight,
            medicalConditions,
            allergies,
          } = user as any;

          const activeGoal = goal || goals || "maintain_weight";
          const activeActivity = activityLevel || "moderately_active";

          const bmr = calculateBMR(age, height, weight, gender);
          const tdee = calculateTDEE(bmr, activeActivity);
          const targetCalories = calculateTargetCalories(tdee, activeGoal);
          const macros = calculateMacros(targetCalories, activeGoal);

          const builtProfile = {
            userId: user.uid,
            createdAt: user.createdAt || new Date().toISOString(),
            updatedAt: user.updatedAt || new Date().toISOString(),
            age,
            height,
            weight,
            gender,
            activityLevel: activeActivity,
            goal: activeGoal,
            targetWeight,
            medicalConditions: medicalConditions || "",
            allergies: allergies || "",
            bmr: Math.round(bmr),
            tdee: Math.round(tdee),
            targetCalories: Math.round(targetCalories),
            ...macros,
          };

          await AsyncStorage.setItem(
            USER_PROFILE_KEY,
            JSON.stringify(builtProfile),
          );
          setProfile(builtProfile);
        } else {
          const age = 25;
          const height = 170;
          const weight = 70;
          const gender = "male" as const;
          const activityLevel = "moderately_active" as const;
          const goal = "maintain_weight" as const;
          const bmr = calculateBMR(age, height, weight, gender);
          const tdee = calculateTDEE(bmr, activityLevel);
          const targetCalories = calculateTargetCalories(tdee, goal);
          const macros = calculateMacros(targetCalories, goal);

          const defaultProfile: UserProfile = {
            userId: user.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            age,
            height,
            weight,
            gender,
            activityLevel,
            goal,
            targetWeight: weight,
            medicalConditions: "",
            allergies: "",
            bmr: Math.round(bmr),
            tdee: Math.round(tdee),
            targetCalories: Math.round(targetCalories),
            ...macros,
          };

          await AsyncStorage.setItem(
            USER_PROFILE_KEY,
            JSON.stringify(defaultProfile),
          );
          setProfile(defaultProfile);
        }
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  // 🧮 Macro calculations
  const calculateBMR = (
    age: number,
    height: number,
    weight: number,
    gender: "male" | "female",
  ) => {
    const base = 10 * weight + 6.25 * height - 5 * age;
    return gender === "male" ? base + 5 : base - 161;
  };

  const calculateTDEE = (
    bmr: number,
    activity: keyof typeof ACTIVITY_MULTIPLIERS,
  ) => bmr * (ACTIVITY_MULTIPLIERS[activity] || 1.55);

  const calculateTargetCalories = (
    tdee: number,
    goal: keyof typeof GOAL_ADJUSTMENTS,
  ) => tdee + (GOAL_ADJUSTMENTS[goal] || 0);

  const calculateMacros = (calories: number, goal: UserProfile["goal"]) => {
    let ratios = { protein: 0.25, fat: 0.25, carb: 0.5 };
    if (goal === "build_muscle")
      ratios = { protein: 0.3, fat: 0.25, carb: 0.45 };
    if (goal === "lose_weight") ratios = { protein: 0.3, fat: 0.3, carb: 0.4 };
    return {
      targetProtein: Math.round((calories * ratios.protein) / 4),
      targetFat: Math.round((calories * ratios.fat) / 9),
      targetCarbs: Math.round((calories * ratios.carb) / 4),
    };
  };

  // ✅ Save full profile
  const saveUserProfile = useCallback(
    async (data: Partial<UserProfile>) => {
      try {
        if (!user || !USER_PROFILE_KEY) return;

        const bmr = calculateBMR(
          data.age!,
          data.height!,
          data.weight!,
          data.gender!,
        );
        const tdee = calculateTDEE(bmr, data.activityLevel!);
        const calories = calculateTargetCalories(tdee, data.goal!);
        const macros = calculateMacros(calories, data.goal!);

        const newProfile: UserProfile = {
          userId: user.uid,
          age: data.age!,
          height: data.height!,
          weight: data.weight!,
          gender: data.gender!,
          activityLevel: data.activityLevel!,
          goal: data.goal!,
          targetWeight: data.targetWeight,
          medicalConditions: data.medicalConditions || "",
          allergies: data.allergies || "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          bmr: Math.round(bmr),
          tdee: Math.round(tdee),
          targetCalories: Math.round(calories),
          ...macros,
        };

        await AsyncStorage.setItem(
          USER_PROFILE_KEY,
          JSON.stringify(newProfile),
        );
        setProfile(newProfile);
        console.log("✅ User profile saved:", newProfile);
      } catch (error) {
        console.error("Error saving profile:", error);
      }
    },
    [user, USER_PROFILE_KEY],
  );

  // ✅ Update profile safely
  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      try {
        if (!user || !USER_PROFILE_KEY || !profile) return;

        const updated: UserProfile = {
          ...profile,
          ...updates,
          updatedAt: new Date().toISOString(),
        };

        // Recalculate macros if key metrics changed
        if (
          updates.age ||
          updates.height ||
          updates.weight ||
          updates.gender ||
          updates.activityLevel ||
          updates.goal
        ) {
          const bmr = calculateBMR(
            updated.age,
            updated.height,
            updated.weight,
            updated.gender,
          );
          const tdee = calculateTDEE(bmr, updated.activityLevel);
          const calories = calculateTargetCalories(tdee, updated.goal);
          const macros = calculateMacros(calories, updated.goal);
          updated.bmr = bmr;
          updated.tdee = tdee;
          updated.targetCalories = calories;
          updated.targetProtein = macros.targetProtein;
          updated.targetCarbs = macros.targetCarbs;
          updated.targetFat = macros.targetFat;
        }

        await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(updated));
        setProfile(updated);
      } catch (error) {
        console.error("Error updating profile:", error);
      }
    },
    [user, USER_PROFILE_KEY, profile],
  );

  // 🔁 Auto-reload profile whenever AsyncStorage data changes (after save/update)
  useEffect(() => {
    if (!user || !USER_PROFILE_KEY) return;
    const refresh = async () => {
      try {
        const stored = await AsyncStorage.getItem(USER_PROFILE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setProfile(parsed);
        }
      } catch {
      }
    };
    refresh();
  }, [user, USER_PROFILE_KEY]);

  // ✅ Delete profile on logout or user switch
  const deleteProfile = useCallback(async () => {
    try {
      if (!user || !USER_PROFILE_KEY) return;
      await AsyncStorage.removeItem(USER_PROFILE_KEY);
      setProfile(null);
      console.log("🧹 Profile deleted for user:", user.uid);
    } catch (error) {
      console.error("Error deleting profile:", error);
    }
  }, [user, USER_PROFILE_KEY]);

  return {
    profile,
    isLoading,
    saveUserProfile,
    updateProfile,
    deleteProfile,
  };
});
