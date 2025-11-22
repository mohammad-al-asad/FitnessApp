//log food screen
import colors from '@/constants/colors';
import { useNutrition } from '@/hooks/nutrition-store';
import type { FoodItem } from '@/types/nutrition';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Apple, Check, ChevronDown, Moon, Sun, Sunrise, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';


// --- Serving size parser (robust) ---
function computeServing(servingRaw?: string): { grams: number; display: string } {
  const raw = (servingRaw ?? '').toString().trim();
  if (!raw || /^na$/i.test(raw)) return { grams: 100, display: '100g' };

  const s = raw.toLowerCase();

  // explicit grams: "150g", "150 gram"
  let m = s.match(/(\d+(?:\.\d+)?)\s*(g|gram|grams)\b/);
  if (m) return { grams: parseFloat(m[1]), display: raw };

  // ml
  m = s.match(/(\d+(?:\.\d+)?)\s*ml\b/);
  if (m) return { grams: parseFloat(m[1]), display: raw };

  // liters
  m = s.match(/(\d+(?:\.\d+)?)\s*l\b/);
  if (m) return { grams: parseFloat(m[1]) * 1000, display: raw };

  // fraction cups like "1/2 cup 130 g"
  const frac = s.match(/(\d+)\s*\/\s*(\d+)/);
  if (frac && s.includes('cup')) {
    const v = parseFloat(frac[1]) / parseFloat(frac[2]);
    return { grams: Math.round(v * 240), display: raw };
  }

  // tablespoons / teaspoons
  m = s.match(/(\d+(?:\.\d+)?)\s*(tablespoon|tbsp)\b/);
  if (m) return { grams: parseFloat(m[1]) * 15, display: raw };

  m = s.match(/(\d+(?:\.\d+)?)\s*(teaspoon|tsp)\b/);
  if (m) return { grams: parseFloat(m[1]) * 5, display: raw };

  // plain cups like "1 cup"
  m = s.match(/(\d+(?:\.\d+)?)\s*(cup|cups)\b/);
  if (m) return { grams: parseFloat(m[1]) * 240, display: raw };

  // fallback: first number only -> grams
  m = s.match(/(\d+(?:\.\d+)?)/);
  if (m) return { grams: parseFloat(m[1]), display: `${m[1]}g` };

  // last resort
  return { grams: 100, display: '100g' };
}



// --- Serving key resolver (accepts many shapes) ---
function getRawServing(anyFood: any): string {
  if (!anyFood) return "";
  return (
    anyFood.servingSize ??
    anyFood["SERVING SIZE"] ??
    anyFood.serving ??
    anyFood.serving_size ??
    anyFood.ServingSize ??
    anyFood["Serving Size"] ??
    anyFood["serving size"] ??
    ""
  );
}




type MeasurementUnit = {
  name: string;
  grams: number;
  isDefault?: boolean;
};

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

const MEAL_OPTIONS: { key: MealType; label: string; icon: React.ComponentType<{ size: number; color: string }> }[] = [
  { key: 'breakfast', label: 'Breakfast', icon: Sunrise },
  { key: 'lunch', label: 'Lunch', icon: Sun },
  { key: 'dinner', label: 'Dinner', icon: Moon },
  { key: 'snacks', label: 'Snacks', icon: Apple },
];

const MACRO_COLORS = {
  protein: '#5B9FFF',
  carbs: '#FFB547',
  fat: '#B47EFF',
};

