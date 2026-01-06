// Displays the main Home screen — showing daily calories, macros, weekly summary, streaks, and insights
// with a horizontal day selector at the top and a floating FitBot assistant at the bottom.

import FloatingFitBot from '@/components/FloatingFitBot';
import MacroCircle, { CalorieCircle } from '@/components/MacroCircle';
import { MacroColors } from '@/constants/colors';
import { useLanguage, useSafeColors } from '@/hooks/language-context';
import { useNutrition } from '@/hooks/nutrition-store';
import { useRouter } from 'expo-router';
import { Award, Flame, Target, TrendingUp, Zap } from 'lucide-react-native';
import React, { useEffect, useMemo } from 'react';

import { responsiveWidth } from '@/utilities/ScalingUtils';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
export default function HomeScreen() {

useEffect(() => {
  AsyncStorage.setItem("fitco_language", "ar");
}, []);



  // --- Small inline component ---
  const StreakBadge = ({ count }: { count: number }) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4A3A28',
        borderRadius: 24,
        paddingHorizontal: 14,
        paddingVertical: 8,
        gap: 6,
        marginLeft: 20,
      }}
    >
      <Flame size={20} color="#FF6B35" fill="#FF6B35" />
      <Text style={{ color: '#FFA500', fontWeight: '700', fontSize: 16 }}>{count}</Text>
    </View>
  );

  // --- Hooks / contexts ---
  const { settings, getTodayLog, getProgressData, getLogByDate } = useNutrition();
  const { t, isRTL } = useLanguage();
  const colors = useSafeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
const [selectedDay, setSelectedDay] = React.useState(new Date().toISOString().split("T")[0]);

  if (!t) return null;

  // --- Safe guards / fallbacks to kill NaNs and undefineds ---
  const safeSettings = {
    calorieGoal: settings?.calorieGoal ?? 0,
    proteinGoal: settings?.proteinGoal ?? 0,
    carbsGoal: settings?.carbsGoal ?? 0,
    fatsGoal: settings?.fatsGoal ?? 0,
  };

  const rawTodayLog = getLogByDate
  ? getLogByDate(selectedDay)
  : getTodayLog
  ? getTodayLog()
  : null;

const todayLog = {
  totalCalories: rawTodayLog?.totalCalories ?? 0,
  totalProtein: rawTodayLog?.totalProtein ?? 0,
  totalCarbs: rawTodayLog?.totalCarbs ?? 0,
  totalFats: rawTodayLog?.totalFats ?? 0,
};


  const pd = getProgressData ? getProgressData() : null;
  const progressData = {
    currentStreak: pd?.currentStreak ?? 0,
    longestStreak: pd?.longestStreak ?? 0,
    totalDaysLogged: pd?.totalDaysLogged ?? 0,
    weeklyData: Array.isArray(pd?.weeklyData) ? pd!.weeklyData : [],
  };

  // --- Derived values (safe) ---
  const weeklyAverage = useMemo(() => {
    if (!progressData.weeklyData.length) return 0;
    const total = progressData.weeklyData.reduce(
      (s: number, d: any) => s + (d?.calories ?? 0),
      0
    );
    return Math.round(total / 7);
  }, [progressData.weeklyData]);

  const goalsHitThisWeek = useMemo(() => {
    if (!progressData.weeklyData.length || !safeSettings.calorieGoal) return 0;
    // Consider "hit" if within ±10% of goal
    const low = safeSettings.calorieGoal * 0.9;
    const high = safeSettings.calorieGoal * 1.1;
    return progressData.weeklyData.filter((d: any) => {
      const c = d?.calories ?? 0;
      return c >= low && c <= high;
    }).length;
  }, [progressData.weeklyData, safeSettings.calorieGoal]);

  const bestDayThisWeek = useMemo(() => {
    if (!progressData.weeklyData.length) return 'today';
    let best = progressData.weeklyData[0];
    for (const d of progressData.weeklyData) {
      if ((d?.calories ?? 0) > (best?.calories ?? 0)) best = d;
    }
    // You can localize this if you want; keeping simple.
    return 'today';
  }, [progressData.weeklyData]);

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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>{t('waitingForData')}</Text>
      </View>
    );
  }

  const caloriesRemaining = Math.max(
    0,
    (safeSettings.calorieGoal ?? 0) - (todayLog.totalCalories ?? 0)
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
      <View
        style={[
        styles.header,
        isRTL ? { paddingLeft: 20 } : { paddingLeft: 20 },
        ]}
        >
          <View style={isRTL ? styles.rtlAlign : undefined}>
            <Text style={[styles.greeting, isRTL && styles.rtlText, { color: colors.text }]}>
            {t('heyThere')}
            </Text>
            <Text style={[styles.subtitle, isRTL && styles.rtlText, { color: colors.placeholder }]}>
            {t('readyToLog')}
            </Text>
          </View>

          <TouchableOpacity onPress={() => router.push('/modal/streak')} activeOpacity={0.7}>
            <StreakBadge count={progressData.currentStreak} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 10 }} />

        <View style={[styles.caloriesCard, { backgroundColor: colors.surface }]}>
          <Text
            style={[
              styles.caloriesTitle,
              { color: colors.text, textAlign: 'center' },
            ]}
          >
            {t('dailyCalories')}
          </Text>

          <View style={styles.caloriesProgress}>
            <CalorieCircle current={todayLog.totalCalories} goal={safeSettings.calorieGoal} size={170} />

            <View style={[styles.macrosGrid]}>
             <MacroCircle
  label={String(t('protein'))}
  current={todayLog.totalProtein}
  goal={safeSettings.proteinGoal}
  color={MacroColors.protein}
  size={responsiveWidth(27)}
