// Allows users to view and adjust their calorie and macro goals — automatically recalculates protein, carbs, and fats based on calorie input.
import Colors from '@/constants/colors';
import { useLanguage } from '@/hooks/language-context';
import { useNutrition } from '@/hooks/nutrition-store';
import { backendUpdateDailyGoal } from '@/services/backend-auth';
import { getFoodLogsHome } from '@/services/food-api';
import Slider from '@react-native-community/slider';
import { Save, Target, Info } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Linking } from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";

type UserSettings = any;

export default function GoalsScreen() {
  const { settings, saveSettings } = useNutrition();
  const { t, isRTL } = useLanguage();
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [macroRatio, setMacroRatio] = useState({
    proteinPercent: 30,
    carbsPercent: 40,
    fatPercent: 30,
  });
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const data = await getFoodLogsHome(today);
        if (data.goals.macroRatio) {
          setMacroRatio({
            proteinPercent: data.goals.macroRatio.proteinPercent,
            carbsPercent: data.goals.macroRatio.carbsPercent,
            fatPercent: data.goals.macroRatio.fatPercent,
          });
        }
      } catch (error) {
        console.error('Error fetching initial goals:', error);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!hasChanges) {
      setLocalSettings(settings);
    }
  }, [settings, hasChanges]);

  const calculateMacroGoals = (calories: number, ratio = macroRatio) => {
    const proteinCalories = calories * (ratio.proteinPercent / 100);
    const carbsCalories = calories * (ratio.carbsPercent / 100);
    const fatsCalories = calories * (ratio.fatPercent / 100);

    return {
      protein: Math.round(proteinCalories / 4),
      carbs: Math.round(carbsCalories / 4),
      fats: Math.round(fatsCalories / 9),
    };
  };

  const handleCalorieGoalChange = (value: string) => {
    if (value.length > 10) return;
    
    if (value === '') {
      setLocalSettings((prev: UserSettings) => ({
        ...prev,
        calorieGoal: 0,
        proteinGoal: 0,
        carbsGoal: 0,
        fatsGoal: 0,
      }));
      setHasChanges(true);
      return;
    }
    
    const calories = parseInt(value);
    if (!isNaN(calories)) {
      const macros = calculateMacroGoals(calories);
      
      setLocalSettings((prev: UserSettings) => ({
        ...prev,
        calorieGoal: calories,
        proteinGoal: macros.protein,
        carbsGoal: macros.carbs,
        fatsGoal: macros.fats,
      }));
      setHasChanges(true);
    }
  };

  const handleMacroChange = (key: keyof typeof macroRatio, newValue: number) => {
    const otherKeys = (['proteinPercent', 'carbsPercent', 'fatPercent'] as const).filter(k => k !== key);
    const oldValue = macroRatio[key];
    const delta = newValue - oldValue;
    
    let newRatio = { ...macroRatio, [key]: newValue };
    const sumOthers = otherKeys.reduce((sum, k) => sum + macroRatio[k], 0);

    if (delta > 0) {
      let remainingToSubtract = delta;
      if (sumOthers > 0) {
        otherKeys.forEach(k => {
          const toSubtract = Math.min(macroRatio[k], Math.floor(delta * (macroRatio[k] / sumOthers)));
          newRatio[k] -= toSubtract;
          remainingToSubtract -= toSubtract;
        });
      }
      while (remainingToSubtract > 0) {
        const reducibleKeys = otherKeys.filter(k => newRatio[k] > 0);
        if (reducibleKeys.length === 0) break;
        reducibleKeys.forEach(k => {
          if (remainingToSubtract > 0) {
            newRatio[k]--;
            remainingToSubtract--;
          }
        });
      }
    } else {
      let remainingToAdd = -delta;
      if (sumOthers > 0) {
        otherKeys.forEach(k => {
          const toAdd = Math.floor((-delta) * (macroRatio[k] / sumOthers));
          newRatio[k] += toAdd;
          remainingToAdd -= toAdd;
        });
      } else {
        const share = Math.floor(remainingToAdd / otherKeys.length);
        otherKeys.forEach(k => {
          newRatio[k] += share;
          remainingToAdd -= share;
        });
      }
      while (remainingToAdd > 0) {
        otherKeys.forEach(k => {
          if (remainingToAdd > 0) {
            newRatio[k]++;
            remainingToAdd--;
          }
        });
      }
    }

    const total = newRatio.proteinPercent + newRatio.carbsPercent + newRatio.fatPercent;
    if (total !== 100) {
       newRatio[otherKeys[0]] += (100 - total);
    }

    setMacroRatio(newRatio);
    setHasChanges(true);

    if (localSettings.calorieGoal > 0) {
      const macros = calculateMacroGoals(localSettings.calorieGoal, newRatio);
      setLocalSettings((prev: any) => ({
        ...prev,
        proteinGoal: macros.protein,
        carbsGoal: macros.carbs,
        fatsGoal: macros.fats,
      }));
    }
  };

  const handleSave = async () => {
    const calories = Number(localSettings.calorieGoal || 0);
    if (!Number.isFinite(calories) || calories <= 0) {
      Alert.alert(t('error') as string, t('enterCalorieGoal') as string);
      return;
    }

    try {
      setIsSaving(true);

      const response = await backendUpdateDailyGoal({ 
        calories,
        macroRatio 
      });
      const nextSettings = {
        ...localSettings,
        calorieGoal: Number(response.dailyGoal.calories || calories),
        proteinGoal: Number(response.dailyGoal.protein || 0),
        carbsGoal: Number(response.dailyGoal.carbs || 0),
        fatsGoal: Number(response.dailyGoal.fat || 0),
      };

      await saveSettings(nextSettings);
      setLocalSettings(nextSettings);
      setHasChanges(false);
      Alert.alert(
        t('success') as string,
        response.message || (t('dailyGoalUpdated') as string),
      );
    } catch (error: any) {
      Alert.alert(
        t('error') as string,
        error?.message ? String(error.message) : (t('failedToUpdateGoals') as string),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 15 }}>
        {/* Daily Goals Section */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, isRTL && styles.rtlRow]}>
            <Target size={20} color={Colors.primary} />
            <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>{t('dailyGoals')}</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>{t('calorieGoal')}</Text>
            <TextInput
              style={[styles.input, isRTL && styles.rtlInput]}
              value={localSettings.calorieGoal === 0 ? '' : localSettings.calorieGoal.toString()}
              onChangeText={handleCalorieGoalChange}
              keyboardType="numeric"
              placeholder={t('enterCalorieGoal') as any}
              placeholderTextColor={Colors.placeholder}
            />
            <Text style={[styles.inputHint, isRTL && styles.rtlText]}>
              {t('macroGoalsCalculated')}
            </Text>
          </View>

          <View style={styles.macroGoals}>
            <View style={styles.macroGoal}>
              <Text style={[styles.macroLabel, isRTL && styles.rtlText]}>{t('protein')}</Text>
              <Text style={styles.macroValue}>{localSettings.proteinGoal}{t('g')}</Text>
            </View>
            <View style={styles.macroGoal}>
              <Text style={[styles.macroLabel, isRTL && styles.rtlText]}>{t('carbs')}</Text>
              <Text style={styles.macroValue}>{localSettings.carbsGoal}{t('g')}</Text>
            </View>
            <View style={styles.macroGoal}>
              <Text style={[styles.macroLabel, isRTL && styles.rtlText]}>{t('fats')}</Text>
              <Text style={styles.macroValue}>{localSettings.fatsGoal}{t('g')}</Text>
            </View>
          </View>
        </View>

        {/* Macro Distribution Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>{t('macroDistribution')}</Text>
          <Text style={[styles.infoText, isRTL && styles.rtlText]}>
            {t('macroDistributionDesc')}
          </Text>
          <View style={styles.sliderGroup}>
            <View style={styles.sliderHeader}>
              <Text style={[styles.sliderLabel, isRTL && styles.rtlText]}>
                {t('protein')}: {macroRatio.proteinPercent}%
              </Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={100}
              step={1}
              value={macroRatio.proteinPercent}
              onValueChange={(val) => handleMacroChange('proteinPercent', val)}
              minimumTrackTintColor={Colors.primary}
              maximumTrackTintColor={Colors.border}
              thumbTintColor={Colors.primary}
            />
          </View>

          <View style={styles.sliderGroup}>
            <View style={styles.sliderHeader}>
              <Text style={[styles.sliderLabel, isRTL && styles.rtlText]}>
                {t('carbs')}: {macroRatio.carbsPercent}%
              </Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={100}
              step={1}
              value={macroRatio.carbsPercent}
              onValueChange={(val) => handleMacroChange('carbsPercent', val)}
              minimumTrackTintColor={Colors.primary}
              maximumTrackTintColor={Colors.border}
              thumbTintColor={Colors.primary}
            />
          </View>

          <View style={styles.sliderGroup}>
            <View style={styles.sliderHeader}>
              <Text style={[styles.sliderLabel, isRTL && styles.rtlText]}>
                {t('fats')}: {macroRatio.fatPercent}%
              </Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={100}
              step={1}
              value={macroRatio.fatPercent}
              onValueChange={(val) => handleMacroChange('fatPercent', val)}
              minimumTrackTintColor={Colors.primary}
              maximumTrackTintColor={Colors.border}
              thumbTintColor={Colors.primary}
            />
          </View>

          <View style={styles.totalIndicator}>
            <Text style={[styles.totalText, isRTL && styles.rtlText]}>
              {t('total')}: {macroRatio.proteinPercent + macroRatio.carbsPercent + macroRatio.fatPercent}%
            </Text>
          </View>

          <Text style={[styles.citationText, isRTL && styles.rtlText]}>
            {t('macroDistributionScientificBasis')}
          </Text>
        </View>

        {/* Save Button */}
        {hasChanges && (
          <View style={styles.saveContainer}>
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={Colors.background} />
              ) : (
                <Save size={20} color={Colors.background} />
              )}
              <Text style={styles.saveButtonText}>{t('saveChanges')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  section: {
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  inputHint: {
    fontSize: 14,
    color: Colors.placeholder,
    marginTop: 4,
  },
  macroGoals: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.border,
    borderRadius: 12,
    padding: 16,
  },
  macroGoal: {
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: 14,
    color: Colors.placeholder,
    marginBottom: 4,
    fontWeight: '500',
  },
  macroValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  infoText: {
    fontSize: 14,
    color: Colors.placeholder,
    marginBottom: 12,
    lineHeight: 20,
  },
  distributionList: {
    marginTop: 8,
  },
  distributionItem: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  saveContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  // RTL Styles
  rtlText: {
    textAlign: 'left',
  },
  rtlRow: {
    flexDirection: 'row',
  },
  rtlInput: {
    textAlign: 'right',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    flex: 0,
  },
  citationsFullText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
  citationText: {
    fontSize: 12,
    color: Colors.placeholder,
    marginTop: 12,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  sliderGroup: {
    marginBottom: 16,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  totalIndicator: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'flex-end',
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
});
