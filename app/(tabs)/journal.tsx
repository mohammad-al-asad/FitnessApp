// Displays the Journal screen — where users view and manage their logged meals (breakfast, lunch, dinner), track daily calories, and add or remove foods from their nutrition log.
import { router } from 'expo-router';
import { Coffee, Moon, Plus, Sun, Target } from 'lucide-react-native';
import React from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '@/hooks/language-context';

import { useFocusEffect } from '@react-navigation/native';
import { Dimensions } from 'react-native';

import { useNutrition } from '@/hooks/nutrition-store';

import FoodItem from '@/components/FoodItem';

export default function JournalScreen() {
  const { settings, getTodayLog, removeFoodFromLog } = useNutrition();
  const { getLogByDate } = useNutrition();
const [selectedDay, setSelectedDay] = React.useState(new Date().toISOString().split('T')[0]);
const flatListRef = React.useRef<FlatList>(null);
const screenWidth = Dimensions.get('window').width;
useFocusEffect(
  React.useCallback(() => {
    // Every time the screen is focused, center on today's date
    setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToIndex({ index: 30, animated: false });
      }
    }, 300);
  }, [])
);


const todayLog = getLogByDate ? getLogByDate(selectedDay) : getTodayLog();

  const { t, isRTL } = useLanguage();
  const colors = {
  text: "#FFFFFF",
  background: "#1A1A1A",
  tint: "#4CAF50",
  tabIconDefault: "#666666",
  tabIconSelected: "#4CAF50",
  primary: "#4CAF50",
  secondary: "#388E3C",
  accent: "#66BB6A",
  warning: "#FF9800",
  info: "#2196F3",
  surface: "#2D2D2D",
  border: "#404040",
  placeholder: "#999999",
  success: "#4CAF50",
  error: "#F44336",
  card: "#2D2D2D",
};


  
  const insets = useSafeAreaInsets();

  const caloriesConsumed = todayLog.totalCalories;
  const calorieGoal = settings.calorieGoal;
  const caloriesRemaining = Math.max(0, calorieGoal - caloriesConsumed);
  const progressPercentage = Math.round((caloriesConsumed / calorieGoal) * 100);



  const getMealFoods = (mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks') => {
  if (!mealType) return [];
  return todayLog.foods.filter((food: any) => food.mealType === mealType);
};


  const getMealCalories = (mealType: 'breakfast' | 'lunch' | 'dinner') => {
    return getMealFoods(mealType).reduce((total: number, food: any) => 
  total + (food.foodItem.calories * food.quantity), 0
);

  };

  const MealSection = ({ 
    title, 
    icon, 
    mealType 
  }: { 
    title: string; 
    icon: React.ReactNode; 
    mealType: 'breakfast' | 'lunch' | 'dinner';
  }) => {
    const mealFoods = getMealFoods(mealType);
    const mealCalories = getMealCalories(mealType);
    const hasFood = mealFoods.length > 0;

    return (
      <View style={[styles.mealSection, hasFood && styles.mealSectionWithFood, { backgroundColor: colors.background }, hasFood && { borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.mealHeader, isRTL && styles.rtlRow]}
          onPress={() => router.push({ pathname: '/log/log', params: { date: selectedDay } })}
          activeOpacity={0.7}
        >
          <View style={[styles.mealTitleContainer, isRTL && styles.rtlRow]}>
            <View style={styles.iconContainer}>{icon}</View>
            <View style={[styles.mealInfo, isRTL ? { marginRight: 12, marginLeft: 0 } : { marginLeft: 12, marginRight: 12 }]}>
              <Text style={[styles.mealTitle, isRTL && styles.rtlText, { color: colors.text }]}>{title}</Text>
              {hasFood ? (
                <Text style={[styles.mealCalories, isRTL && styles.rtlText, { color: colors.placeholder }]}>
                  {Math.round(mealCalories)} {t('calories')} • {mealFoods.length} {mealFoods.length > 1 ? t('items') : t('item')}
                </Text>
              ) : (
                <Text style={[styles.emptyMealSubtext, isRTL && styles.rtlText, { color: colors.placeholder }]}>{t('tapToAddFood')}</Text>
              )}
            </View>
          </View>
          <View style={[styles.addMealButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Plus size={16} color={hasFood ? colors.placeholder : colors.primary} />
          </View>
        </TouchableOpacity>
        
        {hasFood && (
          <View style={[styles.mealFoods, { borderTopColor: colors.border }]}>
           {mealFoods.map((loggedFood: any) => (
              <FoodItem
  key={loggedFood.id}
  loggedFood={loggedFood}
  onRemove={() => removeFoodFromLog(loggedFood.id, selectedDay)}
  showRemove={true}
/>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, isRTL && styles.rtlText, { color: colors.text }]}>Daily Journal</Text>
<Text style={[styles.date, isRTL && styles.rtlText, { color: colors.placeholder }]}>
  {new Date(selectedDay).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  })}
</Text>

        </View>

{/* 🔹 Horizontal day selector */}
<View style={{ paddingVertical: 10 }}>
  <FlatList
  ref={flatListRef}
    data={Array.from({ length: 61 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - 30 + i); // 30 days back + 30 forward
      return date;
    })}
    keyExtractor={(item) => item.toISOString()}
    horizontal
    showsHorizontalScrollIndicator={false}
      initialScrollIndex={30}
  getItemLayout={(_, index) => ({
    length: 67, // ← width (55) + margin (12)
    offset: 67 * index,
    index,
  })}

    contentContainerStyle={{ paddingHorizontal: (screenWidth / 2) - 33.5 }}

    renderItem={({ item }) => {
      const dayName = item.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = item.getDate();
      const isSelected = selectedDay === item.toISOString().split('T')[0];

      return (
        <TouchableOpacity
          onPress={() => setSelectedDay(item.toISOString().split('T')[0])}
          activeOpacity={0.8}
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
            backgroundColor: isSelected ? colors.primary : colors.surface,
            borderRadius: 25,
            width: 55,
            height: 65,
          }}>
          <Text
            style={{
              color: isSelected ? '#fff' : colors.text,
              fontWeight: '700',
              fontSize: 16,
            }}>
            {dayName}
          </Text>
          <Text
            style={{
              color: isSelected ? '#fff' : colors.placeholder,
              fontSize: 14,
            }}>
            {dayNum}
          </Text>
        </TouchableOpacity>
      );
    }}
  />
</View>



       {/* Calorie Count Widget */}
<View
  style={[
    styles.calorieWidget,
    { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 16 },
  ]}
>

          <View style={[styles.calorieHeader, isRTL && styles.rtlRow]}>
            <View style={[styles.calorieIconContainer, isRTL && styles.rtlRow]}>
              <Target size={20} color={colors.primary} />
              <Text style={[styles.calorieWidgetTitle, isRTL && styles.rtlText, { color: colors.text }]}>{t('dailyCalories')}</Text>
            </View>
            <Text style={[styles.caloriePercentage, isRTL && styles.rtlText, { color: colors.primary }]}>
              {Math.round(progressPercentage)}%
            </Text>
          </View>
          
          <View style={styles.calorieProgressContainer}>
            <View style={[styles.calorieProgressBar, { backgroundColor: colors.border }]}>
              <View 
                style={[
                  styles.calorieProgressFill, 
                  { width: `${progressPercentage}%`, backgroundColor: colors.primary },
                  progressPercentage >= 100 && styles.calorieProgressComplete
                ]} 
              />
            </View>
          </View>
          
          <View style={[styles.calorieStats, isRTL && styles.calorieStatsRTL]}>
            <View style={styles.calorieStat}>
              <Text style={[styles.calorieStatNumber, isRTL && styles.rtlText, { color: colors.text }]}>
                {Math.round(caloriesConsumed)}
              </Text>
              <Text style={[styles.calorieStatLabel, isRTL && styles.rtlText, { color: colors.placeholder }]}>{t('consumed')}</Text>
            </View>
            
            <View style={[styles.calorieStatDivider, { backgroundColor: colors.border }]} />
            
            <View style={styles.calorieStat}>
              <Text style={[styles.calorieStatNumber, isRTL && styles.rtlText, { color: colors.text }]}>
                {Math.round(caloriesRemaining)}
              </Text>
              <Text style={[styles.calorieStatLabel, isRTL && styles.rtlText, { color: colors.placeholder }]}>{t('remaining')}</Text>
            </View>
            
            <View style={[styles.calorieStatDivider, { backgroundColor: colors.border }]} />
            
            <View style={styles.calorieStat}>
              <Text style={[styles.calorieStatNumber, isRTL && styles.rtlText, { color: colors.text }]}>
                {Math.round(calorieGoal)}
              </Text>
              <Text style={[styles.calorieStatLabel, isRTL && styles.rtlText, { color: colors.placeholder }]}>{t('goal')}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.mealsCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.mealsHeader, isRTL && styles.rtlRow]}>
            <Text style={[styles.sectionTitle, isRTL && styles.rtlText, { color: colors.text }]}>{t('todaysMeals')}</Text>
            <Text style={[styles.totalMealsCalories, isRTL && styles.rtlText, { color: colors.placeholder }]}>
              {Math.round(caloriesConsumed)} {t('calTotal')}
            </Text>
          </View>
          
          <MealSection 
            title={String(t("breakfast"))
} 
            icon={<Coffee size={20} color={colors.accent} />}
            mealType="breakfast"
          />
          
          <MealSection 
            title={String(t("lunch"))
} 
            icon={<Sun size={20} color={colors.accent} />}
            mealType="lunch"
          />
          
          <MealSection 
            title={String(t("dinner"))
} 
            icon={<Moon size={20} color={colors.accent} />}
            mealType="dinner"
          />
        </View>

        <View style={styles.addFoodCard}>
          <TouchableOpacity
            style={[styles.addFoodButton, isRTL && styles.rtlRow, { backgroundColor: colors.primary }]}
           onPress={() => router.push({ pathname: '/log/log', params: { date: selectedDay } })}
          >
            <Plus size={24} color={colors.background} />
            <Text style={[styles.addFoodText, { color: colors.background }]}>{t('addFood')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 16,
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  mealsCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
  },
  mealsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  totalMealsCalories: {
    fontSize: 14,
    fontWeight: '500',
  },
  mealSection: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mealSectionWithFood: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    minHeight: 64,
  },
  mealTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mealInfo: {
    marginLeft: 12,
    marginRight: 12,
    flex: 1,
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  mealCalories: {
    fontSize: 13,
  },
  emptyMealSubtext: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  addMealButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  mealFoods: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    borderTopWidth: 1,
  },
  addFoodCard: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  addFoodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  addFoodText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // RTL Styles
  rtlText: {
    textAlign: 'right',
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  calorieStatsRTL: {
    flexDirection: 'row-reverse',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Calorie Widget Styles
  calorieWidget: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  calorieHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calorieIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calorieWidgetTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  caloriePercentage: {
    fontSize: 16,
    fontWeight: '700',
  },
  calorieProgressContainer: {
    marginBottom: 20,
  },
  calorieProgressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  calorieProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  calorieProgressComplete: {
    backgroundColor: '#10B981',
  },
  calorieStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calorieStat: {
    flex: 1,
    alignItems: 'center',
  },
  calorieStatNumber: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  calorieStatLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  calorieStatDivider: {
    width: 1,
    height: 32,
    marginHorizontal: 8,
  },
});