/>
<MacroCircle
  label={String(t('carbs'))}
  current={todayLog.totalCarbs}
  goal={safeSettings.carbsGoal}
  color={MacroColors.carbs}
  size={responsiveWidth(27)}
/>
<MacroCircle
  label={String(t('fats'))}
  current={todayLog.totalFats}
  goal={safeSettings.fatsGoal}
  color={MacroColors.fats}
  size={responsiveWidth(27)}
/>

            </View>
          </View>
        </View>

        <View style={[styles.weeklySummaryCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'left' : 'left' }]}>
            {t('weeklySummary')}
          </Text>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: colors.primary + '20' }]}>
                <TrendingUp size={20} color={colors.primary} />
              </View>
              <Text
                style={[styles.summaryLabel, isRTL && styles.rtlText, { color: colors.placeholder }]}
              >
                {t('avgCalories')}
              </Text>
              <Text style={[styles.summaryValue, isRTL && styles.rtlText, { color: colors.text }]}>
                {weeklyAverage}
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: '#9B59B6' + '20' }]}>
                <Award size={20} color="#9B59B6" />
              </View>
              <Text
                style={[styles.summaryLabel, isRTL && styles.rtlText, { color: colors.placeholder }]}
              >
                {t('goalsHit')}
              </Text>
              <Text style={[styles.summaryValue, isRTL && styles.rtlText, { color: colors.text }]}>
                {goalsHitThisWeek}/7
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: '#1E90FF' + '20' }]}>
                <Target size={20} color="#1E90FF" />
              </View>
              <Text
                style={[styles.summaryLabel, isRTL && styles.rtlText, { color: colors.placeholder }]}
              >
                {t('bestDay')}
              </Text>
              <Text style={[styles.summaryValue, isRTL && styles.rtlText, { color: colors.text }]}>
                {t(bestDayThisWeek as any) || t('today')}
              </Text>
            </View>
          </View>

          <View style={[styles.weeklyProgress, { borderTopColor: colors.border }]}>
            <Text
              style={[styles.weeklyProgressTitle, isRTL && styles.rtlText, { color: colors.text }]}
            >
              {t('thisWeeksProgress')}
            </Text>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, (goalsHitThisWeek / 7) * 100)}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
            <Text
              style={[styles.progressText, isRTL && styles.rtlText, { color: colors.placeholder }]}
            >
              {goalsHitThisWeek} {t('outOfDaysCompleted')}
            </Text>
          </View>
        </View>

        <View style={[styles.insightsCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText, { color: colors.text }]}>
            {t('todaysInsights')}
          </Text>

          <View style={styles.insightsList}>
            <View className="insight" style={styles.insightItem}>
              <View style={[styles.insightIcon, { backgroundColor: '#E74C3C' + '20' }]}>
                <Zap size={20} color="#E74C3C" />
              </View>
              <View style={styles.insightContent}>
                <Text style={[styles.insightTitle, isRTL && styles.rtlText, { color: colors.text }]}>
                  {t('energyLevel')}
                </Text>
                <Text
                  style={[styles.insightValue, isRTL && styles.rtlText, { color: colors.placeholder }]}
                >
                  {percentOfGoal}% {t('ofDailyGoal')}
                </Text>
              </View>
            </View>

            <View className="insight" style={styles.insightItem}>
              <View style={[styles.insightIcon, { backgroundColor: '#1E90FF' + '20' }]}>
                <Target size={20} color="#1E90FF" />
              </View>
              <View style={styles.insightContent}>
                <Text style={[styles.insightTitle, isRTL && styles.rtlText, { color: colors.text }]}>
                  {t('proteinProgress')}
                </Text>
                <Text
                  style={[styles.insightValue, isRTL && styles.rtlText, { color: colors.placeholder }]}
                >
                  {Math.round(todayLog.totalProtein)}{t('g')} / {safeSettings.proteinGoal}{t('g')}
                </Text>
              </View>
            </View>

            <View className="insight" style={styles.insightItem}>
              <View style={[styles.insightIcon, { backgroundColor: '#FF6B35' + '20' }]}>
                <Flame size={20} color="#FF6B35" />
              </View>
              <View style={styles.insightContent}>
                <Text style={[styles.insightTitle, isRTL && styles.rtlText, { color: colors.text }]}>
                  {t('streakStatus')}
                </Text>
                <Text
                  style={[styles.insightValue, isRTL && styles.rtlText, { color: colors.placeholder }]}
                >
                  {progressData.currentStreak > 0
                    ? `${progressData.currentStreak} ${t('daysStrong')}`
                    : t('startYourStreak')}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 20,
    paddingVertical: 16,
  },
  greeting: { fontSize: 27, fontWeight: '700' },
  subtitle: { fontSize: 17, marginTop: 6 },

  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },

  streakText: { fontSize: 14, fontWeight: '600', marginLeft: 6 },

  caloriesCard: { marginHorizontal: 20, marginBottom: 20, borderRadius: 16, padding: 20 },
  caloriesTitle: { fontSize: 18, fontWeight: '600', marginBottom: 20, textAlign: 'center' },

  caloriesStats: { marginTop: 24, width: '100%', paddingHorizontal: 20 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  statLabel: { fontSize: 15, fontWeight: '500' },
  statValue: { fontSize: 15, fontWeight: '600' },
  statValueRemaining: { fontSize: 15, color: '#6B7280', fontWeight: '600' },

  caloriesProgress: { alignItems: 'center' },

  macrosCard: { marginHorizontal: 20, marginBottom: 20, borderRadius: 16, padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },

  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    marginTop: 30,
    gap: responsiveWidth(1),
  },

  weeklySummaryCard: { marginHorizontal: 20, marginBottom: 20, borderRadius: 16, padding: 20 },
  summaryGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  summaryLabel: { fontSize: 12, marginBottom: 4, textAlign: 'center' },
  summaryValue: { fontSize: 16, fontWeight: '600', textAlign: 'center' },

  weeklyProgress: { paddingTop: 16, borderTopWidth: 1 },
  weeklyProgressTitle: { fontSize: 14, fontWeight: '500', marginBottom: 12 },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 12, textAlign: 'center' },

  insightsCard: { marginHorizontal: 20, marginBottom: 20, borderRadius: 16, padding: 20 },
  insightsList: { gap: 16 },
  insightItem: { flexDirection: 'row', alignItems: 'center' },
  insightIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  insightContent: { flex: 1 },
  insightTitle: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  insightValue: { fontSize: 13 },

  rtlText: { textAlign: 'left',paddingRight: 10 },
  rtlRow: { flexDirection: 'row-reverse' },
  rtlAlign: { alignItems: 'flex-start' },

  caloriesStatsRTL: { flexDirection: 'column-reverse' },
  statRowRTL: { flexDirection: 'row-reverse' },
  statGroup: { marginBottom: 12 },
});