export default function LogFoodScreen() {
  const { addFoodToLog, settings } = useNutrition();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
 const date = Array.isArray(params.date)
  ? params.date[0]
  : params.date || new Date().toISOString().split('T')[0];


  const [food, setFood] = useState<FoodItem | null>(null);
  const [servingAmount, setServingAmount] = useState('1');
  const [selectedUnit, setSelectedUnit] = useState<MeasurementUnit | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<MealType>('breakfast');
  const [measurementUnits, setMeasurementUnits] = useState<MeasurementUnit[]>([]);
  
  const checkmarkScale = new Animated.Value(0);
  const checkmarkOpacity = new Animated.Value(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showServingModal, setShowServingModal] = useState(false);

  useEffect(() => {
    if (params.foodData) {
      try {
        const foodData = JSON.parse(params.foodData as string) as FoodItem;
        setFood(foodData);

      const rawServing = getRawServing(foodData);
const { grams: defaultGrams, display: displayServing } = computeServing(rawServing);


// Debug + use helper to resolve the correct serving key
console.log("🔎 foodData keys:", Object.keys(foodData));
console.log("🔎 serving candidates:", {
  servingSize: (foodData as any).servingSize,
  SERVING_SIZE: (foodData as any)["SERVING SIZE"],
});






const units: MeasurementUnit[] = [
  { name: `1 serving (${displayServing})`, grams: defaultGrams, isDefault: true },
  { name: '1 gram', grams: 1 },
];





  

        if (defaultGrams !== 100) {
  units.push({ name: '100g', grams: 100 });
}

        if (defaultGrams !== 1) units.push({ name: '1g', grams: 1 });

        const foodName = foodData.name.toLowerCase();
        if (foodName.includes('bread') || foodName.includes('slice')) {
          units.push({ name: '1 slice', grams: 30 });
        } else if (foodName.includes('cup') || foodName.includes('rice') || foodName.includes('pasta')) {
          units.push({ name: '1 cup', grams: 200 });
          units.push({ name: '1/2 cup', grams: 100 });
        } else if (foodName.includes('milk') || foodName.includes('juice')) {
          units.push({ name: '1 cup (240ml)', grams: 240 });
        } else if (foodName.includes('egg')) {
          units.push({ name: '1 large egg', grams: 50 });
        }

        setMeasurementUnits(units);
        setSelectedUnit(units[0]);
      } catch (error) {
        console.error('Error parsing food data:', error);
        router.back();
      }
    }
  }, [params.foodData]);

  if (!food || !selectedUnit) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <Stack.Screen 
          options={{ 
            headerShown: false,
          }} 
        />
      </View>
    );
  }

  const calculateNutrition = () => {
    const amount = parseFloat(servingAmount) || 0;
    const multiplier = (selectedUnit.grams / 100) * amount;
    
    return {
      calories: Math.round(food.calories * multiplier),
      protein: Math.round(food.protein * multiplier * 10) / 10,
      carbs: Math.round(food.carbs * multiplier * 10) / 10,
      fats: Math.round(food.fats * multiplier * 10) / 10,
    };
  };

  const nutrition = calculateNutrition();

  const totalMacros = nutrition.protein + nutrition.carbs + nutrition.fats;
  const proteinPercent = totalMacros > 0 ? Math.round((nutrition.protein / totalMacros) * 100) : 0;
  const carbsPercent = totalMacros > 0 ? Math.round((nutrition.carbs / totalMacros) * 100) : 0;
  const fatsPercent = totalMacros > 0 ? Math.round((nutrition.fats / totalMacros) * 100) : 0;

  const caloriePercent = Math.round((nutrition.calories / settings.calorieGoal) * 100);
  const proteinGoalPercent = Math.round((nutrition.protein / settings.proteinGoal) * 100);
  const carbsGoalPercent = Math.round((nutrition.carbs / settings.carbsGoal) * 100);
  const fatsGoalPercent = Math.round((nutrition.fats / settings.fatsGoal) * 100);

  const handleLogFood = async () => {
    const amount = parseFloat(servingAmount);
    if (isNaN(amount) || amount <= 0) {
      return;
    }

    try {
      const actualQuantity = (selectedUnit.grams / 100) * amount;
    await addFoodToLog(food, actualQuantity, params.date as string, selectedMeal);





      
      setShowSuccess(true);
      
      Animated.parallel([
        Animated.spring(checkmarkScale, {
          toValue: 1,
          friction: 5,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.timing(checkmarkOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTimeout(() => {
          router.push('/(tabs)/home');
        }, 400);
      });
    } catch (error) {
      console.error('Error logging food:', error);
    }
  };

  const renderMacroRing = () => {
    const size = 140;
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const proteinLength = (proteinPercent / 100) * circumference;
    const carbsLength = (carbsPercent / 100) * circumference;
    const fatsLength = (fatsPercent / 100) * circumference;

    return (
      <View style={styles.ringContainer}>
        <Svg width={size} height={size} style={styles.svg}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={MACRO_COLORS.carbs}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${carbsLength} ${circumference}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={MACRO_COLORS.fat}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${fatsLength} ${circumference}`}
            strokeDashoffset={-carbsLength}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={MACRO_COLORS.protein}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${proteinLength} ${circumference}`}
            strokeDashoffset={-(carbsLength + fatsLength)}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <View style={styles.ringCenter}>
          <Text style={styles.ringCalories}>{nutrition.calories}</Text>
          <Text style={styles.ringLabel}>calories</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          headerShown: false,
        }} 
      />
      
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <X size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Food</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView 
        style={styles.scrollContent} 
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.foodHeader}>
          <Text style={styles.foodName}>{food.name}</Text>
          {food.brand && (
            <Text style={styles.brandName}>{food.brand}</Text>
          )}
        </View>

        <View style={styles.servingSection}>
          <View style={styles.servingRow}>
            <View style={styles.servingInputGroup}>
              <Text style={styles.inputLabel}>Servings</Text>
              <TextInput
                style={styles.servingInput}
                value={servingAmount}
                onChangeText={setServingAmount}
                keyboardType="numeric"
                selectTextOnFocus
                placeholder="1"
                placeholderTextColor={colors.placeholder}
              />
            </View>

            <View style={styles.servingSizeGroup}>
              <Text style={styles.inputLabel}>Serving Size</Text>
              <TouchableOpacity 
  style={styles.servingPicker}
  onPress={() => setShowServingModal(true)}
>
 <Text style={styles.servingPickerText} numberOfLines={1}>
  {selectedUnit.name}
</Text>

<ChevronDown size={16} color={colors.placeholder} />

</TouchableOpacity>
<Modal visible={showServingModal} transparent animationType="fade">
  <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
    <View style={{ backgroundColor: colors.surface, margin: 30, borderRadius: 12, paddingVertical: 16 }}>
      <TouchableOpacity
  style={{ paddingVertical: 16, paddingHorizontal: 20 }}
  onPress={() => {
    const { grams, display } = computeServing(getRawServing(food));
    setSelectedUnit({ name: `1 serving (${display})`, grams });
    setShowServingModal(false);
  }}
>
  <Text style={{ color: colors.text, fontSize: 16 }}>
    {`1 serving (${computeServing(getRawServing(food)).display})`}
  </Text>
</TouchableOpacity>



      <TouchableOpacity
  style={{ paddingVertical: 16, paddingHorizontal: 20 }}
  onPress={() => {
    const servingText = getRawServing(food).toLowerCase();
    const isLiquid =
      servingText.includes('ml') ||
      servingText.includes('l') ||
      servingText.includes('cup') ||
      servingText.includes('juice') ||
      servingText.includes('milk') ||
      servingText.includes('water');

    setSelectedUnit({
      name: isLiquid ? '1 ml' : '1 gram',
      grams: 1,
    });
    setShowServingModal(false);
  }}
>
  <Text style={{ color: colors.text, fontSize: 16 }}>
    {getRawServing(food).toLowerCase().includes('ml') ||
    getRawServing(food).toLowerCase().includes('l') ||
    getRawServing(food).toLowerCase().includes('cup') ||
    getRawServing(food).toLowerCase().includes('juice') ||
    getRawServing(food).toLowerCase().includes('milk') ||
    getRawServing(food).toLowerCase().includes('water')
      ? '1 ml'
      : '1 gram'}
  </Text>
</TouchableOpacity>



      <TouchableOpacity onPress={() => setShowServingModal(false)} style={{ paddingVertical: 16, alignItems: 'center' }}>
        <Text style={{ color: colors.placeholder, fontSize: 16 }}>Cancel</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

            </View>
          </View>
        </View>

        <View style={styles.mealSection}>
          <Text style={styles.sectionLabel}>Meal</Text>
          <View style={styles.mealGrid}>
            {MEAL_OPTIONS.map((meal) => {
              const MealIcon = meal.icon;
              return (
                <TouchableOpacity
                  key={meal.key}
                  style={[
                    styles.mealButton,
                    selectedMeal === meal.key && styles.mealButtonActive
                  ]}
                  onPress={() => setSelectedMeal(meal.key)}
                  activeOpacity={0.7}
                >
                  <MealIcon 
                    size={18} 
                    color={selectedMeal === meal.key ? '#121212' : colors.text} 
                  />
                  <Text style={[
                    styles.mealLabel,
                    selectedMeal === meal.key && styles.mealLabelActive
                  ]}>
                    {meal.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.nutritionSection}>
          {renderMacroRing()}
          
          <View style={styles.macroBreakdown}>
            <View style={styles.macroItem}>
              <View style={styles.macroHeader}>
                <View style={[styles.macroDot, { backgroundColor: MACRO_COLORS.carbs }]} />
                <Text style={styles.macroPercent}>{carbsPercent}%</Text>
              </View>
              <Text style={styles.macroName}>Carbs</Text>
              <Text style={styles.macroValue}>{nutrition.carbs}g</Text>
            </View>

            <View style={styles.macroItem}>
              <View style={styles.macroHeader}>
                <View style={[styles.macroDot, { backgroundColor: MACRO_COLORS.fat }]} />
                <Text style={styles.macroPercent}>{fatsPercent}%</Text>
              </View>
              <Text style={styles.macroName}>Fat</Text>
              <Text style={styles.macroValue}>{nutrition.fats}g</Text>
            </View>

            <View style={styles.macroItem}>
              <View style={styles.macroHeader}>
                <View style={[styles.macroDot, { backgroundColor: MACRO_COLORS.protein }]} />
                <Text style={styles.macroPercent}>{proteinPercent}%</Text>
              </View>
              <Text style={styles.macroName}>Protein</Text>
              <Text style={styles.macroValue}>{nutrition.protein}g</Text>
            </View>
          </View>
        </View>

        <View style={styles.dailyGoalsSection}>
          <Text style={styles.dailyGoalsTitle}>Percent of Daily Goals</Text>
          
          <View style={styles.goalItem}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalName}>Calories</Text>
              <Text style={styles.goalValues}>{nutrition.calories} / {settings.calorieGoal}</Text>
            </View>
            <View style={styles.goalBarContainer}>
              <View 
                style={[
                  styles.goalBar, 
                  { 
                    width: `${Math.min(caloriePercent, 100)}%`,
                    backgroundColor: colors.primary
                  }
                ]} 
              />
            </View>
            <Text style={styles.goalPercent}>{caloriePercent}%</Text>
          </View>

          <View style={styles.goalItem}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalName}>Carbs</Text>
              <Text style={styles.goalValues}>{nutrition.carbs}g / {settings.carbsGoal}g</Text>
            </View>
            <View style={styles.goalBarContainer}>
              <View 
                style={[
                  styles.goalBar, 
                  { 
                    width: `${Math.min(carbsGoalPercent, 100)}%`,
                    backgroundColor: MACRO_COLORS.carbs
                  }
                ]} 
              />
            </View>
            <Text style={styles.goalPercent}>{carbsGoalPercent}%</Text>
          </View>

          <View style={styles.goalItem}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalName}>Fat</Text>
              <Text style={styles.goalValues}>{nutrition.fats}g / {settings.fatsGoal}g</Text>
            </View>
            <View style={styles.goalBarContainer}>
              <View 
                style={[
                  styles.goalBar, 
                  { 
                    width: `${Math.min(fatsGoalPercent, 100)}%`,
                    backgroundColor: MACRO_COLORS.fat
                  }
                ]} 
              />
            </View>
            <Text style={styles.goalPercent}>{fatsGoalPercent}%</Text>
          </View>

          <View style={styles.goalItem}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalName}>Protein</Text>
              <Text style={styles.goalValues}>{nutrition.protein}g / {settings.proteinGoal}g</Text>
            </View>
            <View style={styles.goalBarContainer}>
              <View 
                style={[
                  styles.goalBar, 
                  { 
                    width: `${Math.min(proteinGoalPercent, 100)}%`,
                    backgroundColor: MACRO_COLORS.protein
                  }
                ]} 
              />
            </View>
            <Text style={styles.goalPercent}>{proteinGoalPercent}%</Text>
          </View>
        </View>

<View 
        style={[
          styles.footer, 
          { 
            paddingBottom: insets.bottom + 16,
           
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.logButton} 
          onPress={handleLogFood}
          activeOpacity={0.85}
        >
          <Text style={styles.logButtonText}>Add to {MEAL_OPTIONS.find(m => m.key === selectedMeal)?.label}</Text>
        </TouchableOpacity>
      </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      

      {showSuccess && (
        <View style={styles.successOverlay}>
          <Animated.View 
            style={[
              styles.successCircle,
              { 
                opacity: checkmarkOpacity,
                transform: [{ scale: checkmarkScale }]
              }
            ]}
          >
            <Check size={32} color="#121212" strokeWidth={3} />
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: -0.3,
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  foodHeader: {
    marginBottom: 20,
  },
  foodName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  brandName: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.placeholder,
  },
  servingSection: {
    marginBottom: 24,
  },
  servingRow: {
    flexDirection: 'row',
    gap: 12,
  },
  servingInputGroup: {
    flex: 1,
  },
  servingSizeGroup: {
    flex: 2,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.placeholder,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  servingInput: {
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  servingPicker: {
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  servingPickerText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
  mealSection: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.placeholder,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  mealGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mealButton: {
    flex: 1,
    minWidth: '47%',
    height: 56,
    backgroundColor: colors.surface,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  mealButtonActive: {
    backgroundColor: colors.primary,
  },
  mealLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  mealLabelActive: {
    color: '#121212',
  },
  nutritionSection: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  ringContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  svg: {
    transform: [{ rotate: '0deg' }],
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCalories: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  ringLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.placeholder,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  macroBreakdown: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
  },
  macroItem: {
    alignItems: 'center',
    gap: 4,
  },
  macroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  macroName: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.placeholder,
  },
  macroValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  dailyGoalsSection: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  dailyGoalsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  goalItem: {
    marginBottom: 16,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  goalName: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
  },
  goalValues: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.placeholder,
  },
  goalBarContainer: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  goalBar: {
    height: '100%',
    borderRadius: 3,
  },
  goalPercent: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  logButton: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#121212',
    letterSpacing: 0.3,
  },
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  successCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
});
