// QuestionnaireScreen — multi-step onboarding flow for collecting user profile data (age, weight, goals, etc.) to personalize nutrition and fitness recommendations.

import WheelPicker from '@/components/WheelPicker';
import { auth } from '@/config/firebaseConfig';
import { useLanguage, useSafeColors } from '@/hooks/language-context';
import { getQuestionnaireSettings, useNutrition } from "@/hooks/nutrition-store";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Activity, Calendar, ChevronRight, Target, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface QuestionnaireData {
  age: number;
  height: number;
  weight: number;
  gender: 'male' | 'female';
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';
  goal: 'lose_weight' | 'maintain_weight' | 'gain_weight' | 'build_muscle';
  targetWeight?: number;
  medicalConditions: string;
  allergies: string;
}

export default function QuestionnaireScreen() {
  const { saveSettings } = useNutrition();

  // Clear any old global flag (legacy) so we always key by userId going forward
  useEffect(() => {
    AsyncStorage.removeItem('hasCompletedQuestionnaire').then(() => {
      console.log('🧼 Cleared questionnaire flag manually');
    });
  }, []);

  const { t, isRTL } = useLanguage();
  const colors = useSafeColors();
  const router = useRouter();

  const ACTIVITY_LEVELS = [
    { key: 'sedentary', label: t('sedentary'), description: t('sedentaryDesc') },
    { key: 'lightly_active', label: t('lightlyActive'), description: t('lightlyActiveDesc') },
    { key: 'moderately_active', label: t('moderatelyActive'), description: t('moderatelyActiveDesc') },
    { key: 'very_active', label: t('veryActive'), description: t('veryActiveDesc') },
    { key: 'extremely_active', label: t('extremelyActive'), description: t('extremelyActiveDesc') },
  ] as const;

  const GENDERS = [
    { key: 'male', label: t('male'), description: t('maleDesc') },
    { key: 'female', label: t('female'), description: t('femaleDesc') },
  ] as const;

  const GOALS = [
    { key: 'lose_weight', label: t('loseWeight'), description: t('loseWeightDesc') },
    { key: 'maintain_weight', label: t('maintainWeight'), description: t('maintainWeightDesc') },
    { key: 'gain_weight', label: t('gainWeight'), description: t('gainWeightDesc') },
    { key: 'build_muscle', label: t('buildMuscle'), description: t('buildMuscleDesc') },
  ] as const;

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [data, setData] = useState<QuestionnaireData>({
    age: 25,
    height: 170,
    weight: 70,
    gender: 'male',
    activityLevel: 'moderately_active',
    goal: 'maintain_weight',
    targetWeight: 70,
    medicalConditions: '',
    allergies: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 0:
        if (!data.age || data.age < 13 || data.age > 120) newErrors.age = 'Please select a valid age (13-120)';
        break;
      case 1:
        if (!data.height || data.height < 100 || data.height > 250) newErrors.height = 'Please select height in cm (100-250)';
        break;
      case 2:
        if (!data.weight || data.weight < 30 || data.weight > 300) newErrors.weight = 'Please select weight in kg (30-300)';
        break;
      case 6:
        if ((data.goal === 'lose_weight' || data.goal === 'gain_weight') &&
            (!data.targetWeight || data.targetWeight < 30 || data.targetWeight > 300)) {
          newErrors.targetWeight = 'Please select a valid target weight in kg (30-300)';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;

    if (currentStep === 5 && data.goal !== 'lose_weight' && data.goal !== 'gain_weight') {
      setCurrentStep(7);
      return;
    }
    const totalSteps = (data.goal === 'lose_weight' || data.goal === 'gain_weight') ? 9 : 8;
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  };

  const handleComplete = async () => {
    if (!validateStep(currentStep)) return;

    try {
      const userId = auth?.currentUser?.uid;
if (!userId) {
  console.warn("⚠️ No authenticated user found — skipping questionnaire save.");
  return;
}



      // mark completed (per-user)
      await AsyncStorage.setItem(`hasCompletedQuestionnaire_${userId}`, 'true');

      // compute goals
      const { weight, height, age, gender, activityLevel, goal } = data;

      let bmr =
        gender === 'male'
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

      if (goal === 'lose_weight') bmr -= 400;
      else if (goal === 'gain_weight' || goal === 'build_muscle') bmr += 400;

      const calorieGoal = Math.round(bmr);
      const proteinGoal = Math.round((calorieGoal * 0.3) / 4);
      const fatsGoal    = Math.round((calorieGoal * 0.25) / 9);
      const carbsGoal   = Math.round((calorieGoal * 0.45) / 4);

      const enrichedData = {
        ...data,
        calorieGoal,
        proteinGoal,
        carbsGoal,
        fatsGoal,
      };

      // save questionnaire + computed goals
 
 
// ✅ Save questionnaire data
await AsyncStorage.setItem(`questionnaireData_${userId}`, JSON.stringify(enrichedData));
console.log("💾 Saved questionnaire data for user:", userId);


// ✅ Mirror questionnaire into user profile (for Account page)
await AsyncStorage.setItem(`fitco_user_profile_${userId}`, JSON.stringify(enrichedData));
console.log("👤 Synced profile data:", enrichedData);



// ✅ Build settings right away and store in AsyncStorage (no hooks)
const questionnaireSettings = await getQuestionnaireSettings(userId);
if (questionnaireSettings) {
  await AsyncStorage.setItem(`fitco_settings_${userId}`, JSON.stringify(questionnaireSettings));
  await saveSettings(questionnaireSettings);
  console.log("🔥 Applied questionnaire settings:", questionnaireSettings);
}






      // optional: touch Firebase profile (safe try/catch)
      try {
        const { getAuth, updateProfile } = await import('firebase/auth');
        const fa = getAuth();
        if (fa.currentUser) {
          await updateProfile(fa.currentUser, {
            displayName: fa.currentUser.displayName || 'FitcoUser',
          });
        }
      } catch (err) {
        console.log('Firebase update skipped:', err);
      }
    } catch (err) {
      console.error('❌ Failed to save questionnaire data:', err);
    } finally {
      // give store a moment to read AsyncStorage, then go home
      setTimeout(() => {
        router.replace('/(tabs)/home');
      }, 500);
    }
  };

  const updateData = (field: keyof QuestionnaireData, value: string | number) => {
    setData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  // data for pickers
  const ageData = Array.from({ length: 108 }, (_, i) => i + 13);   // 13–120
  const heightData = Array.from({ length: 151 }, (_, i) => i + 100); // 100–250 cm
  const weightData = Array.from({ length: 271 }, (_, i) => i + 30);  // 30–300 kg

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <User size={32} color={colors.accent} />
              <Text style={[styles.stepTitle, { color: colors.text }]}>{t('whatsYourAge')}</Text>
              <Text style={[styles.stepDescription, { color: colors.text }]}>
                {t('helpsCalculateGoals')}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>{t('age')}</Text>
              <WheelPicker
                data={ageData}
                selectedValue={data.age}
                onValueChange={(value: number) => updateData('age', value)}
                testID="age-picker"
              />
              {errors.age && <Text style={[styles.errorText, { color: colors.error }]}>{errors.age}</Text>}
            </View>
          </View>
        );

      case 1:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <User size={32} color={colors.accent} />
              <Text style={[styles.stepTitle, { color: colors.text }]}>{t('whatsYourHeight')}</Text>
              <Text style={[styles.stepDescription, { color: colors.text }]}>
                {t('heightHelps')}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>{t('height')}</Text>
              <WheelPicker
                data={heightData}
                selectedValue={data.height}
                onValueChange={(value: number) => updateData('height', value)}
                suffix={isRTL ? 'سم' : ' cm'}
                testID="height-picker"
              />
              {errors.height && <Text style={[styles.errorText, { color: colors.error }]}>{errors.height}</Text>}
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <User size={32} color={colors.accent} />
              <Text style={[styles.stepTitle, { color: colors.text }]}>{t('currentWeight')}</Text>
              <Text style={[styles.stepDescription, { color: colors.text }]}>
                {t('helpsTrackProgress')}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>{t('currentWeightLabel')}</Text>
              <WheelPicker
                data={weightData}
                selectedValue={data.weight}
                onValueChange={(value: number) => updateData('weight', value)}
                suffix={isRTL ? 'كجم' : ' kg'}
                testID="weight-picker"
              />
              {errors.weight && <Text style={[styles.errorText, { color: colors.error }]}>{errors.weight}</Text>}
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <User size={32} color={colors.accent} />
              <Text style={[styles.stepTitle, { color: colors.text }]}>{t('whatsYourGender')}</Text>
              <Text style={[styles.stepDescription, { color: colors.text }]}>
                {t('helpsAccurateNeeds')}
              </Text>
            </View>

            <View style={styles.optionsContainer}>
              {GENDERS.map((gender) => (
                <TouchableOpacity
                  key={gender.key}
                  style={[
                    styles.optionCard,
                    { backgroundColor: colors.surface, borderColor: data.gender === gender.key ? colors.accent : 'transparent' }
                  ]}
                  onPress={() => updateData('gender', gender.key)}
                  testID={`gender-${gender.key}`}
                >
                  <Text style={[
                    styles.optionTitle,
                    { color: data.gender === gender.key ? colors.accent : colors.text }
                  ]}>
                    {gender.label}
                  </Text>
                  <Text style={[
                    styles.optionDescription,
                    { color: data.gender === gender.key ? colors.accent : colors.placeholder }
                  ]}>
                    {gender.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Activity size={32} color={colors.accent} />
              <Text style={[styles.stepTitle, { color: colors.text }]}>{t('howActiveAreYou')}</Text>
              <Text style={[styles.stepDescription, { color: colors.text }]}>
                {t('helpsDetermineCalories')}
              </Text>
            </View>

            <View style={styles.optionsContainer}>
              {ACTIVITY_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level.key}
                  style={[
                    styles.optionCard,
                    { backgroundColor: colors.surface, borderColor: data.activityLevel === level.key ? colors.accent : 'transparent' }
                  ]}
                  onPress={() => updateData('activityLevel', level.key)}
                  testID={`activity-${level.key}`}
                >
                  <Text style={[
                    styles.optionTitle,
                    { color: data.activityLevel === level.key ? colors.accent : colors.text }
                  ]}>
                    {level.label}
                  </Text>
                  <Text style={[
                    styles.optionDescription,
                    { color: data.activityLevel === level.key ? colors.accent : colors.placeholder }
                  ]}>
                    {level.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Target size={32} color={colors.accent} />
              <Text style={[styles.stepTitle, { color: colors.text }]}>{t('whatsYourGoal')}</Text>
              <Text style={[styles.stepDescription, { color: colors.text }]}>
                {t('chooseGoal')}
              </Text>
            </View>

            <View style={styles.optionsContainer}>
              {GOALS.map((goal) => (
                <TouchableOpacity
                  key={goal.key}
                  style={[
                    styles.optionCard,
                    { backgroundColor: colors.surface, borderColor: data.goal === goal.key ? colors.accent : 'transparent' }
                  ]}
                  onPress={() => updateData('goal', goal.key)}
                  testID={`goal-${goal.key}`}
                >
                  <Text style={[
                    styles.optionTitle,
                    { color: data.goal === goal.key ? colors.accent : colors.text }
                  ]}>
                    {goal.label}
                  </Text>
                  <Text style={[
                    styles.optionDescription,
                    { color: data.goal === goal.key ? colors.accent : colors.placeholder }
                  ]}>
                    {goal.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 6:
        if (data.goal === 'lose_weight' || data.goal === 'gain_weight') {
          return (
            <View style={styles.stepContainer}>
              <View style={styles.stepHeader}>
                <Target size={32} color={colors.accent} />
                <Text style={[styles.stepTitle, { color: colors.text }]}>Target weight?</Text>
                <Text style={[styles.stepDescription, { color: colors.text }]}>
                  What weight would you like to reach? Remember, gradual changes are more sustainable
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>{t('targetWeight')}</Text>
                <WheelPicker
                  data={weightData}
                  selectedValue={data.targetWeight || 70}
                  onValueChange={(value: number) => updateData('targetWeight', value)}
                  suffix=" kg"
                  testID="target-weight-picker"
                />
                {errors.targetWeight && <Text style={[styles.errorText, { color: colors.error }]}>{errors.targetWeight}</Text>}
              </View>
            </View>
          );
        }
        // if not losing/gaining weight, skip the step in the flow
        setCurrentStep(7);
        return null;

      case 7:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Calendar size={32} color={colors.accent} />
              <Text style={[styles.stepTitle, { color: colors.text }]}>{t('anyMedicalConditions')}</Text>
              <Text style={[styles.stepDescription, { color: colors.text }]}>
                {t('helpsBetterRecs')}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>{t('medicalConditions')}</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
                <TextInput
                  style={[styles.input, styles.textArea, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder={t('medicalConditionsPlaceholder') as string}
                  placeholderTextColor={colors.placeholder}
                  value={data.medicalConditions}
                  onChangeText={(value) => updateData('medicalConditions', value)}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  testID="medical-conditions-input"
                />
              </View>
            </View>
          </View>
        );

      case 8:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Calendar size={32} color={colors.accent} />
              <Text style={[styles.stepTitle, { color: colors.text }]}>Any food allergies?</Text>
              <Text style={[styles.stepDescription, { color: colors.text }]}>
                We&apos;ll make sure to avoid suggesting foods you can&apos;t eat (optional)
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>{t('foodAllergies')}</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
                <TextInput
                  style={[styles.input, styles.textArea, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder={t('foodAllergiesPlaceholder') as string}
                  placeholderTextColor={colors.placeholder}
                  value={data.allergies}
                  onChangeText={(value) => updateData('allergies', value)}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  testID="allergies-input"
                />
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  if (!data) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.logo, { color: colors.accent }]}>FITCO</Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>{t('personalizeExperience')}</Text>

        <View style={styles.progressContainer}>
          {Array.from({ length: (data.goal === 'lose_weight' || data.goal === 'gain_weight') ? 9 : 8 }, (_, i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                { backgroundColor: i <= currentStep ? colors.accent : 'rgba(255, 255, 255, 0.3)' }
              ]}
            />
          ))}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {renderStep()}
      </ScrollView>

      <View style={styles.footer}>
        {currentStep > 0 && (
          <TouchableOpacity style={styles.backButton} onPress={handleBack} testID="back-button">
            <Text style={[styles.backButtonText, { color: colors.accent }]}>{t('back')}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[styles.nextButton, { backgroundColor: colors.accent }]} onPress={handleNext} testID="next-button">
          <Text style={[styles.nextButtonText, { color: colors.background }]}>
            {currentStep === ((data.goal === 'lose_weight' || data.goal === 'gain_weight') ? 8 : 7) ? t('completeSetupButton') : t('nextAr')}
          </Text>
          <ChevronRight size={20} color={colors.background} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
  logo: {
    fontSize: 72, fontWeight: '900', marginBottom: 8, includeFontPadding: false, letterSpacing: -2,
    textShadowColor: 'rgba(0, 0, 0, 0.1)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4,
  },
  subtitle: { fontSize: 18, fontWeight: '400', letterSpacing: 1.5, textAlign: 'center', opacity: 0.8, marginBottom: 24 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressDot: { width: 12, height: 12, borderRadius: 6 },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 24 },
  stepContainer: { flex: 1 },
  stepHeader: { alignItems: 'center', marginBottom: 32 },
  stepTitle: { fontSize: 24, fontWeight: '600', marginTop: 16, marginBottom: 8, textAlign: 'center' },
  stepDescription: { fontSize: 16, textAlign: 'center', opacity: 0.8, lineHeight: 22 },
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  inputContainer: {
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  input: { fontSize: 16, paddingVertical: 16 },
  textArea: { minHeight: 80, paddingTop: 16 },
  inputError: { borderWidth: 1 },
  errorText: { fontSize: 14, marginTop: 8, marginLeft: 4 },
  optionsContainer: { gap: 12 },
  optionCard: {
    borderRadius: 12, padding: 16, borderWidth: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  optionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  optionDescription: { fontSize: 14, lineHeight: 20 },
  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 20, gap: 16,
  },
  backButton: { paddingVertical: 16, paddingHorizontal: 24 },
  backButtonText: { fontSize: 16, fontWeight: '600' },
  nextButton: {
    flex: 1, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 24,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4,
  },
  nextButtonText: { fontSize: 16, fontWeight: '600' },
});
