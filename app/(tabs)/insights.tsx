// Displays the Progress screen — visualizing user progress with weekly calorie and macro charts, streak stats, and averages using animated bars and color-coded performance indicators.
import { MacroColors } from '@/constants/colors';
import { COLORS, useLanguage } from '@/hooks/language-context';
import { useNutrition } from '@/hooks/nutrition-store';
import { router } from 'expo-router';
import { Calendar, ChevronRight, Flame, TrendingUp } from 'lucide-react-native';
import React from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProgressScreen() {
  const { getProgressData, settings } = useNutrition();
  const { t, isRTL } = useLanguage();
  const colors = COLORS;
  const progressData = getProgressData();
  interface WeeklyDay {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

 const weeklyData: WeeklyDay[] = progressData?.weeklyData ?? [];
 // ✅ safe fallback
  type DayData = { date: string; calories: number; protein: number; carbs: number; fats: number };

  const insets = useSafeAreaInsets();

  const getWeeklyAverage = (key: 'calories' | 'protein' | 'carbs' | 'fats') => {
    if (!weeklyData.length) return 0; // ✅ prevent crash
    const total = weeklyData.reduce(
      (sum: number, day: { [key in 'calories' | 'protein' | 'carbs' | 'fats']: number }) => sum + (day[key] || 0),
      0
    );
    return Math.round(total / 7);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const dayIndex = date.getDay();
    const days = isRTL 
    ? ['احد', 'اثنين', 'ثلاثاء', 'اربعاء', 'خميس', 'جمعة', 'سبت']
    : ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    return t(days[dayIndex] as any);
  };

  const getBarHeight = (value: number, max: number) => {
    const percentage = (value / max) * 100;
    return Math.min(Math.max(percentage, 5), 100);
  };

  const getBarColor = (calories: number, goal: number, goalType: string) => {
    const ratio = calories / goal;

    if (goalType === 'gain') {
      if (ratio >= 1.1) return '#E74C3C';
      if (ratio >= 0.9) return '#4CAF50';
      if (ratio >= 0.7) return '#FFA500';
      return '#666';
    }

    if (goalType === 'maintain') {
      if (ratio >= 1.2) return '#E74C3C';
      if (ratio >= 0.9 && ratio <= 1.1) return '#4CAF50';
      if (ratio >= 0.7) return '#FFA500';
      return '#666';
    }

    if (goalType === 'lose') {
      if (ratio >= 1.2) return '#E74C3C';
      if (ratio >= 0.8 && ratio <= 1.0) return '#4CAF50';
      if (ratio >= 0.6) return '#FFA500';
      return '#666';
    }

    return '#4CAF50';
  };

  // 🔹 Animated bar heights setup (safe for empty weeklyData)
  const animatedHeights = weeklyData.map(() => new Animated.Value(0));

  React.useEffect(() => {
    if (!weeklyData.length) return; // ✅ skip if no data yet
    Animated.parallel(
      animatedHeights.map((anim: Animated.Value, i: number) =>
        Animated.timing(anim, {
          toValue: getBarHeight(weeklyData[i].calories, settings.calorieGoal),
          duration: 600,
          useNativeDriver: false,
        })
      )
    ).start();
  }, [weeklyData]);

  const macros = isRTL
    ? [
        { key: 'fats', color: MacroColors.fats, goal: settings.fatsGoal },
        { key: 'carbs', color: MacroColors.carbs, goal: settings.carbsGoal },
        { key: 'protein', color: MacroColors.protein, goal: settings.proteinGoal },
      ]
    : [
        { key: 'protein', color: MacroColors.protein, goal: settings.proteinGoal },
        { key: 'carbs', color: MacroColors.carbs, goal: settings.carbsGoal },
        { key: 'fats', color: MacroColors.fats, goal: settings.fatsGoal },
      ];

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text, textAlign: 'left' }]}>{t('progress')}</Text>
          <Text style={[styles.subtitle, { color: colors.placeholder, textAlign: 'left' }]}>{t('trackJourney')}</Text>
        </View>

        {/* Streak Card */}
        <TouchableOpacity
          style={[styles.streakCard, { backgroundColor: colors.surface }]}
          onPress={() => router.push('/modal/streak')}
          activeOpacity={0.7}
        >
          <View style={[styles.streakCardContent, isRTL && styles.streakCardContentRTL]}>
            <View style={styles.streakFlameContainer}>
              <View style={styles.streakFlameGlow} />
              <Flame size={32} color="#FF6B35" fill="#FF6B35" />
            </View>

            <View style={styles.streakInfo}>
              <Text style={[styles.streakNumber, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                {progressData.currentStreak}
              </Text>
              <Text style={[styles.streakLabel, isRTL && styles.rtlText, { color: colors.placeholder, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('dayStreak')}
              </Text>
            </View>

            <ChevronRight
              size={24}
              color={colors.placeholder}
              style={isRTL && { transform: [{ rotate: '180deg' }] }}
            />
          </View>
        </TouchableOpacity>

        {/* Stats Cards */}
        <View style={[styles.statsContainer, isRTL && styles.statsContainerRTL]}>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.statIcon, { backgroundColor: colors.border }]}>
              <TrendingUp size={24} color={colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{progressData.longestStreak}</Text>
            <Text style={[styles.statLabel, isRTL && styles.rtlText, { color: colors.placeholder }]}>{t('longestStreak')}</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.statIcon, { backgroundColor: colors.border }]}>
              <Calendar size={24} color={colors.info} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{progressData.totalDaysLogged ?? 0}</Text>
            <Text style={[styles.statLabel, isRTL && styles.rtlText, { color: colors.placeholder }]}>{t('daysLogged')}</Text>
          </View>
        </View>

        
       {/* Weekly Calories Chart */}
<View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
    <Text style={[styles.chartTitle, isRTL && styles.rtlText, { color: colors.text }]}>
      {t('weeklyCalories')}
    </Text>
    {/* Removed ChevronRight (arrow icon) */}
  </View>

  <View style={styles.chart}>
    <View style={[styles.chartBars, isRTL && styles.chartBarsRTL]}>
      {(isRTL ? [...weeklyData].reverse() : weeklyData).map((day, i) => (
        <View key={day.date || i} style={styles.barContainer}>
          <Text style={[styles.barValue, { color: colors.text }]}>
            {Math.round(day.calories || 0)}
          </Text>

          <Animated.View
            style={[
              styles.bar,
              {
                height: isRTL ? animatedHeights[weeklyData.length - 1 - i]?.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }) || '0%'
                : animatedHeights[i]?.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }) || '0%',
                backgroundColor: getBarColor(
                  day.calories || 0,
                  settings.calorieGoal,
                  settings.goalType || 'maintain'
                ),
              },
            ]}
          />

          <Text style={[styles.barLabel, { color: colors.placeholder }]}>
            {formatDate(day.date || new Date().toISOString())}
          </Text>
        </View>
      ))}
    </View>
  </View>
