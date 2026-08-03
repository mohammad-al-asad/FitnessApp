// Handles user profile management â€” lets users view, edit, and save personal data, activity level, goals, and nutrition settings.
import AccountMenu from "@/components/AccountMenu";
import ConfirmationAlert from "@/components/ConfirmationAlert";
import WheelPicker from "@/components/WheelPicker";
import Colors from "@/constants/colors";
import {
  backendDeleteAccount,
  backendUpdateMyCompleteProfile,
} from "@/services/backend-auth";
import { useAuth } from "@/hooks/auth-context";
import { useLanguage } from "@/hooks/language-context";
import { useNutrition } from "@/hooks/nutrition-store";
import { useUserProfile } from "@/hooks/user-profile-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Save,
  Target,
  User,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type UserSettings = any;

const ACTIVITY_LEVELS = [
  {
    key: "sedentary",
    labelKey: "sedentary",
    descriptionKey: "sedentaryDesc",
  },
  {
    key: "lightly_active",
    labelKey: "lightlyActive",
    descriptionKey: "lightlyActiveDesc",
  },
  {
    key: "moderately_active",
    labelKey: "moderatelyActive",
    descriptionKey: "moderatelyActiveDesc",
  },
  {
    key: "very_active",
    labelKey: "veryActive",
    descriptionKey: "veryActiveDesc",
  },
  {
    key: "extremely_active",
    labelKey: "extremelyActive",
    descriptionKey: "extremelyActiveDesc",
  },
] as const;

const GENDERS = [
  { key: "male", labelKey: "male" },
  { key: "female", labelKey: "female" },
] as const;

const GOALS = [
  {
    key: "lose_weight",
    labelKey: "loseWeight",
    descriptionKey: "loseWeightDesc",
  },
  {
    key: "maintain_weight",
    labelKey: "maintainWeight",
    descriptionKey: "maintainWeightDesc",
  },
  {
    key: "gain_weight",
    labelKey: "gainWeight",
    descriptionKey: "gainWeightDesc",
  },
  {
    key: "build_muscle",
    labelKey: "buildMuscle",
    descriptionKey: "buildMuscleDesc",
  },
] as const;

