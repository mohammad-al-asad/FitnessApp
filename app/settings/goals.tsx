// Allows users to view and adjust their calorie and macro goals — automatically recalculates protein, carbs, and fats based on calorie input.
import Colors from '@/constants/colors';
import { useLanguage } from '@/hooks/language-context';
import { useNutrition } from '@/hooks/nutrition-store';
import { Save, Target } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";

type UserSettings = any;

export default function GoalsScreen() {
  const { settings, saveSettings } = useNutrition();
  const { t, isRTL } = useLanguage();
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);
const insets = useSafeAreaInsets();

  const calculateMacroGoals = (calories: number) => {
    // Standard macro distribution: 30% protein, 40% carbs, 30% fats
    const proteinCalories = calories * 0.3;
    const carbsCalories = calories * 0.4;
    const fatsCalories = calories * 0.3;

    return {
      protein: Math.round(proteinCalories / 4), // 4 calories per gram
      carbs: Math.round(carbsCalories / 4), // 4 calories per gram
      fats: Math.round(fatsCalories / 9), // 9 calories per gram
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

  const handleSave = async () => {
    try {
      await saveSettings(localSettings);
      setHasChanges(false);
    } catch {
      // Handle error silently
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top - 15 }]}>

      <ScrollView showsVerticalScrollIndicator={false}>
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
              placeholder={t('enterCalorieGoal')}
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
          <View style={styles.distributionList}>
            <Text style={[styles.distributionItem, isRTL && styles.rtlText]}>{t('proteinPercent')}</Text>
            <Text style={[styles.distributionItem, isRTL && styles.rtlText]}>{t('carbsPercent')}</Text>
            <Text style={[styles.distributionItem, isRTL && styles.rtlText]}>{t('fatsPercent')}</Text>
          </View>
        </View>

        {/* Save Button */}
        {hasChanges && (
          <View style={styles.saveContainer}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
            >
              <Save size={20} color={Colors.background} />
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
    marginBottom: 16,
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
});