</View>


        {/* Weekly Macros */}
        <View style={[styles.macrosCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.chartTitle, isRTL && styles.rtlText, { color: colors.text, textAlign: isRTL ? 'left' : 'left' }]}>{t('weeklyMacrosAverage')}</Text>

          <View style={[styles.macrosList, isRTL && styles.macrosListRTL]}>
            {macros.map((macro) => {
  const average = getWeeklyAverage(macro.key as any);
  const percentage = Math.min((average / macro.goal) * 100, 100);

  return (
    <View
      key={macro.key}
      style={[styles.macroItem, isRTL && styles.macroItemRTL]}
    >
      <View
        style={[styles.macroColor, { backgroundColor: macro.color }]}
      />

      <View style={styles.macroInfo}>
        <Text
          style={[styles.macroName, isRTL && styles.rtlText, { color: colors.text }]}
        >
          {t(macro.key as any)}
        </Text>

        <Text
          style={[
            styles.macroValue,
            isRTL && styles.rtlText,
            { color: colors.placeholder },
          ]}
        >
          {average}
          {t('g')} / {macro.goal}
          {t('g')}
        </Text>
      </View>

      <View style={[styles.macroBar, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.macroBarFill,
            { width: `${percentage}%`, backgroundColor: macro.color },
            isRTL && styles.macroBarFillRTL,
          ]}
        />
      </View>
    </View>
  );
})}

          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 28, fontWeight: 'bold' },
  subtitle: { fontSize: 16, marginTop: 4 },
  statsContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20, gap: 12 },
  statCard: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center' },
  statIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statValue: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  statLabel: { fontSize: 12, textAlign: 'center', fontWeight: '500' },
  chartCard: { marginHorizontal: 20, marginBottom: 20, borderRadius: 16, padding: 20 },
  chartTitle: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  chartSubtitle: { fontSize: 14, marginBottom: 20 },
  chart: { height: 150, position: 'relative', marginTop: 6 },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', height: 160, paddingBottom: 20 },
  chartBarsRTL: { flexDirection: 'row-reverse' },
  barContainer: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  bar: { width: 20, borderRadius: 4, minHeight: 8 },
  barLabel: { fontSize: 12, marginTop: 8, fontWeight: '500' },
  barValue: { fontSize: 12, fontWeight: '600', marginBottom: 4, textAlign: 'center' },
  macrosCard: { marginHorizontal: 20, marginBottom: 20, borderRadius: 16, padding: 20 },
  macrosList: { gap: 16 },
  macroItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  macroColor: { width: 12, height: 12, borderRadius: 6 },
  macroInfo: { flex: 1 },
  macroName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  macroValue: { fontSize: 14 },
  macroBar: { width: 80, height: 6, borderRadius: 3 },
  macroBarFill: { height: '100%', borderRadius: 3 },
  rtlText: {
    textAlign: 'right',
  },
  macrosListRTL: {
    direction: 'ltr',
  },
  macroItemRTL: {
    flexDirection: 'row',
  },
  macroBarFillRTL: {
    transform: [{ scaleX: -1 }],
  },
  statsContainerRTL: {
    flexDirection: 'row',
  },
  streakCard: { marginHorizontal: 20, marginBottom: 20, borderRadius: 20, padding: 20 },
  streakCardContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  streakCardContentRTL: {
    flexDirection: 'row',
  },
  streakFlameContainer: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  streakFlameGlow: { position: 'absolute', width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255, 107, 53, 0.2)' },
  streakInfo: { flex: 1 },
  streakNumber: { fontSize: 28, fontWeight: '700', marginBottom: 2 },
  streakLabel: { fontSize: 14, fontWeight: '500' },
  streakStats: { alignItems: 'center', marginRight: 8 },
  streakMaxLabel: { fontSize: 12, marginBottom: 2 },
  streakMaxValue: { fontSize: 20, fontWeight: '700' },
});