export default function AccountScreen() {
  const { settings, saveSettings } = useNutrition();
  const {
    profile,
    updateProfile,
    isLoading: profileLoading,
  } = useUserProfile();
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const [isDeleteModal, setIsDeleteModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // ðŸ§  Force reload profile each time Account screen is focused
  useEffect(() => {
    const loadProfile = async () => {
      const userId = user?.uid;
      if (!userId) return;
      const stored = await AsyncStorage.getItem(`fitco_user_profile_${userId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log("ðŸ”„ Reloaded profile from AsyncStorage:", parsed);
        setProfileData({
          age: parsed.age ?? 0,
          height: parsed.height ?? 0,
          weight: parsed.weight ?? 0,
          gender: parsed.gender ?? "male",
          activityLevel: parsed.activityLevel ?? "moderately_active",
          goal: parsed.goal ?? "maintain_weight",
          targetWeight: parsed.targetWeight ?? 0,
          medicalConditions: parsed.medicalConditions ?? "",
          allergies: parsed.allergies ?? "",
        });
      }
    };
    const unsubscribe = navigation?.addListener?.("focus", loadProfile);
    loadProfile();
    return unsubscribe;
  }, [user]);

  const { t, isRTL } = useLanguage();

  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSavingQuickUpdate, setIsSavingQuickUpdate] = useState(false);
  const [showPicker, setShowPicker] = useState<string | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const insets = useSafeAreaInsets();

  const [profileData, setProfileData] = useState(() => ({
    age: profile?.age || 0,
    height: profile?.height || 0,
    weight: profile?.weight || 0,
    gender: profile?.gender || "male",
    activityLevel: profile?.activityLevel || "moderately_active",
    goal: profile?.goal || "maintain_weight",
    targetWeight: profile?.targetWeight || 0,
    medicalConditions: profile?.medicalConditions || "",
    allergies: profile?.allergies || "",
  }));

  const [hasProfileChanges, setHasProfileChanges] = useState(false);

  useEffect(() => {
    if (profile) {
      setProfileData({
        age: profile.age,
        height: profile.height,
        weight: profile.weight,
        gender: profile.gender,
        activityLevel: profile.activityLevel,
        goal: profile.goal,
        targetWeight: profile.targetWeight || profile.weight,
        medicalConditions: profile.medicalConditions,
        allergies: profile.allergies,
      });
    }
  }, [profile]);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem("testKey", "hello-ios");
        const value = await AsyncStorage.getItem("testKey");
        console.log("ðŸ” AsyncStorage test value on iOS:", value);
      } catch (err) {
        console.log("âŒ AsyncStorage test failed:", err);
      }
    })();
  }, []);

  if (profileLoading) {
    return null;
  }

  const updateSetting = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    setLocalSettings((prev: UserSettings) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateProfileField = (field: string, value: any) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
    setHasProfileChanges(true);
  };

  const handleSave = async () => {
    if (isSavingQuickUpdate) return;

    const nextWeight = Number(localSettings?.weight ?? 0);
    if (!Number.isFinite(nextWeight) || nextWeight <= 0) {
      Alert.alert(String(t("error")), String(t("pleaseEnterValidWeight")));
      return;
    }

    try {
      setIsSavingQuickUpdate(true);

      await backendUpdateMyCompleteProfile({
        currentWeight: nextWeight,
      });

      const mergedProfile = {
        ...profileData,
        weight: nextWeight,
      };
      setProfileData(mergedProfile);
      await updateProfile({ weight: nextWeight });

      const { weight, height, age, gender, activityLevel, goal } = mergedProfile;
      let bmr =
        gender === "male"
          ? 10 * weight + 6.25 * height - 5 * age + 5
          : 10 * weight + 6.25 * height - 5 * age - 161;

      const activityFactors: Record<string, number> = {
        sedentary: 1.2,
        lightly_active: 1.375,
        moderately_active: 1.55,
        very_active: 1.725,
        extremely_active: 1.9,
      };

      bmr *= activityFactors[activityLevel] || 1.55;

      if (goal === "lose_weight") bmr -= 400;
      else if (goal === "gain_weight" || goal === "build_muscle") bmr += 400;

      const calorieGoal = Math.round(bmr);
      const proteinGoal = Math.round(weight * 2);
      const fatsGoal = Math.round((0.25 * calorieGoal) / 9);
      const carbsGoal = Math.round(
        (calorieGoal - (proteinGoal * 4 + fatsGoal * 9)) / 4,
      );

      await saveSettings({
        ...localSettings,
        weight,
        calorieGoal,
        proteinGoal,
        fatsGoal,
        carbsGoal,
      });

      setHasChanges(false);
      Alert.alert(String(t("success")), String(t("profileUpdated")));
    } catch (error: any) {
      Alert.alert(
        String(t("error")),
        error?.message || String(t("failedToUpdateProfile")),
      );
    } finally {
      setIsSavingQuickUpdate(false);
    }
  };

  const handleProfileSave = async () => {
    try {
      // 1) Save to backend (merged complete-profile API)
      await backendUpdateMyCompleteProfile({
        age: profileData.age,
        height: profileData.height,
        currentWeight: profileData.weight,
        gender: profileData.gender,
        medicalConditions: profileData.medicalConditions || "",
        foodAllergies: profileData.allergies || "",
        activityLevel: profileData.activityLevel,
        goal: profileData.goal,
      });

      // 2) Keep local profile in sync for immediate UI updates
      await updateProfile(profileData);

      // 3) Recalculate calories from new data
      const { weight, height, age, gender, activityLevel, goal } = profileData;
      let bmr =
        gender === "male"
          ? 10 * weight + 6.25 * height - 5 * age + 5
          : 10 * weight + 6.25 * height - 5 * age - 161;

      const activityFactors: Record<string, number> = {
        sedentary: 1.2,
        lightly_active: 1.375,
        moderately_active: 1.55,
        very_active: 1.725,
        extremely_active: 1.9,
      };

      bmr *= activityFactors[activityLevel] || 1.55;

      if (goal === "lose_weight") bmr -= 400;
      else if (goal === "gain_weight" || goal === "build_muscle") bmr += 400;

      const calorieGoal = Math.round(bmr);
      const proteinGoal = Math.round(weight * 2);
      const fatsGoal = Math.round((0.25 * calorieGoal) / 9);
      const carbsGoal = Math.round(
        (calorieGoal - (proteinGoal * 4 + fatsGoal * 9)) / 4
      );

      // 4) Save locally so Nutrition Store picks it up
      await saveSettings({
        ...settings,
        weight,
        calorieGoal,
        proteinGoal,
        fatsGoal,
        carbsGoal,
      });

      // 5) Optional manual reload hook
      if (typeof settings.reload === "function") {
        settings.reload();
      }

      setHasProfileChanges(false);
      Alert.alert(String(t("success")), String(t("profileUpdated")));
    } catch (error: any) {
      console.error("Error updating profile:", error);
      Alert.alert(
        String(t("error")),
        error?.message || String(t("failedToUpdateProfile")),
      );
    }
  };

  // Generate data arrays for wheel pickers
  const ageData = Array.from({ length: 108 }, (_, i) => i + 13); // 13-120
  const heightData = Array.from({ length: 151 }, (_, i) => i + 100); // 100-250 cm
  const weightData = Array.from({ length: 271 }, (_, i) => i + 30); // 30-300 kg

  const handleDeleteAccount = async () => {
    if (isDeletingAccount) return;
    let deleted = false;
    try {
      setIsDeletingAccount(true);
      await backendDeleteAccount();
      deleted = true;
    } catch (error: any) {
      Alert.alert(
        String(t("error")),
        error?.message || String(t("failedToDeleteAccount")),
      );
    } finally {
      setIsDeletingAccount(false);
    }

    if (deleted) {
      await logout();
    }
  };

  return (
    <View style={styles.container}>
      <ConfirmationAlert
        message="confirmDeleteAccount"
        visible={isDeleteModal}
        onConfirm={() => {
          setIsDeleteModal(false);
          handleDeleteAccount();
        }}
        onCancel={() => setIsDeleteModal(false)}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          isRTL && styles.scrollContentRTL,
        ]}
      >
        {/* User Info Section */}
        {user && (
          <View style={styles.section}>
            <View style={[styles.sectionHeader, isRTL && styles.rtlRow]}>
              <User size={20} color={Colors.primary} />
              <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                {t("profileInformation")}
              </Text>
            </View>

            <View style={styles.userInfo}>
              <Text style={[styles.userInfoLabel, isRTL && styles.rtlText]}>
                {t("signedInAs")}
              </Text>
              <Text style={[styles.userInfoValue, isRTL && styles.rtlText]}>
                {user.displayName || String(t("defaultUserName"))}
              </Text>
              <Text style={[styles.userInfoEmail, isRTL && styles.rtlText]}>
                {user.email}
              </Text>
            </View>
          </View>
        )}

        {/* Edit Profile Section */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, isRTL && styles.rtlRow]}>
            <Edit3 size={20} color={Colors.primary} />
            <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
              {t("editProfile")}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setShowEditProfile(true)}
          >
            {isRTL && (
              <ChevronLeft size={20} color={Colors.placeholder} />
            )}
            <View style={[styles.menuItemLeft, isRTL && styles.menuItemLeftRTL]}>
              <User size={20} color={Colors.primary} />
              <View style={styles.menuItemText}>
                <Text style={[styles.menuItemTitle, isRTL && styles.rtlText]}>
                  {t("personalInformation")}
                </Text>
                <Text
                  style={[styles.menuItemSubtitle, isRTL && styles.rtlText]}
                >
                  {t("ageHeightWeightActivityLevelSubtitle")}
                </Text>
              </View>
            </View>
            {!isRTL && (
              <ChevronRight size={20} color={Colors.placeholder} />
            )}
          </TouchableOpacity>
        </View>

        {/* Personal Information - Quick Weight Update */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
            {t("quickUpdate")}
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
              {t("weight")}
            </Text>
            <TextInput
              style={[styles.input, isRTL && styles.rtlInput]}
              value={
                localSettings.weight === 0
                  ? ""
                  : localSettings.weight.toString()
              }
              onChangeText={(value) => {
                if (value === "") {
                  updateSetting("weight", 0);
                } else {
                  const numValue = parseFloat(value);
                  if (!isNaN(numValue)) {
                    updateSetting("weight", numValue);
                  }
                }
              }}
              keyboardType="numeric"
              placeholder={String(t("enterWeight"))}
              placeholderTextColor={Colors.placeholder}
            />
            <Text style={[styles.inputHint, isRTL && styles.rtlText]}>
              {t("enterCurrentWeight")}
            </Text>
          </View>
        </View>
        <AccountMenu setIsDeleteModal={setIsDeleteModal} />

        {/* Save Buttons */}
        {hasChanges && (
          <View style={styles.saveContainer}>
            <TouchableOpacity
              style={[styles.saveButton, isSavingQuickUpdate && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={isSavingQuickUpdate}
            >
              <Save size={20} color={Colors.background} />
              <Text style={styles.saveButtonText}>
                {isSavingQuickUpdate ? String(t("pleaseWait")) : t("saveChanges")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowEditProfile(false)}>
                <Text style={styles.modalCancel}>{t("cancel")}</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{t("editProfile")}</Text>
              <TouchableOpacity onPress={() => setShowEditProfile(false)}>
                <Text style={styles.modalDone}>{t("done")}</Text>
              </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
              style={styles.modalKeyboardContainer}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              keyboardVerticalOffset={Platform.OS === "ios" ? 120 : 100}
            >
              <ScrollView
                style={styles.modalContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}
                automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
                keyboardDismissMode="interactive"
              >
                {/* Profile Information */}
                <View style={styles.modalSection}>
                  <View style={[styles.sectionHeader, isRTL && styles.rtlRow]}>
                    <User size={20} color={Colors.primary} />
                    <Text
                      style={[styles.sectionTitle, isRTL && styles.rtlText]}
                    >
                      {t("basicInformation")}
                    </Text>
                  </View>

                  {/* Age */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
                      {t("age")}
                    </Text>
                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={() => setShowPicker("age")}
                    >
                      <Text style={styles.pickerButtonText}>
                        {profileData.age} {t("years")}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Height */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
                      {t("height")}
                    </Text>
                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={() => setShowPicker("height")}
                    >
                      <Text style={styles.pickerButtonText}>
                        {profileData.height} {t("cm")}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Weight */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
                      {t("currentWeightLabel")}
                    </Text>
                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={() => setShowPicker("weight")}
                    >
                      <Text style={styles.pickerButtonText}>
                        {profileData.weight} {t("kg")}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Gender */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
                      {t("gender")}
                    </Text>
                    <View style={styles.optionsContainer}>
                      {GENDERS.map((gender) => (
                        <TouchableOpacity
                          key={gender.key}
                          style={[
                            styles.optionCard,
                            profileData.gender === gender.key &&
                              styles.optionCardSelected,
                          ]}
                          onPress={() =>
                            updateProfileField("gender", gender.key)
                          }
                        >
                          <Text
                            style={[
                              styles.optionTitle,
                              profileData.gender === gender.key &&
                                styles.optionTitleSelected,
                            ]}
                          >
                            {t(gender.labelKey as any)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Activity & Goals */}
                <View style={styles.modalSection}>
                  <View style={[styles.sectionHeader, isRTL && styles.rtlRow]}>
                    <Activity size={20} color={Colors.primary} />
                    <Text
                      style={[styles.sectionTitle, isRTL && styles.rtlText]}
                    >
                      {t("activityAndGoals")}
                    </Text>
                  </View>

                  {/* Activity Level */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
                      {t("activityLevel")}
                    </Text>
                    <View style={styles.optionsContainer}>
                      {ACTIVITY_LEVELS.map((level) => (
                        <TouchableOpacity
                          key={level.key}
                          style={[
                            styles.optionCard,
                            profileData.activityLevel === level.key &&
                              styles.optionCardSelected,
                          ]}
                          onPress={() =>
                            updateProfileField("activityLevel", level.key)
                          }
                        >
                          <Text
                            style={[
                              styles.optionTitle,
                              profileData.activityLevel === level.key &&
                                styles.optionTitleSelected,
                            ]}
                          >
                            {t(level.labelKey as any)}
                          </Text>
                          <Text
                            style={[
                              styles.optionDescription,
                              profileData.activityLevel === level.key &&
                                styles.optionDescriptionSelected,
                            ]}
                          >
                            {t(level.descriptionKey as any)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Goal */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
                      {t("goalLabel")}
                    </Text>
                    <View style={styles.optionsContainer}>
                      {GOALS.map((goal) => (
                        <TouchableOpacity
                          key={goal.key}
                          style={[
                            styles.optionCard,
                            profileData.goal === goal.key &&
                              styles.optionCardSelected,
                          ]}
                          onPress={() => updateProfileField("goal", goal.key)}
                        >
                          <Text
                            style={[
                              styles.optionTitle,
                              profileData.goal === goal.key &&
                                styles.optionTitleSelected,
                            ]}
                          >
                            {t(goal.labelKey as any)}
                          </Text>
                          <Text
                            style={[
                              styles.optionDescription,
                              profileData.goal === goal.key &&
                                styles.optionDescriptionSelected,
                            ]}
                          >
                            {t(goal.descriptionKey as any)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Target Weight */}
                  {(profileData.goal === "lose_weight" ||
                    profileData.goal === "gain_weight") && (
                    <View style={styles.inputGroup}>
                      <Text
                        style={[styles.inputLabel, isRTL && styles.rtlText]}
                      >
                        {t("targetWeight")}
                      </Text>
                      <TouchableOpacity
                        style={styles.pickerButton}
                        onPress={() => setShowPicker("targetWeight")}
                      >
                        <Text style={styles.pickerButtonText}>
                          {profileData.targetWeight} {t("kg")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Health Information */}
                <View style={styles.modalSection}>
                  <View style={[styles.sectionHeader, isRTL && styles.rtlRow]}>
                    <Target size={20} color={Colors.primary} />
                    <Text
                      style={[styles.sectionTitle, isRTL && styles.rtlText]}
                    >
                      {t("healthInformation")}
                    </Text>
                  </View>

                  {/* Medical Conditions */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
                      {t("medicalConditions")}
                    </Text>
                    <TextInput
                      style={[styles.textArea, isRTL && styles.rtlInput]}
                      placeholder={String(t("medicalConditionsPlaceholder"))}
                      placeholderTextColor={Colors.placeholder}
                      value={profileData.medicalConditions}
                      onChangeText={(value) =>
                        updateProfileField("medicalConditions", value)
                      }
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>

                  {/* Allergies */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
                      {t("foodAllergies")}
                    </Text>
                    <TextInput
                      style={[styles.textArea, isRTL && styles.rtlInput]}
                      placeholder={String(t("foodAllergiesPlaceholder"))}
                      placeholderTextColor={Colors.placeholder}
                      value={profileData.allergies}
                      onChangeText={(value) =>
                        updateProfileField("allergies", value)
                      }
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                </View>

                {/* Save Button */}
                {hasProfileChanges && (
                  <View style={styles.modalSaveContainer}>
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={handleProfileSave}
                    >
                      <Save size={20} color={Colors.background} />
                      <Text style={styles.saveButtonText}>
                        {t("saveProfileChanges")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </View>
      )}

      {/* Wheel Picker Modal */}
      {showPicker && (
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowPicker(null)}>
                <Text style={styles.pickerCancel}>{t("cancel")}</Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>
                {showPicker === "age" && t("selectAge")}
                {showPicker === "height" && t("selectHeight")}
                {showPicker === "weight" && t("selectWeight")}
                {showPicker === "targetWeight" && t("selectTargetWeight")}
              </Text>
              <TouchableOpacity onPress={() => setShowPicker(null)}>
                <Text style={styles.pickerDone}>{t("done")}</Text>
              </TouchableOpacity>
            </View>
            <WheelPicker
              data={
                showPicker === "age"
                  ? ageData
                  : showPicker === "height"
                  ? heightData
                  : weightData
              }
              selectedValue={
                profileData[showPicker as keyof typeof profileData] as number
              }
              onValueChange={(value) => updateProfileField(showPicker, value)}
              suffix={
                showPicker === "age"
                  ? ` ${t("years")}`
                  : showPicker === "height"
                  ? ` ${t("cm")}`
                  : ` ${t("kg")}`
              }
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingTop: 15,
  },
  scrollContentRTL: {
    direction: "ltr",
  },
  section: {
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    alignSelf: "stretch",
    marginTop: 15,
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    alignSelf: "stretch",
    fontSize: 16,
    fontWeight: "500",
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
    alignSelf: "stretch",
    fontSize: 14,
    color: Colors.placeholder,
    marginTop: 4,
  },
  saveContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.background,
  },
  userInfo: {
    backgroundColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  userInfoLabel: {
    fontSize: 14,
    color: Colors.placeholder,
    marginBottom: 4,
  },
  userInfoValue: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 2,
  },
  userInfoEmail: {
    fontSize: 14,
    color: Colors.placeholder,
  },
  // RTL Styles
  rtlText: {
    textAlign: "right",
  },
  rtlRow: {
    flexDirection: "row-reverse",
  },
  rtlInput: {
    textAlign: "right",
  },
  pickerButton: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  pickerButtonText: {
    fontSize: 16,
    color: Colors.text,
  },
  textArea: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
    minHeight: 80,
    textAlignVertical: "top",
  },
  optionsContainer: {
    gap: 8,
  },
  optionCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  optionCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 2,
  },
  optionTitleSelected: {
    color: Colors.primary,
  },
  optionDescription: {
    fontSize: 14,
    color: Colors.placeholder,
    lineHeight: 18,
  },
  optionDescriptionSelected: {
    color: Colors.primary,
  },
  pickerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  pickerModal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerCancel: {
    fontSize: 16,
    color: Colors.placeholder,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
  },
  pickerDone: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primary,
  },
  // Menu Item Styles
  menuItem: {
    direction: "ltr",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  menuItemLeftRTL: {
    flexDirection: "row-reverse",
    justifyContent: "flex-end",
    direction: "ltr",
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: Colors.placeholder,
  },
  // Modal Styles
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: Platform.OS === "web" ? "center" : "flex-end",
    alignItems: Platform.OS === "web" ? "center" : "stretch",
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderRadius: Platform.OS === "web" ? 20 : 20,
    width: Platform.OS === "web" ? "90%" : "100%",
    height: Platform.OS === "web" ? "80%" : "95%",
    maxHeight: Platform.OS === "web" ? "80%" : "95%",
    overflow: "hidden",
    flex: Platform.OS !== "web" ? 1 : undefined,
    ...(Platform.OS !== "web" && {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      marginTop: 20,
    }),
  },
  modalKeyboardContainer: {
    flex: 1,
    minHeight: 0,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalCancel: {
    fontSize: 16,
    color: Colors.placeholder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
  },
  modalDone: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primary,
  },
  modalContent: {
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: Platform.OS !== "web" ? 200 : 20,
    flexGrow: 1,
    paddingHorizontal: 0,
  },
  modalSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalSaveContainer: {
    padding: 20,
  },
});

