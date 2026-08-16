// Displays the Journal screen where users view and manage logged meals by day.
import FoodItem from "@/components/FoodItem";
import GuidedTourCard from "@/components/GuidedTourCard";
import colors from "@/constants/colors";
import { useGuidedTour } from "@/hooks/guided-tour-context";
import { useLanguage } from "@/hooks/language-context";
import { useNutrition } from "@/hooks/nutrition-store";
import {
  FoodLogsHomeMealItem,
  backendDeleteFoodLog,
  backendUpdateFoodLog,
  deleteAiMealScan,
  getFoodLogsHome,
  updateAiMealScan,
} from "@/services/food-api";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import {
  Coffee,
  Moon,
  Plus,
  Save,
  Sun,
  Target,
  X,
} from "lucide-react-native";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type MealType = "breakfast" | "lunch" | "dinner";

type JournalFood = {
  id?: string;
  mealType: MealType;
  foodItem: {
    name: string;
    brand?: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    servingSize?: string;
    imageUrl?: string;
    source?: string;
    isAi?: boolean;
    confidence?: number | null;
    notes?: string;
  };
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUrl?: string;
  confidence?: number | null;
  notes?: string;
  source?: string;
  isAi?: boolean;
  original?: FoodLogsHomeMealItem;
};

type EditForm = {
  meal: MealType;
  foodName: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  notes: string;
};

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateString(dateStr: string) {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return new Date(dateStr);
  return new Date(
    parseInt(parts[0], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[2], 10),
  );
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function allMealFoods(meals: Record<MealType, JournalFood[]>): JournalFood[] {
  return [...meals.breakfast, ...meals.lunch, ...meals.dinner];
}

function macroTotal(items: JournalFood[]) {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + toNumber(item.calories),
      protein: acc.protein + toNumber(item.protein),
      carbs: acc.carbs + toNumber(item.carbs),
      fat: acc.fat + toNumber(item.fat),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

function getFoodMergeKey(food: JournalFood): string {
  const name = String(food.foodItem?.name || "").trim().toLowerCase();
  const calories = Math.round(toNumber(food.calories));
  const protein = Math.round(toNumber(food.protein));
  const carbs = Math.round(toNumber(food.carbs));
  const fat = Math.round(toNumber(food.fat));
  const meal = String(food.mealType || "").toLowerCase();
  return `${meal}__${name}__${calories}__${protein}__${carbs}__${fat}`;
}

function mergeMealFoods(
  backendFoods: JournalFood[],
  localFoods: JournalFood[],
): JournalFood[] {
  const merged = [...backendFoods];
  const seenIds = new Set<string>();
  const seenSignatures = new Set<string>();

  backendFoods.forEach((food) => {
    if (food.id) {
      seenIds.add(String(food.id));
    }
    seenSignatures.add(getFoodMergeKey(food));
  });

  localFoods.forEach((food) => {
    const idKey = food.id ? String(food.id) : "";
    const signatureKey = getFoodMergeKey(food);

    const hasMatchingId = idKey && seenIds.has(idKey);
    const hasMatchingSig = seenSignatures.has(signatureKey);

    if (!hasMatchingId && !hasMatchingSig) {
      if (idKey) seenIds.add(idKey);
      seenSignatures.add(signatureKey);
      merged.push(food);
    }
  });

  return merged;
}

function mapBackendFood(
  item: FoodLogsHomeMealItem,
  fallbackMeal: MealType,
): JournalFood {
  const mealType = (item.meal || fallbackMeal) as MealType;
  const isAi = Boolean(
    item.isAi ||
      item.source === "ai" ||
      item.foodSource === "ai" ||
      item.imageUrl,
  );
  const servingSize =
    item.servingDescription ||
    `${item.servingSize || 1} ${item.servingUnit || "serving"}`.trim();

  return {
    id: item.id,
    mealType,
    foodItem: {
      name: item.foodName,
      brand: item.brandName || (isAi ? "AI Meal" : ""),
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fats: item.fat,
      servingSize,
      imageUrl: item.imageUrl,
      source: item.source || item.foodSource,
      isAi,
      confidence: item.confidence,
      notes: item.notes,
    },
    quantity: 1,
    calories: item.calories,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
    imageUrl: item.imageUrl,
    confidence: item.confidence,
    notes: item.notes,
    source: item.source || item.foodSource,
    isAi,
    original: item,
  };
}

function mapLocalFood(item: any): JournalFood {
  const foodItem = item?.foodItem ?? {};
  const quantity = toNumber(item?.quantity) || 1;
  const isAi = Boolean(item?.isAi || foodItem?.isAi || item?.source === "ai");

  return {
    id: item?.id,
    mealType: (item?.mealType || "breakfast") as MealType,
    foodItem: {
      ...foodItem,
      brand: foodItem.brand || (isAi ? "AI Meal" : ""),
    },
    quantity,
    calories: toNumber(foodItem.calories) * quantity,
    protein: toNumber(foodItem.protein) * quantity,
    carbs: toNumber(foodItem.carbs) * quantity,
    fat: toNumber(foodItem.fats ?? foodItem.fat) * quantity,
    imageUrl: item?.imageUrl || foodItem.imageUrl,
    confidence: item?.confidence ?? foodItem.confidence,
    notes: item?.notes ?? foodItem.notes,
    source: item?.source ?? foodItem.source,
    isAi,
  };
}

export default function JournalScreen() {
  const {
    settings,
    getTodayLog,
    getLogByDate,
    removeFoodFromLog,
    removeFoodFromLocalLog,
    updateFoodInLocalLog,
    markLogsChanged,
  } = useNutrition();
  const { t, isRTL } = useLanguage();
  const { isTourActive, step, endTour } = useGuidedTour();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const screenWidth = Dimensions.get("window").width;

  const isStep3Active = isTourActive && step === 3;

  const [selectedDay, setSelectedDay] = useState(() =>
    formatLocalDate(new Date()),
  );
  const [homeData, setHomeData] = useState<any | null>(null);
  const [isLoadingMeals, setIsLoadingMeals] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editFood, setEditFood] = useState<JournalFood | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const loadJournalData = useCallback(async () => {
    setIsLoadingMeals(true);
    setLoadError(null);
    try {
      const data = await getFoodLogsHome(selectedDay);
      setHomeData(data);
    } catch (error: any) {
      console.error("Error loading journal meals:", error);
      setHomeData(null);
      setLoadError(
        error?.message ? String(error.message) : "Failed to load meals.",
      );
    } finally {
      setIsLoadingMeals(false);
    }
  }, [selectedDay]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      setTimeout(() => {
        if (isActive && flatListRef.current) {
          flatListRef.current.scrollToIndex({ index: 30, animated: false });
        }
      }, 300);

      void loadJournalData();

      return () => {
        isActive = false;
      };
    }, [loadJournalData]),
  );

  const localLog = getLogByDate ? getLogByDate(selectedDay) : getTodayLog();

  const meals = useMemo(() => {
    const localFoods = (localLog?.foods || []).map(mapLocalFood);
    const localMeals = {
      breakfast: localFoods.filter(
        (food: JournalFood) => food.mealType === "breakfast",
      ),
      lunch: localFoods.filter(
        (food: JournalFood) => food.mealType === "lunch",
      ),
      dinner: localFoods.filter(
        (food: JournalFood) => food.mealType === "dinner",
      ),
    };

    if (homeData?.meals) {
      const backendMeals = {
        breakfast: (homeData.meals.breakfast || []).map(
          (item: FoodLogsHomeMealItem) => mapBackendFood(item, "breakfast"),
        ),
        lunch: (homeData.meals.lunch || []).map((item: FoodLogsHomeMealItem) =>
          mapBackendFood(item, "lunch"),
        ),
        dinner: (homeData.meals.dinner || []).map(
          (item: FoodLogsHomeMealItem) => mapBackendFood(item, "dinner"),
        ),
      };

      return {
        breakfast: mergeMealFoods(
          backendMeals.breakfast,
          localMeals.breakfast,
        ),
        lunch: mergeMealFoods(backendMeals.lunch, localMeals.lunch),
        dinner: mergeMealFoods(backendMeals.dinner, localMeals.dinner),
      };
    }

    return localMeals;
  }, [homeData, localLog?.foods]);

  const totals = macroTotal(allMealFoods(meals));

  const calorieGoal = homeData?.goals?.calories ?? settings.calorieGoal;
  const caloriesConsumed = toNumber(totals.calories);
  const caloriesRemaining = Math.max(0, calorieGoal - caloriesConsumed);
  const progressPercentage =
    calorieGoal > 0 ? Math.min(100, (caloriesConsumed / calorieGoal) * 100) : 0;

  const getMealFoods = (mealType: MealType) => meals[mealType] || [];

  const openEdit = (food: JournalFood) => {
    setEditFood(food);
    setEditForm({
      meal: food.mealType,
      foodName: food.foodItem.name,
      calories: String(food.calories),
      protein: String(food.protein),
      carbs: String(food.carbs),
      fat: String(food.fat),
      notes: food.notes || food.foodItem.notes || "",
    });
  };

  const closeEdit = () => {
    if (isSavingEdit) return;
    setEditFood(null);
    setEditForm(null);
  };

  const handleDeleteFood = (food: JournalFood) => {
    const title = String(t("deleteFoodTitle"));
    const messageTemplate = String(t("deleteFoodMessage"));
    const message = messageTemplate.replace("{food}", food.foodItem.name);

    Alert.alert(title, message, [
      { text: String(t("cancel")), style: "cancel" },
      {
        text: String(t("delete")),
        style: "destructive",
        onPress: async () => {
          try {
            if (food.id) {
              let response: any = null;
              if (food.isAi) {
                response = await deleteAiMealScan(food.id!);
              } else {
                response = await backendDeleteFoodLog(food.id!);
              }

              await removeFoodFromLocalLog?.(food.id!, selectedDay, food);
              setHomeData((current: any) => {
                if (!current?.meals) return current;

                const deletedId = String(food.id);
                const nextMeals = { ...current.meals };

                (["breakfast", "lunch", "dinner"] as MealType[]).forEach(
                  (meal) => {
                    nextMeals[meal] = (nextMeals[meal] || []).filter(
                      (item: any) =>
                        String(item?._id ?? item?.id ?? item?.foodLogId ?? "") !==
                        deletedId,
                    );
                  },
                );

                return { ...current, meals: nextMeals };
              });

              markLogsChanged?.();
              await loadJournalData();
              Alert.alert(
                String(t("success")),
                response?.message
                  ? String(response.message)
                  : "Food deleted successfully.",
              );
            } else {
              await removeFoodFromLog(food.id!, selectedDay);
            }
          } catch (error: any) {
            Alert.alert(
              String(t("error")),
              error?.message ? String(error.message) : "Failed to delete food.",
            );
          }
        },
      },
    ]);
  };

  const handleSaveEdit = async () => {
    if (!editFood || !editForm || !editFood.id) return;
    if (!editForm.foodName.trim()) {
      Alert.alert(String(t("missingFields")), String(t("fillRequiredFields")));
      return;
    }

    setIsSavingEdit(true);
    try {
      const calories = Math.round(toNumber(editForm.calories));
      const protein = toNumber(editForm.protein);
      const carbs = toNumber(editForm.carbs);
      const fat = toNumber(editForm.fat);
      const updatedFood: JournalFood = {
        ...editFood,
        mealType: editForm.meal,
        foodItem: {
          ...editFood.foodItem,
          name: editForm.foodName.trim(),
          calories,
          protein,
          carbs,
          fats: fat,
          notes: editForm.notes.trim(),
        },
        calories,
        protein,
        carbs,
        fat,
        notes: editForm.notes.trim(),
      };

      let successMessage = "";
      if (editFood.isAi) {
        const response = await updateAiMealScan(editFood.id, {
          meal: editForm.meal,
          foodName: editForm.foodName.trim(),
          calories,
          protein,
          carbs,
          fat,
          fats: fat,
          notes: editForm.notes.trim(),
        });
        successMessage = response?.message || "AI meal updated successfully.";
      } else {
        const response = await backendUpdateFoodLog(editFood.id, {
          meal: editForm.meal,
          foodName: editForm.foodName.trim(),
          calories,
          protein,
          carbs,
          fat,
          fats: fat,
          notes: editForm.notes.trim(),
        });
        successMessage = response?.message || "Food log updated successfully.";
      }

      await updateFoodInLocalLog?.(editFood.id, selectedDay, editFood, updatedFood);
      setHomeData((current: any) => {
        if (!current?.meals) return current;

        const updatedId = String(editFood.id);
        const nextMeals = {
          breakfast: [...(current.meals.breakfast || [])],
          lunch: [...(current.meals.lunch || [])],
          dinner: [...(current.meals.dinner || [])],
        };

        (["breakfast", "lunch", "dinner"] as MealType[]).forEach((meal) => {
          nextMeals[meal] = nextMeals[meal].filter(
            (item: any) =>
              String(item?._id ?? item?.id ?? item?.foodLogId ?? "") !==
              updatedId,
          );
        });

        const targetMeal = editForm.meal;
        const mappedOriginal: FoodLogsHomeMealItem = {
          ...(editFood.original || {
            id: updatedId,
            foodLogId: updatedId,
            foodName: updatedFood.foodItem.name,
            calories,
            protein,
            carbs,
            fat,
            servingSize: 1,
            servingUnit: "serving",
            servingDescription: updatedFood.foodItem.servingSize,
            createdAt: new Date().toISOString(),
          }),
          id: updatedId,
          foodLogId: updatedId,
          foodName: updatedFood.foodItem.name,
          calories,
          protein,
          carbs,
          fat,
          meal: targetMeal,
          notes: updatedFood.notes,
        };

        nextMeals[targetMeal] = [
          ...(nextMeals[targetMeal] || []),
          mappedOriginal,
        ];
        return { ...current, meals: nextMeals };
      });

      markLogsChanged?.();
      await loadJournalData();
      closeEdit();
      Alert.alert(String(t("success")), successMessage);
    } catch (error: any) {
      Alert.alert(
        String(t("error")),
        error?.message ? String(error.message) : "Failed to update food.",
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  const MealSection = ({
    title,
    icon,
    mealType,
  }: {
    title: string;
    icon: React.ReactNode;
    mealType: MealType;
  }) => {
    const mealFoods = getMealFoods(mealType);
    const mealTotals = macroTotal(mealFoods);
    const hasFood = mealFoods.length > 0;

    return (
      <View
        style={[
          styles.mealSection,
          hasFood && styles.mealSectionWithFood,
          { borderColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[styles.mealHeader, { backgroundColor: colors.surface }]}
          onPress={() =>
            router.push({
              pathname: "/log/log",
              params: { meal: mealType, date: selectedDay },
            })
          }
          activeOpacity={0.7}
        >
          <View style={styles.mealTitleContainer}>
            <View style={styles.iconContainer}>{icon}</View>
            <View style={[styles.mealInfo]}>
              <Text
                style={[
                  styles.mealTitle,
                  { color: colors.text },
                  isRTL && {
                    writingDirection: "rtl",
                    alignSelf: "flex-start",
                  },
                ]}
              >
                {title}
              </Text>
              {hasFood ? (
                <Text
                  style={[
                    styles.mealCalories,
                    { color: colors.placeholder },
                    isRTL && {
                      writingDirection: "rtl",
                     alignSelf: "flex-start",


                    },
                  ]}
                >
                  {Math.round(mealTotals.calories)} {t("calShort")} •{" "}
                  {Math.round(mealTotals.protein)}{t("g")} {t("proteinShort")} •{" "}
                  {Math.round(mealTotals.carbs)}{t("g")} {t("carbsShort")} •{" "}
                  {Math.round(mealTotals.fat)}{t("g")} {t("fatShort")}
                </Text>
              ) : (
                <Text
                  style={[
                    styles.emptyMealSubtext,
                    { color: colors.placeholder },
                    isRTL && {
                      writingDirection: "rtl",
                      alignSelf: "flex-start",
                    },
                  ]}
                >
                  {t("tapToAddFood")}
                </Text>
              )}
            </View>
          </View>
          <View
            style={[
              styles.addMealButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Plus
              size={16}
              color={hasFood ? colors.placeholder : colors.primary}
            />
          </View>
        </TouchableOpacity>

        {hasFood && (
          <View style={[styles.mealFoods, { borderTopColor: colors.border }]}>
            {mealFoods.map((loggedFood: JournalFood) => (
              <FoodItem
                key={loggedFood.id || `${loggedFood.foodItem.name}-${mealType}`}
                loggedFood={loggedFood}
                onEdit={loggedFood.isAi ? openEdit : undefined}
                onRemove={() => handleDeleteFood(loggedFood)}
                showRemove
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderEditModal = () => {
    if (!editForm) return null;

    const mealOptions: {
      key: MealType;
      label: string;
      icon: React.ComponentType<{ size: number; color: string }>;
    }[] = [
      { key: "breakfast", label: String(t("breakfast")), icon: Coffee },
      { key: "lunch", label: String(t("lunch")), icon: Sun },
      { key: "dinner", label: String(t("dinner")), icon: Moon },
    ];
    const macroFields = [
      {
        key: "calories",
        label: String(t("caloriesLabel")),
        unit: String(t("kcal")),
        color: "#EF4444",
      },
      {
        key: "protein",
        label: String(t("protein")),
        unit: String(t("g")),
        color: "#1E90FF",
      },
      {
        key: "carbs",
        label: String(t("carbs")),
        unit: String(t("g")),
        color: "#F4C542",
      },
      {
        key: "fat",
        label: String(t("fats")),
        unit: String(t("g")),
        color: "#9B59B6",
      },
    ] as const;

    return (
      <Modal
        visible
        transparent
        animationType="slide"
        onRequestClose={closeEdit}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : "padding"}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} />
          <Pressable style={styles.editCard} onPress={Keyboard.dismiss}>
            <View style={styles.editHeader}>
              <Text style={styles.editTitle}>{t("editFoodTitle")}</Text>
              <TouchableOpacity style={styles.editClose} onPress={closeEdit}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              <Text style={styles.editLabel}>{t("meal")}</Text>
              <View style={styles.editMealGrid}>
                {mealOptions.map((meal) => {
                  const MealIcon = meal.icon;
                  const active = editForm.meal === meal.key;
                  return (
                    <TouchableOpacity
                      key={meal.key}
                      style={[styles.editMealButton, active && styles.editMealButtonActive]}
                      onPress={() =>
                        setEditForm((prev) =>
                          prev ? { ...prev, meal: meal.key } : prev,
                        )
                      }
                    >
                      <MealIcon
                        size={15}
                        color={active ? colors.background : colors.text}
                      />
                      <Text
                        style={[
                          styles.editMealButtonText,
                          active && styles.editMealButtonTextActive,
                        ]}
                      >
                        {meal.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.editLabel}>{t("foodName")}</Text>
              <TextInput
                style={styles.editInput}
                value={editForm.foodName}
                onChangeText={(foodName) =>
                  setEditForm((prev) => (prev ? { ...prev, foodName } : prev))
                }
                placeholder={String(t("foodNamePlaceholder"))}
                placeholderTextColor={colors.placeholder}
              />

              <View style={styles.editMacroGrid}>
                {macroFields.map((field) => (
                  <View key={field.key} style={styles.editMacroCard}>
                    <View style={styles.editMacroLabelRow}>
                      <View
                        style={[
                          styles.editMacroDot,
                          { backgroundColor: field.color },
                        ]}
                      />
                      <Text style={styles.editMacroLabel}>{field.label}</Text>
                    </View>
                    <View style={styles.editMacroInputRow}>
                      <TextInput
                        style={styles.editMacroInput}
                        value={editForm[field.key]}
                        onChangeText={(val) =>
                          setEditForm((prev) =>
                            prev ? { ...prev, [field.key]: val } : prev,
                          )
                        }
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={colors.placeholder}
                      />
                      <Text style={styles.editMacroUnit}>{field.unit}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <Text style={styles.editLabel}>{t("notes")}</Text>
              <TextInput
                style={[styles.editInput, styles.notesInput]}
                value={editForm.notes}
                onChangeText={(notes) =>
                  setEditForm((prev) => (prev ? { ...prev, notes } : prev))
                }
                placeholder={String(t("notesPlaceholder"))}
                placeholderTextColor={colors.placeholder}
                multiline
              />

              <TouchableOpacity
                style={[styles.saveEditButton, isSavingEdit && styles.disabled]}
                onPress={handleSaveEdit}
                disabled={isSavingEdit}
                activeOpacity={0.8}
              >
                {isSavingEdit ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <>
                    <Save size={18} color={colors.background} />
                    <Text style={styles.saveEditButtonText}>{t("saveChanges")}</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: colors.background },
      ]}
    >
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={[styles.header,{alignItems:"flex-start"}]}>
          <Text
            style={[
              styles.title,
              { color: colors.text },
              isRTL && { textAlign: "right", writingDirection: "rtl" },
            ]}
          >
            {t("dailyJournal")}
          </Text>
          <Text
            style={[
              styles.date,
              { color: colors.placeholder },
              isRTL && { textAlign: "right", writingDirection: "rtl" },
            ]}
          >
            {parseDateString(selectedDay).toLocaleDateString(
              isRTL ? "ar-SA" : "en-US",
              {
                weekday: "long",
                month: "long",
                day: "numeric",
              },
            )}
          </Text>
        </View>

        <View style={styles.daySelector}>
          <FlatList
            ref={flatListRef}
            data={Array.from({ length: 61 }, (_, index) => {
              const date = new Date();
              date.setDate(date.getDate() - 30 + index);
              return date;
            })}
            keyExtractor={(item) => item.toISOString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={30}
            getItemLayout={(_, index) => ({
              length: 67,
              offset: 67 * index,
              index,
            })}
            contentContainerStyle={{
              paddingHorizontal: screenWidth / 2 - 33.5,
            }}
            renderItem={({ item }) => {
              const dayName = item.toLocaleDateString(
                isRTL ? "ar-SA" : "en-US",
                { weekday: "short" },
              );
              const dayNum = item.getDate();
              const isSelected = selectedDay === formatLocalDate(item);

              return (
                <TouchableOpacity
                  onPress={() => setSelectedDay(formatLocalDate(item))}
                  activeOpacity={0.8}
                  style={[
                    styles.dayPill,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : colors.surface,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayName,
                      { color: isSelected ? "#fff" : colors.text },
                    ]}
                  >
                    {dayName}
                  </Text>
                  <Text
                    style={[
                      styles.dayNumber,
                      { color: isSelected ? "#fff" : colors.placeholder },
                    ]}
                  >
                    {dayNum}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        <View style={[styles.calorieWidget, { backgroundColor: colors.surface }]}>
          <View style={styles.calorieHeader}>
            <View style={styles.calorieIconContainer}>
              <Target size={20} color={colors.primary} />
              <Text style={[styles.calorieWidgetTitle, { color: colors.text }]}>
                {t("dailyCalories")}
              </Text>
            </View>
            {isLoadingMeals ? (
              <View
                style={[
                  styles.caloriePercentageSkeleton,
                  { backgroundColor: colors.border },
                ]}
              />
            ) : (
              <Text style={[styles.caloriePercentage, { color: colors.primary }]}>
                {Math.round(progressPercentage)}%
              </Text>
            )}
          </View>

          <View style={styles.calorieProgressContainer}>
            <View
              style={[
                styles.calorieProgressBar,
                { backgroundColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.calorieProgressFill,
                  {
                    width: `${progressPercentage}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.calorieStats}>
            <View style={styles.calorieStat}>
              <Text style={[styles.calorieStatNumber, { color: colors.text }]}>
                {Math.round(caloriesConsumed)}
              </Text>
              <Text style={[styles.calorieStatLabel, { color: colors.placeholder }]}>
                {t("consumed")}
              </Text>
            </View>
            <View style={[styles.calorieStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.calorieStat}>
              <Text style={[styles.calorieStatNumber, { color: colors.text }]}>
                {Math.round(caloriesRemaining)}
              </Text>
              <Text style={[styles.calorieStatLabel, { color: colors.placeholder }]}>
                {t("remaining")}
              </Text>
            </View>
            <View style={[styles.calorieStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.calorieStat}>
              <Text style={[styles.calorieStatNumber, { color: colors.text }]}>
                {Math.round(calorieGoal)}
              </Text>
              <Text style={[styles.calorieStatLabel, { color: colors.placeholder }]}>
                {t("goal")}
              </Text>
            </View>
          </View>
        </View>

        {!!loadError && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{loadError}</Text>
          </View>
        )}

        <View style={[styles.mealsCard, { backgroundColor: colors.surface }]}>
          <View style={styles.mealsHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("todaysMeals")}
            </Text>
            <Text style={[styles.totalMealsCalories, { color: colors.placeholder }]}>
              {Math.round(caloriesConsumed)} {t("calTotal")}
            </Text>
          </View>

          <MealSection
            title={String(t("breakfast"))}
            icon={<Coffee size={20} color={colors.accent} />}
            mealType="breakfast"
          />
          <MealSection
            title={String(t("lunch"))}
            icon={<Sun size={20} color={colors.accent} />}
            mealType="lunch"
          />
          <MealSection
            title={String(t("dinner"))}
            icon={<Moon size={20} color={colors.accent} />}
            mealType="dinner"
          />
        </View>

        <View style={styles.addFoodCard}>
          <TouchableOpacity
            style={[styles.addFoodButton, { backgroundColor: colors.primary }]}
            onPress={() =>
              router.push({
                pathname: "/log/log",
                params: { date: selectedDay },
              })
            }
          >
            <Plus size={24} color={colors.background} />
            <Text style={[styles.addFoodText, { color: colors.background }]}>
              {t("addFood")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {renderEditModal()}

      {/* Step 3 Guided Tour Centered Overlay Modal */}
      <Modal
        visible={isStep3Active}
        transparent
        animationType="fade"
        onRequestClose={endTour}
        statusBarTranslucent
      >
        <View style={styles.tourOverlayBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={endTour} />
          <View style={styles.tourOverlayContainer}>
            <GuidedTourCard
              stepNumber={3}
              totalSteps={3}
              title={String(t("tourCongratulationsTitle"))}
              description={String(t("tourCongratulationsDescription"))}
              arrowPosition="none"
              actionText={String(t("tourCongratulationsAction"))}
              onActionPress={endTour}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  tourOverlayBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  tourOverlayContainer: {
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    zIndex: 9999,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  date: {
    fontSize: 16,
    marginTop: 4,
  },
  daySelector: {
    paddingVertical: 10,
  },
  dayPill: {
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderRadius: 25,
    width: 55,
    height: 65,
  },
  dayName: {
    fontWeight: "700",
    fontSize: 16,
  },
  dayNumber: {
    fontSize: 14,
  },
  calorieWidget: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  calorieHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  calorieIconContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  calorieWidgetTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  caloriePercentage: {
    fontSize: 16,
    fontWeight: "700",
  },
  caloriePercentageSkeleton: {
    width: 42,
    height: 18,
    borderRadius: 9,
    opacity: 0.5,
  },
  calorieProgressContainer: {
    marginBottom: 20,
  },
  calorieProgressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  calorieProgressFill: {
    height: "100%",
    borderRadius: 4,
  },
  calorieStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  calorieStat: {
    flex: 1,
    alignItems: "center",
  },
  calorieStatNumber: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  calorieStatLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  calorieStatDivider: {
    width: 1,
    height: 32,
    marginHorizontal: 8,
  },
  errorCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 14,
    backgroundColor: "rgba(244,67,54,0.12)",
    borderWidth: 1,
    borderColor: "rgba(244,67,54,0.24)",
  },
  errorText: {
    color: "#ffb4a8",
    fontSize: 12,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  mealsCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
  },
  mealsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  totalMealsCalories: {
    fontSize: 14,
    fontWeight: "500",
  },
  mealSection: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  mealSectionWithFood: {
    backgroundColor: "transparent",
    borderWidth: 1,
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    minHeight: 64,
  },
  mealTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  mealInfo: {
    marginStart: 12,
    flex: 1,
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  mealCalories: {
    fontSize: 12,
    lineHeight: 18,
  },
  emptyMealSubtext: {
    fontSize: 13,
    fontStyle: "italic",
  },
  addMealButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginStart:8
  },
  mealFoods: {
    paddingHorizontal: 14,
    paddingBottom: 8,
    gap: 4,
    borderTopWidth: 1,
  },
  addFoodCard: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  addFoodButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  addFoodText: {
    fontSize: 16,
    fontWeight: "600",
  },
  rtlRow: {
    flexDirection: "row",
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "transparent",
  },
  editCard: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: "85%",
  },
  editHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  editTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  editClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  editLabel: {
    color: colors.placeholder,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  editMealGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  editMealButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  editMealButtonActive: {
    backgroundColor: colors.primary,
  },
  editMealButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  editMealButtonTextActive: {
    color: colors.background,
  },
  editInput: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 16,
  },
  editMacroGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  editMacroCard: {
    width: "48%",
    minHeight: 88,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  editMacroLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 8,
  },
  editMacroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  editMacroLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  editMacroInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 5,
  },
  editMacroInput: {
    flex: 1,
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
    paddingVertical: 0,
  },
  editMacroUnit: {
    color: colors.placeholder,
    fontSize: 11,
    fontWeight: "800",
    paddingBottom: 3,
  },
  notesInput: {
    minHeight: 72,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  saveEditButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  saveEditButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: "900",
  },
  disabled: {
    opacity: 0.68,
  },
});
