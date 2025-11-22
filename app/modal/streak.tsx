// Streak Screen — displays the user's daily logging streak with animations, weekly activity visualization, and progress toward milestone goals.

import { useLanguage, useSafeColors } from '@/hooks/language-context';

import { useNutrition } from '@/hooks/nutrition-store';
import { Stack, router } from 'expo-router';
import { ChevronLeft, Flame, Info } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


export default function StreakScreen() {
  const { t, isRTL } = useLanguage();
const colors = useSafeColors();

  const { getProgressData, dailyLogs } = useNutrition();
  const progressData = getProgressData();
  const insets = useSafeAreaInsets();
  
  const flameScale = useRef(new Animated.Value(0)).current;
  const flameOpacity = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(flameScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(flameOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1.2,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [flameScale, flameOpacity, glowPulse]);

  const getStreakStartDate = () => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - progressData.currentStreak + 1);
    return startDate.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getThisWeekDays = () => {
    const days = [];
    const today = new Date();
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    const diff = isRTL ? dayOfWeek : dayOfWeek;
    startOfWeek.setDate(today.getDate() - diff);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const hasLog = dailyLogs[dateStr] && dailyLogs[dateStr].foods.length > 0;
      days.push({ date: dateStr, hasLog, dayIndex: date.getDay() });
    }

    return isRTL ? days.reverse() : days;
  };

  const weekDays = getThisWeekDays();
  const dayLabels = isRTL 
    ? ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    : ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const nextMilestone = Math.ceil((progressData.currentStreak + 1) / 7) * 7;
  const daysToMilestone = nextMilestone - progressData.currentStreak;
  const milestoneProgress = ((progressData.currentStreak % 7) / 7) * 100;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{
          headerShown: false,
        }} 
      />
      
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={[styles.backButton, isRTL && styles.backButtonRTL]}
        >
          <ChevronLeft size={24} color={colors.text} style={isRTL && { transform: [{ rotate: '180deg' }] }} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('dayStreak').toUpperCase()}
        </Text>
        
        <TouchableOpacity style={[styles.infoButton, isRTL && styles.infoButtonRTL]}>
          <Info size={24} color={colors.placeholder} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.flameContainer}>
  <Animated.View
    style={{
      opacity: flameOpacity,
      transform: [{ scale: flameScale }],
    }}
  >
    <View
      style={{
        backgroundColor: '#4A3A28',
        borderRadius: 50,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Flame size={64} color="#FF6B35" fill="#FF6B35" />
    </View>
  </Animated.View>
</View>


        <Text style={[styles.streakNumber, { color: colors.text }]}>
          {progressData.currentStreak}
        </Text>
        <Text style={[styles.streakLabel, { color: colors.text }]}>
          {t('dayStreak').toUpperCase()}
        </Text>

        <View style={[styles.statsRow, isRTL && styles.statsRowRTL]}>
          <View style={styles.statItem}>
            <Text style={[styles.statDate, { color: colors.text }]}>
              {getStreakStartDate()}
            </Text>
            <Text style={[styles.statLabel, { color: colors.placeholder }]}>
              {isRTL ? 'بداية السلسلة' : 'Streak started'}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.statItem}>
            <View style={styles.statWithIcon}>
              <Text style={[styles.statDate, { color: colors.text }]}>
                {progressData.longestStreak}
              </Text>
              <Info size={16} color={colors.placeholder} />
            </View>
            <Text style={[styles.statLabel, { color: colors.placeholder }]}>
              {isRTL ? 'أقصى سلسلة' : 'Max streak'}
            </Text>
          </View>
        </View>

        <View style={[styles.weekCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.weekTitle, { color: colors.text }]}>
            {isRTL ? 'هذا الأسبوع' : 'THIS WEEK'}
          </Text>
          
          <View style={[styles.weekDays, isRTL && styles.weekDaysRTL]}>
            {weekDays.map((day, index) => {
              const actualDayIndex = isRTL ? (6 - index) : day.dayIndex;
              return (
                <View key={day.date} style={styles.dayColumn}>
                  <Text style={[styles.dayLabel, { color: colors.placeholder }]}>
                    {dayLabels[actualDayIndex]}
                  </Text>
                  <View style={[
                    styles.dayCircle,
                    { 
                      backgroundColor: day.hasLog ? 'transparent' : colors.border,
                      borderColor: colors.border,
                    }
                  ]}>
                    {day.hasLog && (
                      <View style={styles.flameIcon}>
                        <View style={styles.miniFlame} />
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={[styles.milestoneCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.milestoneRow, isRTL && styles.milestoneRowRTL]}>
            <View style={styles.milestoneCircle}>
              <View style={[styles.milestoneFlame, { opacity: 0.5 }]}>
                <View style={styles.miniFlame} />
              </View>
              <Text style={[styles.milestoneNumber, { color: colors.text }]}>
                {progressData.currentStreak}
              </Text>
            </View>

            <View style={styles.milestoneProgress}>
              <Text style={[styles.milestoneText, { color: colors.text }]}>
                {isRTL 
                  ? `${daysToMilestone} أيام أخرى`
                  : `${daysToMilestone} more days`
                }
              </Text>
              <Text style={[styles.milestoneSubtext, { color: colors.placeholder }]}>
                {isRTL 
                  ? 'لفتح المرحلة التالية.'
                  : 'to unlock your next milestone.'}
              </Text>
              
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View 
                  style={[
                    styles.progressFill,
                    { 
                      width: `${milestoneProgress}%`,
                      backgroundColor: '#FF6B35',
                    },
                    isRTL && styles.progressFillRTL
                  ]} 
                />
              </View>
            </View>

            <View style={styles.milestoneCircle}>
              <View style={styles.milestoneFlame}>
                <View style={styles.miniFlame} />
              </View>
              <Text style={[styles.milestoneNumber, { color: colors.text }]}>
                {nextMilestone}
              </Text>
            </View>
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonRTL: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  infoButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoButtonRTL: {
    alignItems: 'flex-start',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  flameContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 280,
    marginTop: 20,
  },
  glowOuter: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
  },
  glowInner: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 107, 53, 0.25)',
    top: 40,
    left: 40,
  },
  flameWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  flame: {
    width: 140,
    height: 180,
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  flameOuter: {
    position: 'absolute',
    bottom: 0,
    width: 140,
    height: 180,
    backgroundColor: '#FF6B35',
    borderTopLeftRadius: 70,
    borderTopRightRadius: 70,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  flameMiddle: {
    position: 'absolute',
    bottom: 10,
    width: 100,
    height: 140,
    backgroundColor: '#FF8C42',
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  flameInner: {
    position: 'absolute',
    bottom: 20,
    width: 60,
    height: 100,
    backgroundColor: '#FFB84D',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  streakNumber: {
    fontSize: 72,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 20,
  },
  streakLabel: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 40,
    marginBottom: 32,
  },
  statsRowRTL: {
    flexDirection: 'row-reverse',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statDate: {
    fontSize: 16,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 13,
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: 40,
    marginHorizontal: 20,
  },
  weekCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
  },
  weekTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 24,
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekDaysRTL: {
    flexDirection: 'row-reverse',
  },
  dayColumn: {
    alignItems: 'center',
    gap: 12,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flameIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniFlame: {
    width: 16,
    height: 20,
    backgroundColor: '#FF6B35',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  milestoneCard: {
    borderRadius: 20,
    padding: 24,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  milestoneRowRTL: {
    flexDirection: 'row-reverse',
  },
  milestoneCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  milestoneFlame: {
    position: 'absolute',
    top: -8,
  },
  milestoneNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  milestoneProgress: {
    flex: 1,
  },
  milestoneText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  milestoneSubtext: {
    fontSize: 13,
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressFillRTL: {
    alignSelf: 'flex-end',
  },
});


